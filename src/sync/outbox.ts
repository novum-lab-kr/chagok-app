import { getDb } from '../db/client';
import type { DbDriver } from '../db/driver';
import { notifyLocalChange } from './changes';

export type OutboxEntity = 'goal' | 'sticker' | 'record' | 'photo';

export type OutboxEntry = {
  entity: OutboxEntity;
  rowId: string;
  queuedAt: number;
  attempts: number;
  lastError: string | null;
};

type Row = { entity: OutboxEntity; row_id: string; queued_at: number; attempts: number; last_error: string | null };
const toEntry = (r: Row): OutboxEntry =>
  ({ entity: r.entity, rowId: r.row_id, queuedAt: r.queued_at, attempts: r.attempts, lastError: r.last_error });

/**
 * 올릴 대상을 남긴다. 쓰기와 같은 트랜잭션(tx)에서 부른다.
 * 이미 있으면 queued_at을 앞으로만 옮긴다 — 같은 ms에 다시 바뀌어도 ack가 새 수정을 지우지 않게 (ack 참고).
 * 보류(last_error)도 푼다. 대상이 바뀌었으니 다시 시도할 가치가 있다.
 */
export async function enqueue(tx: DbDriver, entity: OutboxEntity, rowId: string, now = Date.now()): Promise<void> {
  await tx.run(
    `INSERT INTO outbox (entity, row_id, queued_at) VALUES (?, ?, ?)
     ON CONFLICT(entity, row_id) DO UPDATE SET
       queued_at = MAX(excluded.queued_at, outbox.queued_at + 1), attempts = 0, last_error = NULL`,
    entity, rowId, now,
  );
  notifyLocalChange();
}

/** 보류하지 않은 항목을 오래된 순서로. */
export async function takeBatch(limit: number): Promise<OutboxEntry[]> {
  const db = await getDb();
  const rows = await db.all<Row>(
    'SELECT * FROM outbox WHERE last_error IS NULL ORDER BY queued_at ASC LIMIT ?', limit,
  );
  return rows.map(toEntry);
}

/** 서버가 받았다. 읽은 뒤 다시 바뀐 대상(queued_at이 다름)은 남긴다. */
export async function ack(entries: readonly OutboxEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const db = await getDb();
  await db.transaction(async (tx) => {
    for (const e of entries) {
      await tx.run('DELETE FROM outbox WHERE entity = ? AND row_id = ? AND queued_at = ?', e.entity, e.rowId, e.queuedAt);
    }
  });
}

/** 서버가 거부한 항목. 한 건 때문에 전체가 막히지 않게 따로 둔다. */
export async function hold(entry: OutboxEntry, error: string): Promise<void> {
  const db = await getDb();
  await db.run(
    'UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE entity = ? AND row_id = ? AND queued_at = ?',
    error, entry.entity, entry.rowId, entry.queuedAt,
  );
}

/** 앱 설정의 "올리지 못한 변경 n개"와 로그아웃 판단에 쓴다. */
export async function pendingCount(): Promise<{ pending: number; held: number }> {
  const db = await getDb();
  const row = await db.first<{ pending: number | null; held: number | null }>(
    `SELECT SUM(last_error IS NULL) AS pending, SUM(last_error IS NOT NULL) AS held FROM outbox`,
  );
  return { pending: row?.pending ?? 0, held: row?.held ?? 0 };
}

/** 첫 연결: 모든 행과 사진을 넣는다. 평소 전송으로 비우므로 중간에 끊겨도 이어서 올라간다. */
export async function enqueueAll(now = Date.now()): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const sets: [OutboxEntity, string][] = [
      ['goal', 'SELECT id FROM goals'],
      ['sticker', 'SELECT id FROM stickers'],
      ['record', 'SELECT id FROM records'],
      ['photo', 'SELECT id FROM records WHERE photo_uri IS NOT NULL'],
    ];
    for (const [entity, sql] of sets) {
      for (const { id } of await tx.all<{ id: string }>(sql)) await enqueue(tx, entity, id, now);
    }
  });
}

/** 로그아웃·계정 삭제 뒤. */
export async function clearOutbox(): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM outbox');
}
