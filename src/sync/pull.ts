import { getDb } from '../db/client';
import type { DbDriver } from '../db/driver';
import { getSetting, setSetting } from '../repositories/appSettingsRepository';
import { deleteGoalRows } from '../repositories/goalRepository';
import { ME } from '../repositories/ids';
import { deleteRecordRow } from '../repositories/recordRepository';
import type { RemovedRecord } from '../repositories/recordRepository';
import { deleteStickerRow } from '../repositories/stickerRepository';
import { notifyLocalChange } from './changes';
import { NotMember } from './contract';
import type { GoalSnapshot, SyncServer, V2GoalRow, V2MemberRow, V2Pulled, V2RecordRow, V2StickerRow } from './contract';
import type { OutboxEntity } from './outbox';
import type { PhotoToFetch } from './restore';

/**
 * 받아 오기 (api_v2.sql 머리 주석 「동기화 규칙」). 받은 행을 기기 DB에 반영하는 곳은 여기 하나다.
 * - 서버 사용자 id는 이 경계에서만 ME로 바꾼다(board_user_id, placed_by, user_id). 다른 사람 id는 그대로 둔다.
 * - outbox를 만들지 않는다. outbox에 남은 같은 행(아직 올리지 않은 내 변경)은 덮지 않는다.
 * - 커서(syncCursor)는 쪽마다 반영과 같은 트랜잭션에서 저장한다. 끊기면 다음 회차에 같은 쪽을 다시 받아 같은 결과가 된다.
 * - 함께 목표는 행을 하나씩 맞추지 않고 pull_goal로 통째로 다시 받는다. 다시 받을 목표와 지울 목표(내가 나갔거나
 *   내보내짐)는 커서와 함께 pendingGoalSync에 남겨, 회차 끝에 다시 받기를 먼저 하고 지우기를 그 뒤에 한다.
 *   각자 판에서 나가면 서버가 내 칸을 새 혼자 목표로 옮긴다(remove_member). 옮겨 간 칸이 새 목표로 먼저 넘어가야
 *   옛 목표를 지울 때 그 칸의 기록과 사진 파일이 함께 지워지지 않는다.
 */
export type PullDeps = { server: SyncServer; userId: string; pageSize?: number };

type Pending = { refetch: Set<string>; drop: Set<string> };
/** 한 트랜잭션 안의 반영 상태. removed는 지운 기기 사진 경로, downloads는 새로 받을 사진(기록 id → 서버 경로). */
type Ctx = { tx: DbDriver; userId: string; pending: Pending; removed: string[]; downloads: Map<string, string> };

/** 받은 행을 반영한다. 지운 기기 사진 경로는 호출자가 이 함수가 끝난 뒤 지운다. */
export async function pullOnce(deps: PullDeps): Promise<{ applied: number; refetched: string[]; removedPhotoUris: string[] }> {
  const db = await getDb();
  const removedPhotoUris: string[] = [];
  let applied = 0;
  for (;;) {
    const since = Number((await getSetting('syncCursor')) ?? 0);
    const page = await deps.server.pull(since, deps.pageSize ?? 500);
    const ctx = await db.transaction(async (tx) => {
      const c = await openCtx(tx, deps.userId);
      for (const p of page.rows) if (await applyRow(c, p)) applied += 1;
      await closeCtx(c);
      await setSetting('syncCursor', String(page.cursor), tx);
      return c;
    });
    removedPhotoUris.push(...ctx.removed);
    if (!page.more) break;
  }

  const pending = await readPending(db);
  const refetched: string[] = [];
  for (const goalId of pending.refetch) {
    removedPhotoUris.push(...await applySnapshot(deps, goalId));
    refetched.push(goalId);
    pending.refetch.delete(goalId);
    await writePending(db, pending);
  }
  for (const goalId of pending.drop) {
    const ctx = await db.transaction(async (tx) => {
      const c: Ctx = { tx, userId: deps.userId, pending, removed: [], downloads: new Map() };
      await removeGoal(c, goalId);
      await writePending(tx, pending);
      return c;
    });
    removedPhotoUris.push(...ctx.removed);
  }
  if (applied > 0 || refetched.length > 0 || removedPhotoUris.length > 0) notifyLocalChange();
  return { applied, refetched, removedPhotoUris };
}

/**
 * 목표 하나를 pull_goal로 통째로 다시 받는다: 목표, 멤버, 칸, 내 기록. 가입한 직후에도 부른다.
 * 멤버가 아니면(NotMember) 그 목표를 기기에서 지운다.
 */
export async function refetchGoal(deps: PullDeps, goalId: string): Promise<{ removedPhotoUris: string[] }> {
  const removedPhotoUris = await applySnapshot(deps, goalId);
  notifyLocalChange();
  return { removedPhotoUris };
}

async function applySnapshot(deps: PullDeps, goalId: string): Promise<string[]> {
  let snap: GoalSnapshot | null = null;
  try {
    snap = await deps.server.pullGoal(goalId);
  } catch (error) {
    if (!(error instanceof NotMember)) throw error;
  }
  const db = await getDb();
  const ctx = await db.transaction(async (tx) => {
    const c = await openCtx(tx, deps.userId);
    if (!snap || snap.goal.deleted_at != null) await removeGoal(c, goalId);
    else await replaceGoal(c, snap);
    await closeCtx(c);
    return c;
  });
  return ctx.removed;
}

// ───────────── 행 하나씩 ─────────────

/** 반영했으면 true. 건너뛰었으면(기기에 없는 목표의 칸, 아직 올리지 않은 내 변경 등) false. */
async function applyRow(ctx: Ctx, p: V2Pulled): Promise<boolean> {
  if (p.entity === 'goal') return applyGoal(ctx, p.row, p.deletedAt);
  if (p.entity === 'member') return 'gone' in p.row ? removeMember(ctx, p.row.goal_id, p.row.user_id) : applyMember(ctx, p.row);
  if (p.entity === 'sticker') return applySticker(ctx, p.row, p.deletedAt);
  return applyRecord(ctx, p.row, p.deletedAt);
}

async function applyGoal(ctx: Ctx, g: V2GoalRow, deletedAt: number | null): Promise<boolean> {
  if (deletedAt !== null) return removeGoal(ctx, g.id);
  // 함께 목표: 사람이나 칸이 사라질 때 서버는 지운 표시 없이 목표 행의 순번만 바꾼다. 통째로 다시 받는다.
  if (g.mode !== 'solo') {
    if (!ctx.pending.drop.has(g.id)) ctx.pending.refetch.add(g.id);
    return true;
  }
  if (await queued(ctx.tx, 'goal', g.id)) return false;
  await writeGoal(ctx, g, false);
  return true;
}

async function applyMember(ctx: Ctx, m: V2MemberRow): Promise<boolean> {
  const { tx, pending } = ctx;
  if (m.user_id !== ctx.userId) {
    if (!(await exists(tx, 'SELECT 1 AS x FROM goals WHERE id = ?', m.goal_id))) return false;
    await writeMember(ctx, m, false);
    return true;
  }
  // 내 행. 나갔거나 내보내졌다: 회차 끝에 다시 받기를 마친 뒤 지운다.
  if (m.left_at !== null) {
    pending.refetch.delete(m.goal_id);
    pending.drop.add(m.goal_id);
    return true;
  }
  pending.drop.delete(m.goal_id);
  const goal = await tx.first<{ mode: string }>('SELECT mode FROM goals WHERE id = ?', m.goal_id);
  const mine = await exists(tx, 'SELECT 1 AS x FROM goal_members WHERE goal_id = ? AND user_id = ?', m.goal_id, ME);
  // 처음 보는 함께 목표(가입): 이전 행은 커서로 받지 못하니 통째로 받는다. 혼자 목표는 앞서 온 목표 행에 이어 쓴다.
  if (!goal || (!mine && goal.mode !== 'solo')) {
    pending.refetch.add(m.goal_id);
    return true;
  }
  if (await queued(tx, 'member', m.goal_id)) return false;
  await writeMember(ctx, m, false);
  return true;
}

async function applySticker(ctx: Ctx, s: V2StickerRow, deletedAt: number | null): Promise<boolean> {
  const { tx } = ctx;
  if (await queued(tx, 'sticker', s.id)) {
    if (deletedAt === null) await followMove(tx, s);
    return false;
  }
  if (deletedAt !== null) {
    collect(ctx, await deleteStickerRow(tx, s.id));
    return true;
  }
  if (!(await exists(tx, 'SELECT 1 AS x FROM goals WHERE id = ?', s.goal_id))) return false;
  await writeSticker(ctx, s, false);
  return true;
}

async function applyRecord(ctx: Ctx, r: V2RecordRow, deletedAt: number | null): Promise<boolean> {
  if (await queued(ctx.tx, 'record', r.id)) return false;
  if (deletedAt !== null) {
    collect(ctx, await deleteRecordRow(ctx.tx, 'id', r.id));
    return true;
  }
  return writeRecord(ctx, r, false);
}

/** 다른 사람이 사라졌다(gone: 나감, 내보내짐, 차단). 그 사람 멤버 행과 그 사람 판의 칸을 지운다. */
async function removeMember(ctx: Ctx, goalId: string, userId: string): Promise<boolean> {
  const { tx } = ctx;
  await tx.run('DELETE FROM goal_members WHERE goal_id = ? AND user_id = ?', goalId, userId);
  for (const { id } of await tx.all<{ id: string }>('SELECT id FROM stickers WHERE goal_id = ? AND board_user_id = ?', goalId, userId)) {
    collect(ctx, await deleteStickerRow(tx, id));
  }
  return true;
}

/** 목표를 기기에서 지운다. 아직 올리지 않은 목표 변경이 있으면 그대로 둔다(올리면 서버에서 되살아난다). */
async function removeGoal(ctx: Ctx, goalId: string): Promise<boolean> {
  ctx.pending.refetch.delete(goalId);
  ctx.pending.drop.delete(goalId);
  const { tx } = ctx;
  if (await queued(tx, 'goal', goalId)) return false;
  const stickers = await tx.all<{ id: string }>('SELECT id FROM stickers WHERE goal_id = ?', goalId);
  const records = await deleteGoalRows(tx, goalId);
  for (const r of records) collect(ctx, r);
  // 서버에 없는 목표라 그 목표의 올리지 못한 행은 다시 보낼 곳이 없다(내보내진 뒤 붙인 칸은 not_allowed로 보류된 채 남는다)
  await forget(tx, 'member', [goalId]);
  await forget(tx, 'sticker', stickers.map((s) => s.id));
  await forget(tx, 'record', records.map((r) => r.recordId));
  return true;
}

/**
 * 받아 오기가 지운 행의 outbox 항목을 지운다. 만들지는 않는다.
 * photo 항목은 남긴다: 기록이 없으면 pushPhoto가 서버 사진만 지우므로, 서버에 남은 사진 파일을 치우는 일이 된다.
 */
async function forget(tx: DbDriver, entity: 'member' | 'sticker' | 'record', ids: string[]): Promise<void> {
  for (const id of ids) await tx.run('DELETE FROM outbox WHERE entity = ? AND row_id = ?', entity, id);
}

/**
 * 아직 올리지 않은 내 칸이 서버에서 다른 목표로 옮겨졌다(각자 판에서 나감, remove_member). 내용은 기기 것을 두고
 * 목표만 따라 옮긴다. 옛 목표를 지울 때 함께 지워지지 않게 하고, 올릴 때도 새 목표로 간다.
 */
async function followMove(tx: DbDriver, s: V2StickerRow): Promise<void> {
  await tx.run(
    'UPDATE stickers SET goal_id = ? WHERE id = ? AND goal_id != ? AND EXISTS (SELECT 1 FROM goals WHERE id = ?)',
    s.goal_id, s.id, s.goal_id, s.goal_id,
  );
}

/** pull_goal 결과로 목표를 통째로 바꾼다. 스냅숏에 없는 멤버, 칸, 내 기록은 지운다. 아직 올리지 않은 내 변경은 남긴다. */
async function replaceGoal(ctx: Ctx, snap: GoalSnapshot): Promise<void> {
  const { tx } = ctx;
  const goalId = snap.goal.id;
  if (!(await queued(tx, 'goal', goalId))) await writeGoal(ctx, snap.goal, true);

  const members = new Set(snap.members.map((m) => toLocal(ctx, m.user_id)));
  for (const { user_id } of await tx.all<{ user_id: string }>('SELECT user_id FROM goal_members WHERE goal_id = ?', goalId)) {
    if (!members.has(user_id)) await tx.run('DELETE FROM goal_members WHERE goal_id = ? AND user_id = ?', goalId, user_id);
  }
  for (const m of snap.members) {
    if (m.user_id === ctx.userId && await queued(tx, 'member', goalId)) continue;
    await writeMember(ctx, m, true);
  }

  const stickers = new Set(snap.stickers.map((s) => s.id));
  for (const { id } of await tx.all<{ id: string }>('SELECT id FROM stickers WHERE goal_id = ?', goalId)) {
    if (!stickers.has(id) && !(await queued(tx, 'sticker', id))) collect(ctx, await deleteStickerRow(tx, id));
  }
  // 다른 목표에 있던 같은 id의 칸은 이 목표로 옮겨진다(각자 판에서 나간 칸). 기록과 기기 사진은 그대로 따라온다.
  for (const s of snap.stickers) {
    if (await queued(tx, 'sticker', s.id)) await followMove(tx, s);
    else await writeSticker(ctx, s, true);
  }

  const records = new Set(snap.records.map((r) => r.id));
  const local = await tx.all<{ id: string }>(
    `SELECT r.id FROM records r JOIN stickers s ON s.id = r.sticker_id WHERE s.goal_id = ? AND s.placed_by = '${ME}'`, goalId,
  );
  for (const { id } of local) {
    if (!records.has(id) && !(await queued(tx, 'record', id))) collect(ctx, await deleteRecordRow(tx, 'id', id));
  }
  for (const r of snap.records) if (!(await queued(tx, 'record', r.id))) await writeRecord(ctx, r, true);
}

// ───────────── 쓰기 ─────────────
// force가 아니면 updated_at이 크거나 같을 때만 쓴다. pull_goal 결과(지금 상태 전체)는 force로 쓴다.

async function writeGoal(ctx: Ctx, g: V2GoalRow, force: boolean): Promise<void> {
  await ctx.tx.run(
    `INSERT INTO goals (id, mode, owner_id, name, board_type, total_slots, initial_slots, end_date, max_members, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET mode = excluded.mode, owner_id = excluded.owner_id, name = excluded.name,
       board_type = excluded.board_type, total_slots = excluded.total_slots, initial_slots = excluded.initial_slots,
       end_date = excluded.end_date, max_members = excluded.max_members, created_at = excluded.created_at, updated_at = excluded.updated_at
     WHERE ? OR excluded.updated_at >= goals.updated_at`,
    g.id, g.mode, toLocal(ctx, g.owner_id), g.name, g.board_type, g.total_slots, g.initial_slots, g.end_date, g.max_members,
    g.created_at, g.updated_at, force ? 1 : 0,
  );
}

/** 다른 사람 행에는 순서, 완성, 마지막으로 붙인 시각이 없다(빈 값으로 둔다). */
async function writeMember(ctx: Ctx, m: V2MemberRow, force: boolean): Promise<void> {
  await ctx.tx.run(
    `INSERT INTO goal_members (goal_id, user_id, role, display_name, sticker_id, sort_order, completed_at, completion_seen,
       last_placed_at, joined_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(goal_id, user_id) DO UPDATE SET role = excluded.role, display_name = excluded.display_name,
       sticker_id = excluded.sticker_id, sort_order = excluded.sort_order, completed_at = excluded.completed_at,
       completion_seen = excluded.completion_seen, last_placed_at = excluded.last_placed_at, joined_at = excluded.joined_at,
       updated_at = excluded.updated_at
     WHERE ? OR excluded.updated_at >= goal_members.updated_at`,
    m.goal_id, toLocal(ctx, m.user_id), m.role, m.display_name, m.sticker_id, m.sort_order ?? null, m.completed_at ?? null,
    m.completion_seen ?? 0, m.last_placed_at ?? null, m.joined_at, m.updated_at, force ? 1 : 0,
  );
}

/** 가려진 칸(placed_by, sticker_type이 null)도 그대로 둔다. id가 같으면 목표가 달라도 이 행으로 옮긴다. */
async function writeSticker(ctx: Ctx, s: V2StickerRow, force: boolean): Promise<void> {
  await ctx.tx.run(
    `INSERT INTO stickers (id, goal_id, placed_at, slot_index, sticker_type, updated_at, date_key, tz_offset_min, board_user_id, placed_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET goal_id = excluded.goal_id, placed_at = excluded.placed_at, slot_index = excluded.slot_index,
       sticker_type = excluded.sticker_type, updated_at = excluded.updated_at, date_key = excluded.date_key,
       tz_offset_min = excluded.tz_offset_min, board_user_id = excluded.board_user_id, placed_by = excluded.placed_by
     WHERE ? OR excluded.updated_at >= stickers.updated_at`,
    s.id, s.goal_id, s.placed_at, s.slot_index, s.sticker_type, s.updated_at, s.date_key, s.tz_offset_min,
    toLocal(ctx, s.board_user_id), toLocal(ctx, s.placed_by), force ? 1 : 0,
  );
}

/**
 * 내 기록. 기기 사진 경로(photo_uri)는 건드리지 않고, 서버 사진 경로가 새로 생기거나 바뀌면 받을 목록에 더한다.
 * 칸이 기기에 없거나 그 칸에 다른 기록이 이미 있으면(아직 올리지 않은 이 기기 기록) 건너뛴다.
 */
async function writeRecord(ctx: Ctx, r: V2RecordRow, force: boolean): Promise<boolean> {
  const { tx } = ctx;
  if (!(await exists(tx, 'SELECT 1 AS x FROM stickers WHERE id = ?', r.sticker_id))) return false;
  if (await exists(tx, 'SELECT 1 AS x FROM records WHERE sticker_id = ? AND id != ?', r.sticker_id, r.id)) return false;
  const local = await tx.first<{ updated_at: number; photo_remote_path: string | null }>(
    'SELECT updated_at, photo_remote_path FROM records WHERE id = ?', r.id,
  );
  if (local && !force && local.updated_at > r.updated_at) return false;
  await tx.run(
    `INSERT INTO records (id, sticker_id, photo_uri, memo, created_at, updated_at, photo_remote_path, visibility)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET sticker_id = excluded.sticker_id, memo = excluded.memo, created_at = excluded.created_at,
       updated_at = excluded.updated_at, photo_remote_path = excluded.photo_remote_path, visibility = excluded.visibility`,
    r.id, r.sticker_id, r.memo, r.created_at, r.updated_at, r.photo_remote_path, r.visibility,
  );
  if (r.photo_remote_path && r.photo_remote_path !== local?.photo_remote_path) ctx.downloads.set(r.id, r.photo_remote_path);
  return true;
}

// ───────────── 도움 ─────────────

const toLocal = (ctx: Ctx, id: string | null): string | null => (id !== null && id === ctx.userId ? ME : id);

const exists = async (tx: DbDriver, sql: string, ...params: string[]): Promise<boolean> => (await tx.first(sql, ...params)) !== null;

const queued = (tx: DbDriver, entity: OutboxEntity, id: string) =>
  exists(tx, 'SELECT 1 AS x FROM outbox WHERE entity = ? AND row_id = ?', entity, id);

function collect(ctx: Ctx, record: RemovedRecord | null): void {
  if (record?.photoUri) ctx.removed.push(record.photoUri);
}

async function readPending(db: DbDriver): Promise<Pending> {
  const raw = await getSetting('pendingGoalSync', db);
  const saved = raw ? (JSON.parse(raw) as { refetch: string[]; drop: string[] }) : { refetch: [], drop: [] };
  return { refetch: new Set(saved.refetch), drop: new Set(saved.drop) };
}

async function writePending(db: DbDriver, p: Pending): Promise<void> {
  const empty = p.refetch.size === 0 && p.drop.size === 0;
  await setSetting('pendingGoalSync', empty ? null : JSON.stringify({ refetch: [...p.refetch], drop: [...p.drop] }), db);
}

async function openCtx(tx: DbDriver, userId: string): Promise<Ctx> {
  return { tx, userId, pending: await readPending(tx), removed: [], downloads: new Map() };
}

/** 남은 일과 받을 사진을 같은 트랜잭션에서 저장한다. */
async function closeCtx(ctx: Ctx): Promise<void> {
  await writePending(ctx.tx, ctx.pending);
  if (ctx.downloads.size === 0) return;
  const raw = await getSetting('pendingPhotoDownloads', ctx.tx);
  const list = (raw ? (JSON.parse(raw) as PhotoToFetch[]) : []).filter((p) => !ctx.downloads.has(p.recordId));
  for (const [recordId, remotePath] of ctx.downloads) list.push({ recordId, remotePath });
  await setSetting('pendingPhotoDownloads', JSON.stringify(list), ctx.tx);
}
