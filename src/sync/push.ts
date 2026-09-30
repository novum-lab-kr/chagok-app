import { getDb } from '../db/client';
import { ack, enqueue, hold, takeBatch } from './outbox';
import type { OutboxEntry } from './outbox';
import { SyncRejected } from './contract';
import type { Change, GoalRow, PhotoStore, RecordRow, RowEntity, StickerRow, SyncServer } from './contract';

const TABLE: Record<RowEntity, string> = { goal: 'goals', sticker: 'stickers', record: 'records' };
const COLUMNS: Record<RowEntity, string> = {
  goal: 'id, name, board_type, total_slots, default_sticker_id, created_at, end_date, completed_at, completion_seen, last_placed_at, initial_slots, updated_at',
  sticker: 'id, goal_id, placed_at, slot_index, sticker_type, updated_at',
  // 기기 경로 photo_uri는 보내지 않는다
  record: 'id, sticker_id, memo, photo_remote_path, created_at, updated_at',
};

export type PushDeps = { server: SyncServer; photos: PhotoStore; deviceId: string; batchSize?: number; now?: () => number };

/** 지금 행 상태로 바꾼다. 행이 없으면 삭제다 — 쪽지에 내용을 담지 않아 쪽지와 DB가 어긋나지 않는다. */
async function toChange(e: OutboxEntry, now: number): Promise<Change> {
  const entity = e.entity as RowEntity;
  const db = await getDb();
  const row = await db.first<GoalRow | StickerRow | RecordRow>(
    `SELECT ${COLUMNS[entity]} FROM ${TABLE[entity]} WHERE id = ?`, e.rowId,
  );
  if (!row) return { entity, op: 'delete', id: e.rowId, deletedAt: now };
  return { entity, op: 'upsert', row } as Change;
}

async function setRemotePath(recordId: string, path: string | null, now: number): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.run('UPDATE records SET photo_remote_path = ?, updated_at = ? WHERE id = ?', path, now, recordId);
    await enqueue(tx, 'record', recordId, now);
  });
}

/**
 * 사진 한 건. 파일을 먼저 올리고 성공한 뒤에만 기록에 서버 경로를 남긴다 — 경로만 있고 파일이 없는 상태를 막는다.
 * 경로 기록 자체가 record 항목을 outbox에 남겨 같은 pushOnce 안에서 올라간다.
 * 기록이 없거나 사진을 뺐으면 서버 파일을 지운다. 기기 원본이 사라졌으면(사진 유실) 서버에는 사진 없음으로 둔다.
 */
async function pushPhoto(e: OutboxEntry, photos: PhotoStore, now: number): Promise<void> {
  const db = await getDb();
  const rec = await db.first<{ photo_uri: string | null; photo_remote_path: string | null }>(
    'SELECT photo_uri, photo_remote_path FROM records WHERE id = ?', e.rowId,
  );
  if (!rec || !rec.photo_uri) {
    await photos.remove(e.rowId);
    if (rec && rec.photo_remote_path) await setRemotePath(e.rowId, null, now);
    return;
  }
  const path = await photos.upload(e.rowId, rec.photo_uri);
  if (path !== rec.photo_remote_path) await setRemotePath(e.rowId, path, now);
}

/** 한 묶음을 보낸다. 거부되면 한 건씩 나눠 문제 항목만 보류한다. 네트워크 오류는 던진다. 보류한 수를 돌려준다. */
async function pushRows(entries: OutboxEntry[], deps: PushDeps, now: number): Promise<number> {
  const changes = await Promise.all(entries.map((e) => toChange(e, now)));
  try {
    await deps.server.push(deps.deviceId, changes);
    await ack(entries);
    return 0;
  } catch (error) {
    if (!(error instanceof SyncRejected)) throw error;
    if (entries.length === 1) {
      await hold(entries[0], error.message);
      return 1;
    }
    let held = 0;
    for (const e of entries) held += await pushRows([e], deps, now);
    return held;
  }
}

/**
 * outbox가 빌 때까지(보류 제외) 보낸다 (계정·백업 설계 ②·④).
 * 사진을 먼저 처리한다 — 경로를 기록하면 record 항목이 생겨 다음 반복에서 올라간다.
 */
export async function pushOnce(deps: PushDeps): Promise<{ sent: number; held: number }> {
  const size = deps.batchSize ?? 200;
  const clock = deps.now ?? Date.now;
  let sent = 0;
  let held = 0;
  for (;;) {
    const batch = await takeBatch(size);
    if (batch.length === 0) return { sent, held };
    const now = clock();
    for (const e of batch.filter((x) => x.entity === 'photo')) {
      await pushPhoto(e, deps.photos, now);
      await ack([e]);
    }
    const rows = batch.filter((x) => x.entity !== 'photo');
    if (rows.length) {
      const h = await pushRows(rows, deps, now);
      held += h;
      sent += rows.length - h;
    }
  }
}
