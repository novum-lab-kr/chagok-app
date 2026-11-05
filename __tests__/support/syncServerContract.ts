import { randomUUID } from 'node:crypto';
import { NotMember } from '../../src/sync/contract';
import type { GoalRow, RecordRow, StickerRow, SyncServer, V2Pulled } from '../../src/sync/contract';

// 서버 2판은 id가 uuid여야 받는다(sync_push의 (r->>'id')::uuid).
export const goal = (id: string = randomUUID(), updatedAt = 1, name = '목표'): GoalRow => ({
  id, name, board_type: 'tally', total_slots: 10, default_sticker_id: 'sprout', created_at: 1, end_date: null,
  completed_at: null, completion_seen: 0, last_placed_at: null, initial_slots: 10, updated_at: updatedAt, sort_order: null,
});
export const sticker = (id: string, goalId: string, updatedAt = 1, slot = 0): StickerRow => ({
  id, goal_id: goalId, placed_at: 1, slot_index: slot, sticker_type: 'sprout', updated_at: updatedAt,
  date_key: '2026-10-12', tz_offset_min: 540,
});
export const record = (id: string, stickerId: string, updatedAt = 1): RecordRow => ({
  id, sticker_id: stickerId, memo: '메모', photo_remote_path: null, created_at: 1, updated_at: updatedAt,
});

/** 시험 사용자 한 명. 함께 목표 RPC는 2판 시험에 필요한 것만. */
export type ContractUser = {
  server: SyncServer;
  userId: string;
  createSharedGoal(mode: 'each' | 'one'): Promise<{ goalId: string; inviteCode: string }>;
  join(inviteCode: string, displayName: string, stickerId: string): Promise<void>;
  /** 각자 판이면 내 판을 옮긴 새 혼자 목표 id */
  leave(goalId: string): Promise<string | null>;
};

async function pullAllRows(server: SyncServer, since = 0): Promise<V2Pulled[]> {
  const out: V2Pulled[] = [];
  let cursor = since;
  for (;;) {
    const page = await server.pull(cursor, 100);
    out.push(...page.rows);
    cursor = page.cursor;
    if (!page.more) return out;
  }
}

const keyOf = (p: V2Pulled) => (p.entity === 'member' ? `member:${p.row.goal_id}/${p.row.user_id}` : `${p.entity}:${p.row.id}`);

/** 행마다 마지막 상태. 키는 'entity:id', 멤버는 'member:목표/사용자'. */
async function snapshot(server: SyncServer): Promise<Map<string, { deletedAt: number | null; row: unknown }>> {
  const m = new Map<string, { deletedAt: number | null; row: unknown }>();
  for (const p of await pullAllRows(server)) m.set(keyOf(p), { deletedAt: p.deletedAt, row: p.row });
  return m;
}
function liveIds(m: Map<string, { deletedAt: number | null }>, entity: string): string[] {
  return [...m].filter(([k, v]) => k.startsWith(`${entity}:`) && v.deletedAt === null).map(([k]) => k.slice(entity.length + 1)).sort();
}

/** 가짜 서버와 실제 서버가 같은 규칙인지 (api_v2.sql sync_push, sync_pull, pull_goal과 api_v1.sql server_state, replace_all). */
export function describeSyncServerContract(label: string, newUser: () => Promise<ContractUser>, wrap: jest.Describe = describe): void {
  wrap(`SyncServer 계약: ${label}`, () => {
    it('빈 서버는 목표 0개, 마지막 수정 없음', async () => {
      expect(await (await newUser()).server.state()).toEqual({ goals: 0, lastUpdatedAt: null });
    });

    it('올린 혼자 목표를 2판 행 모양으로 돌려준다 — 내 멤버 행이 생기고 판 주인과 붙인 사람은 나', async () => {
      const { server: s, userId } = await newUser();
      const [g, st, r] = [randomUUID(), randomUUID(), randomUUID()];
      expect(await s.push('d1', [
        { entity: 'goal', op: 'upsert', row: goal(g, 5) },
        { entity: 'sticker', op: 'upsert', row: sticker(st, g, 6) },
        { entity: 'record', op: 'upsert', row: record(r, st, 7) },
      ])).toEqual({ rejected: [] });
      const m = await snapshot(s);
      expect(m.get(`goal:${g}`)).toEqual({ deletedAt: null, row: {
        id: g, client_id: null, mode: 'solo', owner_id: userId, name: '목표', board_type: 'tally', total_slots: 10,
        initial_slots: 10, end_date: null, max_members: 1, created_at: 1, updated_at: 5,
      } });
      expect(m.get(`member:${g}/${userId}`)).toEqual({ deletedAt: null, row: {
        goal_id: g, user_id: userId, role: 'owner', display_name: null, sticker_id: 'sprout', joined_at: 1, left_at: null,
        updated_at: 5, sort_order: null, completed_at: null, completion_seen: 0, last_placed_at: null, left_reason: null,
      } });
      expect(m.get(`sticker:${st}`)).toEqual({ deletedAt: null, row: {
        id: st, client_id: null, goal_id: g, board_user_id: userId, slot_index: 0, date_key: '2026-10-12', tz_offset_min: 540,
        placed_at: 1, updated_at: 6, placed_by: userId, sticker_type: 'sprout',
      } });
      expect(m.get(`record:${r}`)).toEqual({ deletedAt: null, row: { ...record(r, st, 7), client_id: null, visibility: 'self' } });
      expect(await s.state()).toEqual({ goals: 1, lastUpdatedAt: 7 });
    });

    it('더 오래된 updated_at은 덮어쓰지 않는다', async () => {
      const { server: s } = await newUser();
      const g = randomUUID();
      await s.push('d1', [{ entity: 'goal', op: 'upsert', row: goal(g, 10, '새 이름') }]);
      await s.push('d1', [{ entity: 'goal', op: 'upsert', row: goal(g, 5, '옛 이름') }]);
      expect((await snapshot(s)).get(`goal:${g}`)?.row).toMatchObject({ name: '새 이름', updated_at: 10 });
    });

    it('멤버 행은 내 순서와 완성만 바꾼다', async () => {
      const { server: s, userId } = await newUser();
      const g = randomUUID();
      await s.push('d1', [{ entity: 'goal', op: 'upsert', row: goal(g, 5) }]);
      await s.push('d1', [{ entity: 'member', op: 'upsert', row: {
        goal_id: g, sort_order: 3, completed_at: 8, completion_seen: 1, last_placed_at: 7, updated_at: 9, sticker_id: 'basic.star',
      } }]);
      expect((await snapshot(s)).get(`member:${g}/${userId}`)?.row).toMatchObject({
        sort_order: 3, completed_at: 8, completion_seen: 1, last_placed_at: 7, updated_at: 9, sticker_id: 'basic.star',
      });
    });

    it('목표를 지우면 딸린 스티커, 기록까지 지운 표시를 한다', async () => {
      const { server: s } = await newUser();
      const [g, st, r] = [randomUUID(), randomUUID(), randomUUID()];
      await s.push('d1', [
        { entity: 'goal', op: 'upsert', row: goal(g) },
        { entity: 'sticker', op: 'upsert', row: sticker(st, g) },
        { entity: 'record', op: 'upsert', row: record(r, st) },
      ]);
      await s.push('d1', [{ entity: 'goal', op: 'delete', id: g, deletedAt: 20 }]);
      const m = await snapshot(s);
      expect([liveIds(m, 'goal'), liveIds(m, 'sticker'), liveIds(m, 'record')]).toEqual([[], [], []]);
      expect(m.get(`record:${r}`)?.deletedAt).toBe(20);
      expect((await s.state()).goals).toBe(0);
    });

    it('지운 목표는 updated_at이 같은 upsert로 되살아나지 않는다', async () => {
      const { server: s } = await newUser();
      const g = randomUUID();
      await s.push('d1', [{ entity: 'goal', op: 'upsert', row: goal(g, 5) }]);
      await s.push('d2', [{ entity: 'goal', op: 'delete', id: g, deletedAt: 9 }]);
      await s.push('d1', [{ entity: 'goal', op: 'upsert', row: { ...goal(g, 5), sort_order: 3 } }]);
      expect((await snapshot(s)).get(`goal:${g}`)?.deletedAt).toBe(9);
    });

    it('나눠 받아도 모든 행을 한 번씩 받는다', async () => {
      const { server: s } = await newUser();
      const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
      await s.push('d1', ids.map((id) => ({ entity: 'goal' as const, op: 'upsert' as const, row: goal(id) })));
      await s.push('d1', [{ entity: 'goal', op: 'upsert', row: goal(ids[2], 2) }]);
      const seen: string[] = [];
      let cursor = 0;
      for (;;) {
        const page = await s.pull(cursor, 3);
        seen.push(...page.rows.flatMap((r) => (r.entity === 'goal' ? [r.row.id] : [])));
        cursor = page.cursor;
        if (!page.more) break;
      }
      expect([...new Set(seen)].sort()).toEqual([...ids].sort());
      expect((await s.pull(cursor, 3)).rows).toEqual([]);
    });

    it('replaceAll은 내 혼자 목표를 지운 표시 뒤 보낸 행만 남기고 순서도 받는다', async () => {
      const { server: s, userId } = await newUser();
      const [old, same, fresh] = [randomUUID(), randomUUID(), randomUUID()];
      await s.push('d1', [{ entity: 'goal', op: 'upsert', row: goal(old, 50) }, { entity: 'goal', op: 'upsert', row: goal(same, 50, '서버') }]);
      await s.replaceAll('d2', { goals: [{ ...goal(same, 1, '기기'), sort_order: 2 }, goal(fresh, 1)], stickers: [], records: [] });
      const m = await snapshot(s);
      expect(liveIds(m, 'goal')).toEqual([fresh, same].sort());
      expect(m.get(`goal:${same}`)?.row).toMatchObject({ name: '기기', updated_at: 1 });
      expect(m.get(`member:${same}/${userId}`)?.row).toMatchObject({ sort_order: 2 });
    });

    it('한 판에서 이미 붙은 칸은 slot_taken, 남의 칸을 지우면 not_allowed — 그 행만 빠진다', async () => {
      const a = await newUser(); const b = await newUser();
      const { goalId, inviteCode } = await a.createSharedGoal('one');
      await b.join(inviteCode, '지우', 'basic.star');
      const [mine, taken, other] = [randomUUID(), randomUUID(), randomUUID()];
      expect(await a.server.push('d', [{ entity: 'sticker', op: 'upsert', row: sticker(mine, goalId, 1, 0) }])).toEqual({ rejected: [] });
      expect(await b.server.push('d', [
        { entity: 'sticker', op: 'upsert', row: sticker(taken, goalId, 1, 0) },
        { entity: 'sticker', op: 'upsert', row: sticker(other, goalId, 1, 1) },
        { entity: 'sticker', op: 'delete', id: mine, deletedAt: 5 },
      ])).toEqual({ rejected: [
        { entity: 'sticker', id: taken, reason: 'slot_taken' },
        { entity: 'sticker', id: mine, reason: 'not_allowed' },
      ] });
      const snap = await a.server.pullGoal(goalId);
      expect(snap.stickers.map((x) => [x.id, x.board_user_id, x.placed_by])).toEqual([[mine, null, a.userId], [other, null, b.userId]]);
    });

    it('pull_goal은 멤버에게 목표, 멤버, 칸 전체를 주고 멤버가 아니면 NotMember', async () => {
      const a = await newUser(); const b = await newUser(); const c = await newUser();
      const { goalId, inviteCode } = await a.createSharedGoal('each');
      await b.join(inviteCode, '지우', 'basic.star');
      const st = randomUUID();
      await a.server.push('d', [{ entity: 'sticker', op: 'upsert', row: sticker(st, goalId) }]);
      const snap = await b.server.pullGoal(goalId);
      expect(snap.goal).toMatchObject({ id: goalId, mode: 'each', owner_id: a.userId, max_members: 6, deleted_at: null });
      expect(snap.members.map((m) => [m.user_id, m.role, m.display_name, m.sticker_id])).toEqual([
        [a.userId, 'owner', '은주', 'basic.clover'], [b.userId, 'member', '지우', 'basic.star'],
      ]);
      // 다른 사람 행에는 순서와 완성이 없다
      expect(Object.keys(snap.members[0]).sort()).toEqual(
        ['display_name', 'goal_id', 'joined_at', 'left_at', 'role', 'sticker_id', 'updated_at', 'user_id']);
      expect(snap.stickers.map((x) => [x.id, x.board_user_id, x.placed_by])).toEqual([[st, a.userId, a.userId]]);
      expect(snap.records).toEqual([]);
      await expect(c.server.pullGoal(goalId)).rejects.toBeInstanceOf(NotMember);
    });

    it('나간 사람은 다른 멤버에게 gone 모양으로 오고 목표 행도 다시 온다', async () => {
      const a = await newUser(); const b = await newUser();
      const { goalId, inviteCode } = await a.createSharedGoal('one');
      await b.join(inviteCode, '지우', 'basic.star');
      const { cursor } = await a.server.pull(0, 1000);
      await b.leave(goalId);
      const rows = await pullAllRows(a.server, cursor);
      expect(rows).toContainEqual({ entity: 'member', row: { goal_id: goalId, user_id: b.userId, gone: true }, deletedAt: null });
      expect(rows.some((r) => r.entity === 'goal' && r.row.id === goalId)).toBe(true);
    });

    it('각자 판에서 나가면 내 칸이 새 혼자 목표로 옮겨 오고 내 멤버 행에 나간 시각이 남는다', async () => {
      const a = await newUser(); const b = await newUser();
      const { goalId, inviteCode } = await a.createSharedGoal('each');
      await b.join(inviteCode, '지우', 'basic.star');
      const [st, r] = [randomUUID(), randomUUID()];
      await b.server.push('d', [
        { entity: 'sticker', op: 'upsert', row: sticker(st, goalId) },
        { entity: 'record', op: 'upsert', row: record(r, st) },
      ]);
      const solo = await b.leave(goalId);
      expect(solo).not.toBeNull();
      const m = await snapshot(b.server);
      expect(m.get(`goal:${solo}`)?.row).toMatchObject({ mode: 'solo', owner_id: b.userId, name: '같이 걷기' });
      expect(m.get(`sticker:${st}`)?.row).toMatchObject({ goal_id: solo, board_user_id: b.userId });
      expect(m.get(`member:${goalId}/${b.userId}`)?.row).toMatchObject({ left_reason: 'left', display_name: null });
      expect((m.get(`member:${goalId}/${b.userId}`)?.row as { left_at: number | null }).left_at).not.toBeNull();
      expect((await b.server.pullGoal(solo!)).records.map((x) => x.id)).toEqual([r]);
    });
  });
}
