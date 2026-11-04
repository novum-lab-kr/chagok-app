import { getDb } from '../db/client';
import type { DbDriver } from '../db/driver';
import { DEFAULT_STICKER_ID } from '../domain/types';
import { setSetting } from '../repositories/appSettingsRepository';
import { deleteGoalRows } from '../repositories/goalRepository';
import { ME } from '../repositories/ids';
import { notifyLocalChange } from './changes';
import { NotMember } from './contract';
import type { GoalRow, GoalSnapshot, PhotoStore, RecordRow, StickerRow, V2GoalRow, V2MemberRow, V2RecordRow, V2StickerRow } from './contract';
import { enqueue } from './outbox';
import { pullOnce, writeGoalSnapshot, type PullDeps } from './pull';

export type PhotoToFetch = { recordId: string; remotePath: string };

/** 이 기기에 올릴 내 기록(내 혼자 목표)이 있는지. 복원 충돌 카드(summarizeDevice)와 같은 기준이다. */
export async function hasLocalData(): Promise<boolean> {
  const db = await getDb();
  return (await db.first(`SELECT 1 AS x FROM goals g JOIN goal_members m ON m.goal_id = g.id AND m.user_id = '${ME}' WHERE g.mode = 'solo'`)) !== null;
}

/**
 * 지난 계정의 동기화 상태를 비운다: outbox, 함께 목표(다른 사람 멤버 행과 칸 포함), 커서, pendingGoalSync.
 * 다음 받아 오기가 지금 계정으로 0부터 받아 함께 목표를 다시 채운다. 지운 기기 사진 경로를 돌려준다(커밋 뒤 호출자가 지운다).
 */
async function resetSyncState(tx: DbDriver): Promise<string[]> {
  await tx.exec('DELETE FROM outbox;');
  const photoUris: string[] = [];
  for (const { id } of await tx.all<{ id: string }>("SELECT id FROM goals WHERE mode != 'solo'")) {
    for (const r of await deleteGoalRows(tx, id)) if (r.photoUri) photoUris.push(r.photoUri);
  }
  await setSetting('syncCursor', '0', tx);
  await setSetting('pendingGoalSync', null, tx);
  return photoUris;
}

/** 다른 계정으로 연결할 때(연결만, 첫 백업) 기기의 혼자 목표는 두고 지난 계정의 동기화 상태만 비운다. */
export async function resetForNewAccount(): Promise<{ removedPhotoUris: string[] }> {
  const db = await getDb();
  return { removedPhotoUris: await db.transaction(resetSyncState) };
}

/**
 * 서버 백업 전체. solo는 내 혼자 목표(sync_pull 행을 목표마다 모은 것), shared는 함께 목표(pull_goal).
 * 둘 다 pull_goal 모양이라 기기에 쓸 때 받아 오기와 같은 함수(writeGoalSnapshot)를 쓴다.
 */
export type ServerSnapshot = { userId: string; solo: GoalSnapshot[]; shared: GoalSnapshot[]; cursor: number };
export type RecordSummary = { goals: number; stickers: number; goalNames: string[]; updatedAt: number | null };

/**
 * 서버 백업을 모두 받는다 (계정·백업 설계 ② 복원). sync_pull을 0부터 끝까지 받고, 함께 목표는 pull_goal로 채운다.
 * 기기는 건드리지 않는다 — 복원 충돌에서 고르기 전에 보여줄 요약도 이것으로 만들고, 고른 뒤 다시 받지 않는다.
 */
export async function pullAll({ server, userId, pageSize = 500 }: PullDeps): Promise<ServerSnapshot> {
  const goals = new Map<string, V2GoalRow>();
  const mine = new Map<string, V2MemberRow>(); // 목표 id로 내 멤버 행
  const stickers = new Map<string, V2StickerRow>();
  const records = new Map<string, V2RecordRow>();
  const keep = <T>(map: Map<string, T>, id: string, row: T, deletedAt: number | null) => {
    if (deletedAt === null) map.set(id, row); else map.delete(id);
  };
  let cursor = 0;
  for (;;) {
    const page = await server.pull(cursor, pageSize);
    for (const p of page.rows) {
      if (p.entity === 'goal') keep(goals, p.row.id, p.row, p.deletedAt);
      if (p.entity === 'member' && !('gone' in p.row) && p.row.user_id === userId) keep(mine, p.row.goal_id, p.row, p.row.left_at);
      if (p.entity === 'sticker') keep(stickers, p.row.id, p.row, p.deletedAt);
      if (p.entity === 'record') keep(records, p.row.id, p.row, p.deletedAt);
    }
    cursor = page.cursor;
    if (!page.more) break;
  }
  const solo: GoalSnapshot[] = [];
  const shared: GoalSnapshot[] = [];
  for (const goal of goals.values()) {
    const me = mine.get(goal.id);
    if (!me) continue; // 내 멤버 행이 없는 목표(나감, 부모 없는 행)는 버린다
    if (goal.mode !== 'solo') {
      try {
        shared.push(await server.pullGoal(goal.id));
      } catch (error) {
        if (!(error instanceof NotMember)) throw error; // 받는 사이에 나갔다
      }
      continue;
    }
    const own = [...stickers.values()].filter((s) => s.goal_id === goal.id);
    const ids = new Set(own.map((s) => s.id));
    solo.push({ goal, members: [me], stickers: own, records: [...records.values()].filter((r) => ids.has(r.sticker_id)) });
  }
  return { userId, solo, shared, cursor };
}

/** 순서 채우기가 보는 값. 혼자 목표의 목표 행과 내 멤버 행에서 꺼낸다. */
type SortKey = { id: string; created_at: number; last_placed_at: number | null; sort_order?: number | null };

const recentAt = (goal: SortKey) => goal.last_placed_at ?? goal.created_at;

/**
 * 순서가 없는 목표(서버에 칸이 생기기 전 백업)에 순서를 채운다 (PRD 4.1, 2026-10-30).
 * 순서가 있는 목표 아래에, 마지막으로 붙인 시각(없으면 만든 시각) 최근순으로 — orderGoals가 보여 주던 순서 그대로 굳힌다.
 * 채운 목표 id도 돌려준다. 그 값을 서버에 올려야 다음 복원에서도 같은 순서가 된다.
 */
function fillSortOrder(goals: readonly SortKey[]): { goals: SortKey[]; filled: string[] } {
  const known = goals.flatMap((goal) => (goal.sort_order == null ? [] : [goal.sort_order]));
  const start = known.length ? Math.max(...known) + 1 : 0;
  const missing = goals.filter((goal) => goal.sort_order == null).sort((left, right) => {
    const recent = recentAt(right) - recentAt(left);
    if (recent !== 0) return recent;
    if (left.id === right.id) return 0;
    return left.id < right.id ? -1 : 1;
  });
  const assigned = new Map(missing.map((goal, index) => [goal.id, start + index]));
  return {
    goals: goals.map((goal) => (assigned.has(goal.id) ? { ...goal, sort_order: assigned.get(goal.id) } : goal)),
    filled: missing.map((goal) => goal.id),
  };
}

/** 혼자 목표 스냅숏의 내 멤버 행(하나뿐이다)에 채운 순서를 넣는다. */
function withSortOrder(snaps: readonly GoalSnapshot[]): { snaps: GoalSnapshot[]; filled: string[] } {
  const { goals, filled } = fillSortOrder(snaps.map(({ goal, members: [me] }) => (
    { id: goal.id, created_at: goal.created_at, last_placed_at: me.last_placed_at ?? null, sort_order: me.sort_order }
  )));
  return { snaps: snaps.map((snap, i) => ({ ...snap, members: [{ ...snap.members[0], sort_order: goals[i].sort_order }] })), filled };
}

/**
 * 받은 백업으로 기기를 한 트랜잭션에 바꾼다. 복원은 outbox를 만들지 않는다 — 순서를 새로 채운 목표만 넣는다(fillSortOrder).
 * 바꾸기 전 기기 사진 경로를 돌려준다 — 호출자가 이 함수 성공 뒤 그 파일들을 지운다.
 */
export async function applyRestore(snap: ServerSnapshot): Promise<{ photos: PhotoToFetch[]; oldPhotoUris: string[] }> {
  const db = await getDb();
  const oldPhotoUris = (await db.all<{ photo_uri: string }>('SELECT photo_uri FROM records WHERE photo_uri IS NOT NULL'))
    .map((r) => r.photo_uri);
  const { snaps: solo, filled } = withSortOrder(snap.solo);
  await db.transaction(async (tx) => {
    await tx.exec('DELETE FROM records; DELETE FROM stickers; DELETE FROM goal_members; DELETE FROM goals; DELETE FROM outbox;');
    await setSetting('pendingGoalSync', null, tx);
    for (const g of [...solo, ...snap.shared]) await writeGoalSnapshot(tx, snap.userId, g.goal.id, g);
    // 누른 날은 서버에 없다 — 받은 스티커의 붙인 날짜로 채운다. 이 기기 기록은 남긴다.
    await tx.exec(`INSERT OR IGNORE INTO placed_days (date_key) SELECT DISTINCT date_key FROM stickers;`);
    // 워치 성장 수는 복원된 스티커 수부터 다시 센다 (PRD 4.14). 같은 트랜잭션이라 사이에 예전 최고치가 끼지 않는다.
    await tx.run("DELETE FROM app_settings WHERE key = 'watchGrowth'");
    // 채운 순서를 서버에 올린다. updated_at은 그대로 둔다 — 서버는 같으면 받아들이고, 다른 기기의 더 최근 수정은 덮지 않는다.
    const now = Date.now();
    for (const id of filled) await enqueue(tx, 'goal', id, now);
    await setSetting('syncCursor', String(snap.cursor), tx);
  });
  await setSetting('lastSyncedAt', String(Date.now()));
  notifyLocalChange(); // 위젯을 맞춘다 (복원은 outbox를 거치지 않는다)

  const photos = [...snap.solo, ...snap.shared].flatMap((g) => g.records)
    .filter((r) => r.photo_remote_path)
    .map((r) => ({ recordId: r.id, remotePath: r.photo_remote_path! }));
  return { photos, oldPhotoUris };
}

/**
 * 서버 백업으로 기기를 채운다. 모두 받은 뒤 한 트랜잭션으로 바꾼다 — 받는 중 실패하면 기기는 손대지 않는다.
 * 기존 기기 사진 파일 정리는 호출자가 이 함수 성공 뒤에 한다.
 */
export async function restoreAll(deps: PullDeps): Promise<{ photos: PhotoToFetch[] }> {
  const { photos } = await applyRestore(await pullAll(deps));
  return { photos };
}

const latest = (rows: { updated_at: number }[]) =>
  rows.reduce<number | null>((m, r) => (m === null || r.updated_at > m ? r.updated_at : m), null);

/** 복원 충돌 카드: 서버 백업 쪽 (시안 3B). 내 혼자 목표만 센다. 함께 목표는 어느 쪽을 골라도 서버에서 다시 받는다. */
export function summarizeSnapshot(s: ServerSnapshot): RecordSummary {
  return {
    goals: s.solo.length, stickers: s.solo.reduce((n, g) => n + g.stickers.length, 0), goalNames: s.solo.map((g) => g.goal.name),
    updatedAt: latest(s.solo.flatMap((g) => [g.goal, ...g.members, ...g.stickers, ...g.records])),
  };
}

const SOLO = `JOIN goals g ON g.id = s.goal_id AND g.mode = 'solo'`;

/** 복원 충돌 카드: 이 기기 쪽. 서버 쪽과 같이 내 혼자 목표만 센다. */
export async function summarizeDevice(): Promise<RecordSummary> {
  const db = await getDb();
  const goals = await db.all<{ name: string; updated_at: number }>(
    `SELECT g.name, MAX(g.updated_at, m.updated_at) AS updated_at
       FROM goals g JOIN goal_members m ON m.goal_id = g.id AND m.user_id = '${ME}' WHERE g.mode = 'solo' ORDER BY g.created_at`,
  );
  const stickers = await db.all<{ updated_at: number }>(`SELECT s.updated_at FROM stickers s ${SOLO}`);
  const records = await db.all<{ updated_at: number }>(`SELECT r.updated_at FROM records r JOIN stickers s ON s.id = r.sticker_id ${SOLO}`);
  return { goals: goals.length, stickers: stickers.length, goalNames: goals.map((g) => g.name), updatedAt: latest([...goals, ...stickers, ...records]) };
}

/**
 * 복원한 기록의 사진을 받는다. 하나가 실패해도 멈추지 않고, 실패한 목록을 남겨 앱이 앞으로 올 때 다시 받는다.
 * 그동안 기록은 기존 "사진 유실" 모습으로 보인다. 기기 경로만 바꾸므로 outbox를 만들지 않는다.
 */
export async function downloadRestoredPhotos(photos: PhotoStore, list: PhotoToFetch[]): Promise<{ failed: string[] }> {
  const db = await getDb();
  const failed: PhotoToFetch[] = [];
  for (const p of list) {
    try {
      const uri = await photos.download(p.remotePath, p.recordId);
      await db.run('UPDATE records SET photo_uri = ? WHERE id = ?', uri, p.recordId);
    } catch {
      failed.push(p);
    }
  }
  await setSetting('pendingPhotoDownloads', failed.length ? JSON.stringify(failed) : null);
  return { failed: failed.map((f) => f.recordId) };
}

/**
 * 복원 충돌에서 "이 기기 기록 유지" (계정·백업 설계 ② · ④).
 * 서버 replace_all은 내 혼자 목표만 한 트랜잭션에 바꾼다. 성공한 뒤에만 기기 쪽을 정리한다:
 * 행 항목은 비우고, 서버 사진 경로를 지우고, 사진만 outbox로 다시 올린다.
 * 함께 목표는 기기 것을 지우고 커서를 0으로 되돌려 서버에서 다시 받는다. 지운 기기 사진 경로를 돌려준다(호출자가 지운다).
 */
export async function replaceServerWithDevice(deps: PullDeps, deviceId: string): Promise<{ removedPhotoUris: string[] }> {
  const db = await getDb();
  const goals = await db.all<GoalRow>(
    `SELECT g.id, g.name, g.board_type, g.total_slots, COALESCE(m.sticker_id, '${DEFAULT_STICKER_ID}') AS default_sticker_id,
            g.created_at, g.end_date, m.completed_at, m.completion_seen, m.last_placed_at, g.initial_slots, g.updated_at, m.sort_order
       FROM goals g JOIN goal_members m ON m.goal_id = g.id AND m.user_id = '${ME}' WHERE g.mode = 'solo'`,
  );
  const stickers = await db.all<StickerRow>(
    `SELECT s.id, s.goal_id, s.placed_at, s.slot_index, s.sticker_type, s.updated_at, s.date_key, s.tz_offset_min FROM stickers s ${SOLO}`,
  );
  const records = await db.all<RecordRow>(
    `SELECT r.id, r.sticker_id, r.memo, NULL AS photo_remote_path, r.created_at, r.updated_at
       FROM records r JOIN stickers s ON s.id = r.sticker_id ${SOLO}`,
  );
  await deps.server.replaceAll(deviceId, { goals, stickers, records });
  const now = Date.now();
  const removed = await db.transaction(async (tx) => {
    const photoUris = await resetSyncState(tx);
    await tx.run('UPDATE records SET photo_remote_path = NULL');
    for (const { id } of await tx.all<{ id: string }>('SELECT id FROM records WHERE photo_uri IS NOT NULL')) {
      await enqueue(tx, 'photo', id, now);
    }
    return photoUris;
  });
  const { removedPhotoUris } = await pullOnce(deps);
  return { removedPhotoUris: [...removed, ...removedPhotoUris] };
}
