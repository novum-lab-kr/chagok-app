import { getDb } from '../db/client';
import { newId } from './ids';
import type { RecordNote } from '../domain/types';

type RecordRow = {
  id: string;
  sticker_id: string;
  photo_uri: string | null;
  memo: string | null;
  created_at: number;
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
  const db = await getDb();
  const existing = await getRecord(stickerId);
  if (existing) {
    await db.run(
      'UPDATE records SET photo_uri = ?, memo = ? WHERE sticker_id = ?',
      data.photoUri, data.memo, stickerId,
    );
    return { ...existing, photoUri: data.photoUri, memo: data.memo };
  }
  const record: RecordNote = {
    id: newId(),
    stickerId,
    photoUri: data.photoUri,
    memo: data.memo,
    createdAt: Date.now(),
  };
  await db.run(
    'INSERT INTO records (id, sticker_id, photo_uri, memo, created_at) VALUES (?, ?, ?, ?, ?)',
    record.id, record.stickerId, record.photoUri, record.memo, record.createdAt,
  );
  return record;
}

export async function listRecordedStickerIds(goalId: string): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.all<{ sticker_id: string }>(
    `SELECT r.sticker_id FROM records r
     JOIN stickers s ON s.id = r.sticker_id
     WHERE s.goal_id = ?`,
    goalId,
  );
  return new Set(rows.map((r) => r.sticker_id));
}

export async function deleteRecord(stickerId: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM records WHERE sticker_id = ?', stickerId);
}
