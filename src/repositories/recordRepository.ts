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

/** 기록 모아보기의 한 줄. sticker는 그 칸에 붙은 스티커 종류다. */
export type TimelineEntry = {
  stickerId: string;
  goalId: string;
  goalName: string;
  /** 목표의 기본 스티커 — 기록 탭 칩 (2026-10-17) */
  goalSticker: string;
  sticker: string;
  placedAt: number;
  /** 붙인 날짜 'YYYY-MM-DD' (PRD 4.5) */
  dateKey: string;
  memo: string | null;
  photoUri: string | null;
};

/**
 * 하단 탭 「기록」(2026-10-12): 모든 목표에서 사진이나 내용 있는 메모가 있는 칸을 붙인 시각 최근 순으로.
 * 기준은 판의 기록 표식과 같다(listRecordedStickerIds). 완성한 판도 넣는다.
 */
export async function listRecordTimeline(): Promise<TimelineEntry[]> {
  const db = await getDb();
  const rows = await db.all<{ sticker_id: string; goal_id: string; name: string; default_sticker_id: string; sticker_type: string; placed_at: number; date_key: string; memo: string | null; photo_uri: string | null }>(
    `SELECT r.sticker_id, s.goal_id, g.name, g.default_sticker_id, s.sticker_type, s.placed_at, s.date_key, r.memo, r.photo_uri
     FROM records r
     JOIN stickers s ON s.id = r.sticker_id
     JOIN goals g ON g.id = s.goal_id
     WHERE NULLIF(TRIM(r.memo), '') IS NOT NULL OR NULLIF(TRIM(r.photo_uri), '') IS NOT NULL
     ORDER BY s.placed_at DESC, s.id`,
  );
  return rows.map((r) => ({
    stickerId: r.sticker_id,
    goalId: r.goal_id,
    goalName: r.name,
    goalSticker: r.default_sticker_id,
    sticker: r.sticker_type,
    placedAt: r.placed_at,
    dateKey: r.date_key,
    memo: r.memo,
    photoUri: r.photo_uri,
  }));
}

export async function deleteRecord(stickerId: string): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const row = await tx.first<{ id: string; photo_uri: string | null; photo_remote_path: string | null }>(
      'SELECT id, photo_uri, photo_remote_path FROM records WHERE sticker_id = ?', stickerId,
    );
    if (!row) return;
    await tx.run('DELETE FROM records WHERE sticker_id = ?', stickerId);
    const now = Date.now();
    await enqueue(tx, 'record', row.id, now);
    // 복원 뒤 사진을 아직 못 받은 기록은 기기 경로 없이 서버 경로만 있다. 서버 사진도 지운다.
    if (row.photo_uri || row.photo_remote_path) await enqueue(tx, 'photo', row.id, now);
  });
}
