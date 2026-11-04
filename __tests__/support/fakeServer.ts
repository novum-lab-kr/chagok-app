import { randomUUID } from 'node:crypto';
import { NotMember, SyncRejected } from '../../src/sync/contract';
import type {
  GoalRow, GoalSnapshot, PhotoStore, PushRejection, RecordRow, StickerRow, SyncServer, V2Change, V2GoalRow, V2MemberRow,
  V2Pulled, V2RecordRow, V2StickerRow,
} from '../../src/sync/contract';
import type { GoalMode, MemberRole } from '../../src/domain/types';

// 서버 표(20261105000001_core.sql)를 메모리로. 행이 생기거나 바뀔 때마다 새 seq를 받는다(private.bump_seq).
type G = {
  id: string; owner_id: string; mode: GoalMode; name: string; board_type: 'calendar' | 'tally'; total_slots: number | null;
  initial_slots: number | null; end_date: string | null; max_members: number; created_at: number; updated_at: number;
  deleted_at: number | null; seq: number;
};
type M = {
  goal_id: string; user_id: string; role: MemberRole; display_name: string | null; sticker_id: string | null;
  sort_order: number | null; completed_at: number | null; completion_seen: number; last_placed_at: number | null;
  joined_at: number | null; left_at: number | null; left_reason: 'left' | 'kicked' | null; updated_at: number; seq: number;
};
type S = {
  id: string; goal_id: string; board_user_id: string | null; placed_by: string; slot_index: number; date_key: string;
  tz_offset_min: number; sticker_type: string; placed_at: number; updated_at: number; deleted_at: number | null; seq: number;
};
type R = {
  id: string; sticker_id: string; user_id: string; memo: string | null; photo_remote_path: string | null;
  visibility: 'self' | 'members'; created_at: number; updated_at: number; deleted_at: number | null; seq: number;
};
type Tables = { goals: Map<string, G>; members: Map<string, M>; stickers: Map<string, S>; records: Map<string, R>; blocks: Set<string> };

const copy = <V extends object>(m: Map<string, V>) => new Map([...m].map(([k, v]) => [k, { ...v }]));

/** 여러 사용자가 함께 쓰는 서버 상태. */
class World {
  t: Tables = { goals: new Map(), members: new Map(), stickers: new Map(), records: new Map(), blocks: new Set() };
  invites = new Map<string, string>(); // 초대 코드 → 목표 id
  private seq = 0;
  next = () => ++this.seq;
  private last = 0;
  /** private.now_ms. 실제 호출 사이에는 늘 시간이 흐르므로 같은 시각을 두 번 주지 않는다(들어온 순서가 갈리게) */
  now = () => (this.last = Math.max(Date.now(), this.last + 1));
  /** 한 트랜잭션: 던지면 표를 되돌린다 */
  tx<T>(fn: () => T): T {
    const saved: Tables = {
      goals: copy(this.t.goals), members: copy(this.t.members), stickers: copy(this.t.stickers), records: copy(this.t.records),
      blocks: new Set(this.t.blocks),
    };
    try {
      return fn();
    } catch (error) {
      this.t = saved;
      throw error;
    }
  }
}

const mkey = (goalId: string, userId: string) => `${goalId}|${userId}`;
const rowId = (c: V2Change) => (c.op === 'delete' ? c.id : c.entity === 'member' ? c.row.goal_id : c.row.id);

const FAKE_ME = 'user-me';

/**
 * 서버 2판을 메모리로 흉내 낸다(supabase/migrations/20261105000004_api_v2.sql, 20261105000003_api_v1.sql).
 * FakeServer 하나가 한 사용자다. as(userId)로 같은 서버의 다른 사용자를 얻는다.
 * 규칙이 실제 SQL과 같은지는 syncServerContract.ts가 두 구현에 같은 시험을 돌려 붙잡는다.
 * 함께 목표 RPC(create_shared_goal, join_goal, leave_goal, kick_member, block_user)는 시험 도우미로만 둔다.
 */
export class FakeServer implements SyncServer {
  failNext = 0;               // 다음 n번 push/replaceAll은 네트워크 오류
  reject = new Set<string>(); // 이 id가 들어간 push는 묶음 전체 거부(형식 오류 흉내)
  applyThenFail = false;      // 반영한 뒤 응답을 잃는다
  pushes = 0;

  constructor(readonly userId: string = FAKE_ME, private readonly world: World = new World()) {}

  /** 같은 서버의 다른 사용자 */
  as(userId: string): FakeServer {
    return new FakeServer(userId, this.world);
  }

  private get t(): Tables { return this.world.t; }

  // ───────────── 동기화 RPC ─────────────

  /** sync_push */
  async push(_deviceId: string, changes: V2Change[]): Promise<{ rejected: PushRejection[] }> {
    this.pushes++;
    if (this.failNext > 0) { this.failNext--; throw new Error('network'); }
    for (const c of changes) if (this.reject.has(rowId(c))) throw new SyncRejected(`rejected ${rowId(c)}`);
    const rejected = this.world.tx(() => {
      const out: PushRejection[] = [];
      for (const c of changes) {
        const reason = this.applyChange(c);
        if (reason) out.push({ entity: c.entity, id: rowId(c), reason });
      }
      this.checkForeignKeys(); // set constraints all immediate
      return out;
    });
    if (this.applyThenFail) { this.applyThenFail = false; throw new Error('response lost'); }
    return { rejected };
  }

  private applyChange(c: V2Change): PushRejection['reason'] | null {
    if (c.op === 'delete') {
      if (c.entity === 'goal') return this.deleteSoloGoal(c.id, c.deletedAt);
      if (c.entity === 'sticker') return this.deleteSticker(c.id, c.deletedAt);
      return this.deleteRecord(c.id, c.deletedAt);
    }
    if (c.entity === 'goal') return this.upsertSoloGoal(c.row, false);
    if (c.entity === 'sticker') return this.upsertSticker(c.row, false);
    if (c.entity === 'record') return this.upsertRecord(c.row, false);
    // sync_push의 member: 내 행만. 없으면 23503, 나갔으면 not_allowed
    const m = this.t.members.get(mkey(c.row.goal_id, this.userId));
    if (!m) throw new SyncRejected('member not found');
    if (m.left_at !== null) return 'not_allowed';
    if (m.updated_at <= c.row.updated_at) {
      const solo = this.t.goals.get(m.goal_id)?.mode === 'solo';
      Object.assign(m, {
        sort_order: c.row.sort_order, completed_at: c.row.completed_at, completion_seen: c.row.completion_seen ?? 0,
        last_placed_at: c.row.last_placed_at, sticker_id: solo && c.row.sticker_id != null ? c.row.sticker_id : m.sticker_id,
        updated_at: c.row.updated_at, seq: this.world.next(),
      });
    }
    return null;
  }

  /** 묶음 끝 외래 키 검사(core.sql): 칸의 (목표, 붙인 사람) 멤버 행, 기록의 (칸, 주인). 없으면 23503 */
  private checkForeignKeys(): void {
    for (const s of this.t.stickers.values()) {
      if (!this.t.members.has(mkey(s.goal_id, s.placed_by))) throw new SyncRejected('sticker parent missing');
    }
    for (const r of this.t.records.values()) {
      const s = this.t.stickers.get(r.sticker_id);
      if (!s || s.placed_by !== r.user_id) throw new SyncRejected('record parent missing');
    }
  }

  /** api_v1.sql private.upsert_solo_goal. force는 replace_all */
  private upsertSoloGoal(r: GoalRow, force: boolean): 'not_allowed' | null {
    const uid = this.userId;
    const g = this.t.goals.get(r.id);
    const goalFields = {
      name: r.name, board_type: r.board_type, total_slots: r.total_slots, initial_slots: r.initial_slots, end_date: r.end_date,
      created_at: r.created_at, updated_at: r.updated_at,
    };
    const memberFields = {
      sticker_id: r.default_sticker_id, completed_at: r.completed_at, completion_seen: r.completion_seen,
      last_placed_at: r.last_placed_at, updated_at: r.updated_at,
    };
    if (!g) {
      this.t.goals.set(r.id, { id: r.id, owner_id: uid, mode: 'solo', max_members: 1, deleted_at: null, seq: this.world.next(), ...goalFields });
      this.t.members.set(mkey(r.id, uid), this.newMember(r.id, uid, 'owner', r.created_at, { ...memberFields, sort_order: r.sort_order ?? null }));
      return null;
    }
    if (g.owner_id !== uid || g.mode !== 'solo') return 'not_allowed';
    const m = this.t.members.get(mkey(r.id, uid));
    const cur = Math.max(g.updated_at, m?.updated_at ?? g.updated_at);
    // updated_at이 같으면 지운 행을 되살리지 않는다
    if (!(force || cur < r.updated_at || (cur === r.updated_at && g.deleted_at === null))) return null;
    Object.assign(g, goalFields, { deleted_at: null, seq: this.world.next() });
    // 옛 앱은 sort_order 없이 올린다. 그때는 저장된 순서를 지우지 않는다.
    const sortOrder = r.sort_order ?? m?.sort_order ?? null;
    if (m) Object.assign(m, memberFields, { sort_order: sortOrder, seq: this.world.next() });
    else this.t.members.set(mkey(r.id, uid), this.newMember(r.id, uid, 'owner', r.created_at, { ...memberFields, sort_order: sortOrder }));
    return null;
  }

  /** api_v1.sql private.upsert_sticker와 core.sql stickers_before_write 트리거 */
  private upsertSticker(r: StickerRow, force: boolean): PushRejection['reason'] | null {
    const uid = this.userId;
    const g = this.t.goals.get(r.goal_id);
    const board = g?.mode === 'one' ? null : uid;
    if (g) {
      // 트리거: 함께 목표에서 나가지 않은 멤버가 아니면 다른 검사보다 먼저 not_allowed
      const m = this.t.members.get(mkey(g.id, uid));
      if (g.mode !== 'solo') {
        if (!m || m.left_at !== null || m.role === 'viewer') return 'not_allowed';
        if (r.slot_index < 0 || (g.board_type === 'tally' && r.slot_index >= (g.total_slots ?? 0))
          || (g.board_type === 'calendar' && r.slot_index > 30)) throw new SyncRejected('invalid_input');
      } else if (m && (m.left_at !== null || m.role === 'viewer')) {
        throw new SyncRejected('not an active member');
      }
    }
    const cur = this.t.stickers.get(r.id);
    if (cur && cur.placed_by !== uid) return 'not_allowed';
    if (cur && !force && cur.updated_at > r.updated_at) return null;
    if (g && this.cellTaken(g, r, board, uid)) return 'slot_taken'; // unique_violation, 한 판 달력 day_full(23505)
    this.t.stickers.set(r.id, {
      id: r.id, goal_id: r.goal_id, board_user_id: board, placed_by: uid, slot_index: r.slot_index, date_key: r.date_key,
      tz_offset_min: r.tz_offset_min, sticker_type: r.sticker_type, placed_at: r.placed_at, updated_at: r.updated_at,
      deleted_at: null, seq: this.world.next(),
    });
    return null;
  }

  /** stickers_one_per_cell(목표, 판 주인, cell_key)과 한 판 달력의 하루 두 장 */
  private cellTaken(g: G, r: StickerRow, board: string | null, uid: string): boolean {
    const cell = (s: { slot_index: number; date_key: string; placed_by: string }) => (g.board_type === 'tally'
      ? `s${s.slot_index}` : `d${s.date_key}${g.mode === 'one' ? `/${s.placed_by}` : ''}`);
    const mine = cell({ ...r, placed_by: uid });
    const live = [...this.t.stickers.values()].filter((s) => s.goal_id === g.id && s.deleted_at === null && s.id !== r.id);
    if (live.some((s) => s.board_user_id === board && cell(s) === mine)) return true;
    return g.mode === 'one' && g.board_type === 'calendar' && live.filter((s) => s.date_key === r.date_key).length >= 2;
  }

  /** api_v1.sql private.upsert_record. visibility는 바꾸지 않는다 */
  private upsertRecord(r: RecordRow, force: boolean): 'not_allowed' | null {
    const cur = this.t.records.get(r.id);
    if (cur && cur.user_id !== this.userId) return 'not_allowed';
    if (cur && !force && cur.updated_at > r.updated_at) return null;
    this.t.records.set(r.id, {
      id: r.id, sticker_id: r.sticker_id, user_id: this.userId, memo: r.memo, photo_remote_path: r.photo_remote_path,
      visibility: cur?.visibility ?? 'self', created_at: r.created_at, updated_at: r.updated_at, deleted_at: null, seq: this.world.next(),
    });
    return null;
  }

  /** api_v1.sql private.delete_solo_goal. 이미 표시된 행은 건드리지 않는다 */
  private deleteSoloGoal(id: string, at: number): 'not_allowed' | null {
    const g = this.t.goals.get(id);
    if (!g) return null;
    if (g.owner_id !== this.userId || g.mode !== 'solo') return 'not_allowed';
    this.mark(g, at);
    for (const s of this.t.stickers.values()) {
      if (s.goal_id !== id) continue;
      for (const r of this.t.records.values()) if (r.sticker_id === s.id && r.user_id === this.userId) this.mark(r, at);
      this.mark(s, at);
    }
    return null;
  }

  /** api_v1.sql private.delete_sticker */
  private deleteSticker(id: string, at: number): 'not_allowed' | null {
    const s = this.t.stickers.get(id);
    if (s && s.placed_by !== this.userId) return 'not_allowed';
    if (s) this.mark(s, at);
    for (const r of this.t.records.values()) if (r.sticker_id === id && r.user_id === this.userId) this.mark(r, at);
    return null;
  }

  /** api_v1.sql private.delete_record */
  private deleteRecord(id: string, at: number): 'not_allowed' | null {
    const r = this.t.records.get(id);
    if (r && r.user_id !== this.userId) return 'not_allowed';
    if (r) this.mark(r, at);
    return null;
  }

  private mark(row: { deleted_at: number | null; seq: number }, at: number): void {
    if (row.deleted_at !== null) return;
    row.deleted_at = at;
    row.seq = this.world.next();
  }

  /** sync_pull */
  async pull(since: number, limit: number): Promise<{ rows: V2Pulled[]; cursor: number; more: boolean }> {
    const uid = this.userId;
    const mine = new Set([...this.t.members.values()].filter((m) => m.user_id === uid && m.left_at === null).map((m) => m.goal_id));
    const changed: { seq: number; row: V2Pulled }[] = [];
    for (const g of this.t.goals.values()) {
      if (mine.has(g.id) && g.seq > since) changed.push({ seq: g.seq, row: { entity: 'goal', row: goalJson(g), deletedAt: g.deleted_at } });
    }
    for (const m of this.t.members.values()) {
      if (m.seq <= since) continue;
      if (m.user_id === uid) changed.push({ seq: m.seq, row: { entity: 'member', row: this.memberJson(m), deletedAt: null } });
      else if (mine.has(m.goal_id)) {
        const visible = m.left_at === null && !this.blocked(uid, m.user_id);
        const row = visible ? this.memberJson(m) : { goal_id: m.goal_id, user_id: m.user_id, gone: true as const };
        changed.push({ seq: m.seq, row: { entity: 'member', row, deletedAt: null } });
      }
    }
    for (const s of this.t.stickers.values()) {
      if (mine.has(s.goal_id) && s.seq > since && this.boardVisible(s)) {
        changed.push({ seq: s.seq, row: { entity: 'sticker', row: this.stickerJson(s), deletedAt: s.deleted_at } });
      }
    }
    for (const r of this.t.records.values()) {
      if (r.user_id === uid && r.seq > since) changed.push({ seq: r.seq, row: { entity: 'record', row: recordJson(r), deletedAt: r.deleted_at } });
    }
    changed.sort((a, b) => a.seq - b.seq);
    const page = changed.slice(0, limit);
    return { rows: page.map((c) => c.row), cursor: page.length ? page[page.length - 1].seq : since, more: changed.length > limit };
  }

  /** pull_goal */
  async pullGoal(goalId: string): Promise<GoalSnapshot> {
    const uid = this.userId;
    const g = this.t.goals.get(goalId);
    const me = this.t.members.get(mkey(goalId, uid));
    if (!g || !me || me.left_at !== null) throw new NotMember('not_member');
    const members = [...this.t.members.values()]
      .filter((m) => m.goal_id === goalId && m.left_at === null && (m.user_id === uid || !this.blocked(uid, m.user_id)))
      .sort((a, b) => (a.joined_at ?? 0) - (b.joined_at ?? 0) || (a.user_id < b.user_id ? -1 : 1));
    const stickers = [...this.t.stickers.values()]
      .filter((s) => s.goal_id === goalId && s.deleted_at === null && this.boardVisible(s)).sort((a, b) => a.seq - b.seq);
    const records = [...this.t.records.values()]
      .filter((r) => r.user_id === uid && r.deleted_at === null && this.t.stickers.get(r.sticker_id)?.goal_id === goalId)
      .sort((a, b) => a.seq - b.seq);
    return {
      goal: { ...goalJson(g), deleted_at: g.deleted_at },
      members: members.map((m) => this.memberJson(m)),
      stickers: stickers.map((s) => this.stickerJson(s)),
      records: records.map(recordJson),
    };
  }

  /** server_state: 내 혼자 목표만 */
  async state(): Promise<{ goals: number; lastUpdatedAt: number | null }> {
    const goals = this.mySoloGoals().filter((g) => g.deleted_at === null);
    const ids = new Set(goals.map((g) => g.id));
    const times = goals.map((g) => Math.max(g.updated_at, this.t.members.get(mkey(g.id, this.userId))!.updated_at));
    const stickers = [...this.t.stickers.values()].filter((s) => ids.has(s.goal_id) && s.placed_by === this.userId && s.deleted_at === null);
    const stickerIds = new Set(stickers.map((s) => s.id));
    times.push(...stickers.map((s) => s.updated_at));
    times.push(...[...this.t.records.values()]
      .filter((r) => stickerIds.has(r.sticker_id) && r.user_id === this.userId && r.deleted_at === null).map((r) => r.updated_at));
    return { goals: goals.length, lastUpdatedAt: times.length ? Math.max(...times) : null };
  }

  /** replace_all: 내 혼자 목표와 거기 딸린 내 칸, 기록을 모두 지운 표시 뒤 보낸 행을 쓴다 */
  async replaceAll(_deviceId: string, rows: { goals: GoalRow[]; stickers: StickerRow[]; records: RecordRow[] }): Promise<void> {
    if (this.failNext > 0) { this.failNext--; throw new Error('network'); }
    const now = this.world.now();
    this.world.tx(() => {
      for (const g of this.mySoloGoals()) {
        this.mark(g, now);
        for (const s of this.t.stickers.values()) {
          if (s.goal_id !== g.id || s.placed_by !== this.userId) continue;
          this.mark(s, now);
          for (const r of this.t.records.values()) if (r.sticker_id === s.id && r.user_id === this.userId) this.mark(r, now);
        }
      }
      for (const r of rows.goals) this.upsertSoloGoal(r, true);
      for (const r of rows.stickers) this.upsertSticker(r, true);
      for (const r of rows.records) this.upsertRecord(r, true);
      this.checkForeignKeys();
    });
  }

  // ───────────── 함께 목표 RPC (시험 도우미) ─────────────

  /** create_shared_goal */
  createSharedGoal(opts: {
    mode: 'each' | 'one'; name?: string; boardType?: 'calendar' | 'tally'; totalSlots?: number;
    displayName?: string; stickerId?: string;
  }): { goalId: string; inviteCode: string } {
    const uid = this.userId;
    const id = randomUUID();
    const now = this.world.now();
    const boardType = opts.boardType ?? 'tally';
    const slots = boardType === 'tally' ? opts.totalSlots ?? 10 : null;
    this.t.goals.set(id, {
      id, owner_id: uid, mode: opts.mode, name: opts.name ?? '같이 걷기', board_type: boardType, total_slots: slots, initial_slots: slots,
      end_date: null, max_members: 6, created_at: now, updated_at: now, deleted_at: null, seq: this.world.next(),
    });
    this.t.members.set(mkey(id, uid), this.newMember(id, uid, 'owner', now, {
      display_name: opts.displayName ?? '은주', sticker_id: opts.stickerId ?? 'basic.clover', updated_at: now,
    }));
    const inviteCode = `CODE${this.world.invites.size}`;
    this.world.invites.set(inviteCode, id);
    return { goalId: id, inviteCode };
  }

  /** join_goal. 실패는 값으로 돌려준다(closed, full, sticker_taken) */
  join(code: string, displayName: string, stickerId: string): { goal_id: string } | { error: string } {
    const uid = this.userId;
    const g = this.t.goals.get(this.world.invites.get(code) ?? '');
    if (!g || g.deleted_at !== null || g.mode === 'solo') return { error: 'closed' };
    const m = this.t.members.get(mkey(g.id, uid));
    if (m && m.left_at === null) return { goal_id: g.id };
    if (m && m.left_reason === 'kicked') return { error: 'closed' };
    if (this.blocked(uid, g.owner_id)) return { error: 'closed' };
    const active = [...this.t.members.values()].filter((x) => x.goal_id === g.id && x.left_at === null);
    if (active.length >= g.max_members) return { error: 'full' };
    if (active.some((x) => x.sticker_id === stickerId)) return { error: 'sticker_taken' };
    const now = this.world.now();
    this.t.members.set(mkey(g.id, uid), this.newMember(g.id, uid, 'member', now, { display_name: displayName, sticker_id: stickerId, updated_at: now }));
    return { goal_id: g.id };
  }

  /** leave_goal. 각자 판이면 내 판을 옮긴 새 혼자 목표 id, 한 판이면 null */
  leave(goalId: string): string | null {
    this.sharedGoalFor(goalId);
    return this.removeMember(goalId, this.userId, 'left');
  }

  /** kick_member (만든 사람만) */
  kick(goalId: string, userId: string): void {
    const g = this.sharedGoalFor(goalId);
    if (g.owner_id !== this.userId) throw new Error('not_owner');
    const m = this.t.members.get(mkey(goalId, userId));
    if (!m || m.left_at !== null) throw new Error('not_member');
    this.removeMember(goalId, userId, 'kicked');
  }

  /** block_user: 내가 만든 함께 목표에서는 내보내고, touch_member_rows로 내 멤버 행과 그 목표 행의 순번을 바꾼다 */
  block(userId: string): void {
    const uid = this.userId;
    this.t.blocks.add(`${uid}|${userId}`);
    for (const g of [...this.t.goals.values()]) {
      const m = this.t.members.get(mkey(g.id, userId));
      if (g.owner_id === uid && g.mode !== 'solo' && g.deleted_at === null && m && m.left_at === null) this.removeMember(g.id, userId, 'kicked');
    }
    this.touchMemberRows(uid, userId);
  }

  /** unblock_user */
  unblock(userId: string): void {
    if (this.t.blocks.delete(`${this.userId}|${userId}`)) this.touchMemberRows(this.userId, userId);
  }

  // ───────────── 서버 안쪽 함수 ─────────────

  /** private.shared_goal_for */
  private sharedGoalFor(goalId: string): G {
    const g = this.t.goals.get(goalId);
    const m = this.t.members.get(mkey(goalId, this.userId));
    if (!g || g.deleted_at !== null || !m || m.left_at !== null) throw new Error('not_member');
    if (g.mode === 'solo') throw new Error('not_shared');
    return g;
  }

  /** private.remove_member: 각자 판이면 새 혼자 목표로 칸을 옮기고, 한 판이면 그 사람이 붙인 칸을 지운다(행 삭제) */
  private removeMember(goalId: string, userId: string, reason: 'left' | 'kicked'): string | null {
    const g = this.t.goals.get(goalId)!;
    const m = this.t.members.get(mkey(goalId, userId));
    if (!m || m.left_at !== null) return null;
    const now = this.world.now();
    let solo: string | null = null;
    if (g.mode === 'each') {
      solo = randomUUID();
      this.t.goals.set(solo, {
        id: solo, owner_id: userId, mode: 'solo', name: g.name, board_type: g.board_type, total_slots: g.total_slots,
        initial_slots: g.initial_slots, end_date: g.end_date, max_members: 1, created_at: m.joined_at ?? now, updated_at: now,
        deleted_at: null, seq: this.world.next(),
      });
      this.t.members.set(mkey(solo, userId), this.newMember(solo, userId, 'owner', m.joined_at ?? now, {
        sticker_id: m.sticker_id, sort_order: m.sort_order, completed_at: m.completed_at, completion_seen: m.completion_seen,
        last_placed_at: m.last_placed_at, updated_at: now,
      }));
      for (const s of this.t.stickers.values()) {
        if (s.goal_id === goalId && s.board_user_id === userId) Object.assign(s, { goal_id: solo, seq: this.world.next() });
      }
    } else if (g.mode === 'one') {
      for (const s of [...this.t.stickers.values()]) if (s.goal_id === goalId && s.placed_by === userId) this.hardDeleteSticker(s.id);
    }
    Object.assign(m, {
      left_at: now, left_reason: reason, updated_at: now, role: m.role === 'owner' ? 'member' : m.role,
      display_name: null, sticker_id: null, sort_order: null, completed_at: null, completion_seen: 0, last_placed_at: null,
      joined_at: null, seq: this.world.next(),
    });
    if (g.owner_id === userId) this.handOff(goalId, userId);
    const still = this.t.goals.get(goalId);
    if (still) still.seq = this.world.next(); // 순번만 바꾼다(지워졌으면 아무것도 안 함)
    return solo;
  }

  /** private.hand_off: 가장 먼저 들어온 남은 멤버가 이어받고, 없으면 목표를 지운다(행 삭제, 멤버와 칸과 기록이 함께) */
  private handOff(goalId: string, leaving: string): void {
    const g = this.t.goals.get(goalId)!;
    const next = [...this.t.members.values()]
      .filter((m) => m.goal_id === goalId && m.user_id !== leaving && m.left_at === null && m.role !== 'viewer')
      .sort((a, b) => (a.joined_at ?? 0) - (b.joined_at ?? 0) || (a.user_id < b.user_id ? -1 : 1))[0];
    if (!next) {
      for (const s of [...this.t.stickers.values()]) if (s.goal_id === goalId) this.hardDeleteSticker(s.id);
      for (const [k, m] of [...this.t.members]) if (m.goal_id === goalId) this.t.members.delete(k);
      this.t.goals.delete(goalId);
      return;
    }
    const now = this.world.now();
    Object.assign(next, { role: 'owner', updated_at: now, seq: this.world.next() });
    Object.assign(g, { owner_id: next.user_id, updated_at: now, seq: this.world.next() });
  }

  /** private.touch_member_rows: 상대와 함께 있는 목표에서 내 멤버 행과 그 목표 행의 순번만 바꾼다 */
  private touchMemberRows(user: string, other: string): void {
    const shared = [...this.t.members.values()]
      .filter((m) => m.user_id === user && m.left_at === null && this.t.members.get(mkey(m.goal_id, other))?.left_at === null);
    for (const m of shared) {
      m.seq = this.world.next();
      const g = this.t.goals.get(m.goal_id);
      if (g && g.mode !== 'solo') g.seq = this.world.next();
    }
  }

  private hardDeleteSticker(id: string): void {
    this.t.stickers.delete(id);
    for (const [k, r] of [...this.t.records]) if (r.sticker_id === id) this.t.records.delete(k);
  }

  private newMember(goalId: string, userId: string, role: MemberRole, joinedAt: number, over: Partial<M>): M {
    return {
      goal_id: goalId, user_id: userId, role, display_name: null, sticker_id: null, sort_order: null, completed_at: null,
      completion_seen: 0, last_placed_at: null, joined_at: joinedAt, left_at: null, left_reason: null, updated_at: joinedAt,
      seq: this.world.next(), ...over,
    };
  }

  private mySoloGoals(): G[] {
    return [...this.t.goals.values()].filter((g) => g.owner_id === this.userId && g.mode === 'solo'
      && this.t.members.has(mkey(g.id, this.userId)));
  }

  /** private.blocked_between: 어느 쪽이 차단했든 */
  private blocked(a: string, b: string): boolean {
    return this.t.blocks.has(`${a}|${b}`) || this.t.blocks.has(`${b}|${a}`);
  }

  /** 한 판 칸과 내 판은 늘 보이고, 차단 관계인 사람의 판은 보이지 않는다 */
  private boardVisible(s: S): boolean {
    return s.board_user_id === null || s.board_user_id === this.userId || !this.blocked(this.userId, s.board_user_id);
  }

  /** private.member_json: 순서, 완성, 나간 이유는 내 행에만 */
  private memberJson(m: M): V2MemberRow {
    const base: V2MemberRow = {
      goal_id: m.goal_id, user_id: m.user_id, role: m.role, display_name: m.display_name, sticker_id: m.sticker_id,
      joined_at: m.joined_at, left_at: m.left_at, updated_at: m.updated_at,
    };
    if (m.user_id !== this.userId) return base;
    return {
      ...base, sort_order: m.sort_order, completed_at: m.completed_at, completion_seen: m.completion_seen,
      last_placed_at: m.last_placed_at, left_reason: m.left_reason,
    };
  }

  /** private.sticker_json: 차단 관계인 사람이 붙인 칸은 붙인 사람과 스티커를 비운다 */
  private stickerJson(s: S): V2StickerRow {
    const hidden = s.placed_by !== this.userId && this.blocked(this.userId, s.placed_by);
    return {
      id: s.id, client_id: null, goal_id: s.goal_id, board_user_id: s.board_user_id, slot_index: s.slot_index, date_key: s.date_key,
      tz_offset_min: s.tz_offset_min, placed_at: s.placed_at, updated_at: s.updated_at,
      placed_by: hidden ? null : s.placed_by, sticker_type: hidden ? null : s.sticker_type,
    };
  }

  // ───────────── 시험에서 들여다보기 ─────────────

  /** 지우지 않은 행 id(모든 사용자) */
  live(entity: 'goal' | 'sticker' | 'record'): string[] {
    const table = entity === 'goal' ? this.t.goals : entity === 'sticker' ? this.t.stickers : this.t.records;
    return [...table.values()].filter((r) => r.deleted_at === null).map((r) => r.id).sort();
  }

  recordRow(id: string): R | undefined { return this.t.records.get(id); }
  goalRow(id: string): G | undefined { return this.t.goals.get(id); }
}

function goalJson(g: G): V2GoalRow {
  return {
    id: g.id, client_id: null, mode: g.mode, owner_id: g.owner_id, name: g.name, board_type: g.board_type, total_slots: g.total_slots,
    initial_slots: g.initial_slots, end_date: g.end_date, max_members: g.max_members, created_at: g.created_at, updated_at: g.updated_at,
  };
}

function recordJson(r: R): V2RecordRow {
  return {
    id: r.id, client_id: null, sticker_id: r.sticker_id, memo: r.memo, photo_remote_path: r.photo_remote_path,
    visibility: r.visibility, created_at: r.created_at, updated_at: r.updated_at,
  };
}

export class FakePhotos implements PhotoStore {
  remote = new Map<string, string>();
  missingLocal = new Set<string>();
  failDownload = new Set<string>();
  failUpload: Error | null = null;
  async upload(recordId: string, storedUri: string) {
    if (this.failUpload) throw this.failUpload;
    if (this.missingLocal.has(storedUri)) return null;
    const path = `u/${recordId}.jpg`;
    this.remote.set(path, storedUri);
    return path;
  }
  async remove(recordId: string) { this.remote.delete(`u/${recordId}.jpg`); }
  async download(_remotePath: string, recordId: string) {
    if (this.failDownload.has(recordId)) throw new Error('download failed');
    return `record-photo:${recordId}-restored.jpg`;
  }
}
