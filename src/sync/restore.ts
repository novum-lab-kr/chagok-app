import { getDb } from '../db/client';
import { setSetting } from '../repositories/appSettingsRepository';
import { notifyLocalChange } from './changes';
import { enqueue } from './outbox';
import type { GoalRow, PhotoStore, RecordRow, StickerRow, SyncServer } from './contract';

type PhotoToFetch = { recordId: string; remotePath: string };

export async function hasLocalData(): Promise<boolean> {
  const db = await getDb();
  return ((await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM goals'))?.n ?? 0) > 0;
}

export type ServerSnapshot = { goals: GoalRow[]; stickers: StickerRow[]; records: RecordRow[]; cursor: number };
export type RecordSummary = { goals: number; stickers: number; goalNames: string[]; updatedAt: number | null };

/**
 * 서버 백업을 모두 받는다 (계정·백업 설계 ② 복원). 기기는 건드리지 않는다 —
 * 복원 충돌에서 고르기 전에 보여줄 요약도 이것으로 만들고, 고른 뒤 다시 받지 않는다.
 */
export async function pullAll(server: SyncServer, pageSize = 500): Promise<ServerSnapshot> {
  const goals = new Map<string, GoalRow>();
  const stickers = new Map<string, StickerRow>();
  const records = new Map<string, RecordRow>();
  let cursor = 0;
  for (;;) {
    const page = await server.pull(cursor, pageSize);
    for (const p of page.rows) {
      if (p.entity === 'goal') { if (p.deletedAt === null) goals.set(p.row.id, p.row); else goals.delete(p.row.id); }
      if (p.entity === 'sticker') { if (p.deletedAt === null) stickers.set(p.row.id, p.row); else stickers.delete(p.row.id); }
      if (p.entity === 'record') { if (p.deletedAt === null) records.set(p.row.id, p.row); else records.delete(p.row.id); }
    }
    cursor = page.cursor;
    if (!page.more) break;
  }
  // 부모가 없는 행은 버린다 (표식이 부모에만 있을 때를 대비)
  for (const [id, s] of stickers) if (!goals.has(s.goal_id)) stickers.delete(id);
  for (const [id, r] of records) if (!stickers.has(r.sticker_id)) records.delete(id);
  return { goals: [...goals.values()], stickers: [...stickers.values()], records: [...records.values()], cursor };
}

/**
 * 받은 백업으로 기기를 한 트랜잭션에 바꾼다. 복원은 outbox를 만들지 않는다.
 * 바꾸기 전 기기 사진 경로를 돌려준다 — 호출자가 이 함수 성공 뒤 그 파일들을 지운다.
 */
export async function applyRestore(snap: ServerSnapshot): Promise<{ photos: PhotoToFetch[]; oldPhotoUris: string[] }> {
  const db = await getDb();
  const oldPhotoUris = (await db.all<{ photo_uri: string }>('SELECT photo_uri FROM records WHERE photo_uri IS NOT NULL'))
    .map((r) => r.photo_uri);
  await db.transaction(async (tx) => {
    await tx.exec('DELETE FROM records; DELETE FROM stickers; DELETE FROM goals; DELETE FROM outbox;');
    for (const g of snap.goals) {
      await tx.run(
        `INSERT INTO goals (id, name, board_type, total_slots, default_sticker_id, created_at, end_date, completed_at,
           completion_seen, last_placed_at, initial_slots, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        g.id, g.name, g.board_type, g.total_slots, g.default_sticker_id, g.created_at, g.end_date, g.completed_at,
        g.completion_seen, g.last_placed_at, g.initial_slots, g.updated_at,
      );
    }
    for (const s of snap.stickers) {
      await tx.run(
        'INSERT INTO stickers (id, goal_id, placed_at, slot_index, sticker_type, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        s.id, s.goal_id, s.placed_at, s.slot_index, s.sticker_type, s.updated_at,
      );
    }
    for (const r of snap.records) {
      await tx.run(
        'INSERT INTO records (id, sticker_id, photo_uri, memo, created_at, updated_at, photo_remote_path) VALUES (?, ?, NULL, ?, ?, ?, ?)',
        r.id, r.sticker_id, r.memo, r.created_at, r.updated_at, r.photo_remote_path,
      );
    }
  });
  await setSetting('syncCursor', String(snap.cursor));
  await setSetting('lastSyncedAt', String(Date.now()));
  notifyLocalChange(); // 위젯을 맞춘다 (복원은 outbox를 거치지 않는다)

  const photos = snap.records
    .filter((r) => r.photo_remote_path)
    .map((r) => ({ recordId: r.id, remotePath: r.photo_remote_path! }));
  return { photos, oldPhotoUris };
}

/**
 * 서버 백업으로 기기를 채운다. 모두 받은 뒤 한 트랜잭션으로 바꾼다 — 받는 중 실패하면 기기는 손대지 않는다.
 * 기존 기기 사진 파일 정리는 호출자가 이 함수 성공 뒤에 한다.
 */
export async function restoreAll(server: SyncServer, pageSize = 500): Promise<{ photos: PhotoToFetch[] }> {
  const { photos } = await applyRestore(await pullAll(server, pageSize));
  return { photos };
}

const latest = (rows: { updated_at: number }[]) =>
  rows.reduce<number | null>((m, r) => (m === null || r.updated_at > m ? r.updated_at : m), null);

/** 복원 충돌 카드: 서버 백업 쪽 (시안 3B). */
export function summarizeSnapshot(s: ServerSnapshot): RecordSummary {
  return {
    goals: s.goals.length, stickers: s.stickers.length, goalNames: s.goals.map((g) => g.name),
    updatedAt: latest([...s.goals, ...s.stickers, ...s.records]),
  };
}

/** 복원 충돌 카드: 이 기기 쪽. */
export async function summarizeDevice(): Promise<RecordSummary> {
  const db = await getDb();
  const goals = await db.all<{ name: string; updated_at: number }>('SELECT name, updated_at FROM goals ORDER BY created_at');
  const stickers = await db.all<{ updated_at: number }>('SELECT updated_at FROM stickers');
  const records = await db.all<{ updated_at: number }>('SELECT updated_at FROM records');
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
 * 서버 replace_all이 한 트랜잭션이라 반쪽 상태가 없다. 성공한 뒤에만 기기 쪽을 정리한다:
 * 행 항목은 비우고, 서버 사진 경로를 지우고, 사진만 outbox로 다시 올린다.
 */
export async function replaceServerWithDevice(server: SyncServer, deviceId: string): Promise<void> {
  const db = await getDb();
  const goals = await db.all<GoalRow>(
    `SELECT id, name, board_type, total_slots, default_sticker_id, created_at, end_date, completed_at, completion_seen,
            last_placed_at, initial_slots, updated_at FROM goals`,
  );
  const stickers = await db.all<StickerRow>('SELECT id, goal_id, placed_at, slot_index, sticker_type, updated_at FROM stickers');
  const records = await db.all<RecordRow>(
    'SELECT id, sticker_id, memo, NULL AS photo_remote_path, created_at, updated_at FROM records',
  );
  await server.replaceAll(deviceId, { goals, stickers, records });
  const now = Date.now();
  await db.transaction(async (tx) => {
    await tx.exec('DELETE FROM outbox;');
    await tx.run('UPDATE records SET photo_remote_path = NULL');
    for (const { id } of await tx.all<{ id: string }>('SELECT id FROM records WHERE photo_uri IS NOT NULL')) {
      await enqueue(tx, 'photo', id, now);
    }
  });
}
