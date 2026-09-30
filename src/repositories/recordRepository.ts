import { getDb } from '../db/client';
import { newId } from './ids';
import type { RecordNote } from '../domain/types';
import { enqueue } from '../sync/outbox';

type RecordRow = {
  id: string;
  sticker_id: string;
  photo_uri: string | null;
  memo: string | null;
  created_at: number;
  updated_at: number;
  photo_remote_path: string | null;
};

function toRecord(r: RecordRow): RecordNote {
  return {
    id: r.id,
    stickerId: r.sticker_id,
    photoUri: r.photo_uri,
    memo: r.memo,
    createdAt: r.created_at,
  };
}

export async function getRecord(stickerId: string): Promise<RecordNote | null> {
  const db = await getDb();
  const row = await db.first<RecordRow>(
    'SELECT * FROM records WHERE sticker_id = ?', stickerId,
  );
  return row ? toRecord(row) : null;
}

export async function upsertRecord(
  stickerId: string,
  data: { photoUri: string | null; memo: string | null },
): Promise<RecordNote> {
  // 기록과 outbox를 한 트랜잭션으로 — 따로 실패하면 백업이 빠진다.
  const db = await getDb();
  const now = Date.now();
  return db.transaction(async (tx) => {
    const goal = await tx.first<{ completed_at: number | null }>(
      'SELECT g.completed_at FROM stickers s JOIN goals g ON g.id = s.goal_id WHERE s.id = ?', stickerId,
    );
    if (goal && goal.completed_at !== null) throw new Error('완성한 판은 고칠 수 없습니다.');
    const row = await tx.first<RecordRow>('SELECT * FROM records WHERE sticker_id = ?', stickerId);
    if (row) {
      await tx.run(
        'UPDATE records SET photo_uri = ?, memo = ?, updated_at = ? WHERE sticker_id = ?',
        data.photoUri, data.memo, now, stickerId,
      );
      await enqueue(tx, 'record', row.id, now);
      if (row.photo_uri !== data.photoUri) await enqueue(tx, 'photo', row.id, now);
      return { ...toRecord(row), photoUri: data.photoUri, memo: data.memo };
    }
    const record: RecordNote = { id: newId(), stickerId, photoUri: data.photoUri, memo: data.memo, createdAt: now };
    await tx.run(
      'INSERT INTO records (id, sticker_id, photo_uri, memo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      record.id, record.stickerId, record.photoUri, record.memo, record.createdAt, now,
    );
    await enqueue(tx, 'record', record.id, now);
    if (record.photoUri) await enqueue(tx, 'photo', record.id, now);
    return record;
  });
}

export async function listRecordedStickerIds(goalId: string): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.all<{ sticker_id: string }>(
    `SELECT r.sticker_id FROM records r
     JOIN stickers s ON s.id = r.sticker_id
     WHERE s.goal_id = ?
       AND (NULLIF(TRIM(r.memo), '') IS NOT NULL OR NULLIF(TRIM(r.photo_uri), '') IS NOT NULL)`,
    goalId,
  );
  return new Set(rows.map((r) => r.sticker_id));
}

export async function deleteRecord(stickerId: string): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const row = await tx.first<{ id: string; photo_uri: string | null }>(
      'SELECT id, photo_uri FROM records WHERE sticker_id = ?', stickerId,
    );
    if (!row) return;
    await tx.run('DELETE FROM records WHERE sticker_id = ?', stickerId);
    const now = Date.now();
    await enqueue(tx, 'record', row.id, now);
    if (row.photo_uri) await enqueue(tx, 'photo', row.id, now);
  });
}
