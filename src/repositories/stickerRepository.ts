import { getDb } from '../db/client';
import { newId } from './ids';
import { STICKER_TYPE_DEFAULT } from '../domain/types';
import type { Sticker, StickerType } from '../domain/types';
import { enqueue } from '../sync/outbox';

type StickerRow = {
  id: string;
  goal_id: string;
  placed_at: number;
  slot_index: number;
  sticker_type: string;
};

function toSticker(r: StickerRow): Sticker {
  return {
    id: r.id,
    goalId: r.goal_id,
    placedAt: r.placed_at,
    slotIndex: r.slot_index,
    stickerType: r.sticker_type,
  };
}

const COMPLETED = '완성한 판은 고칠 수 없습니다.';
const TAKEN = '이미 붙인 칸입니다.';

/** placedAt이 속한 로컬 날짜의 0시부터 다음 날 0시 전까지 */
function localDayRange(at: number): [number, number] {
  const d = new Date(at);
  return [new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime()];
}

/**
 * 붙인다. 목표의 마지막으로 붙인 시각도 함께 바꾼다 (PRD 4.1) — 더 늦은 시각일 때만.
 * complete면 같은 트랜잭션에서 완성한다. 마지막 칸 확인을 받은 뒤에만 쓴다 (PRD 4.7).
 * 완성한 판이면 거부한다. 달력판의 slotIndex는 그 달의 날짜 - 1이며, 날짜는 placedAt으로 정한다.
 * id·placedAt은 위젯 요청을 처리할 때 준다: 요청 id를 스티커 id로 써서 두 번 붙지 않게 하고, 누른 시각으로 붙인다.
 * 이미 붙인 칸이면 거부한다 — 적립판은 같은 칸 번호, 달력판은 placedAt과 같은 로컬 날짜(달력판의 칸은 날짜다).
 * 화면이 위젯 요청을 반영하기 전의 목록으로 계산해도 두 장이 붙지 않게 하는 마지막 방어다.
 */
export async function placeSticker(
  goalId: string,
  slotIndex: number,
  stickerType: StickerType = STICKER_TYPE_DEFAULT,
  options: { complete?: boolean; id?: string; placedAt?: number } = {},
): Promise<Sticker> {
  const db = await getDb();
  const now = Date.now();
  const sticker: Sticker = {
    id: options.id ?? newId(),
    goalId,
    placedAt: options.placedAt ?? now,
    slotIndex,
    stickerType,
  };
  await db.transaction(async (tx) => {
    const goal = await tx.first<{ completed_at: number | null; board_type: string }>('SELECT completed_at, board_type FROM goals WHERE id = ?', goalId);
    if (!goal) throw new Error('목표가 없습니다.');
    if (goal.completed_at !== null) throw new Error(COMPLETED);
    const taken = goal.board_type === 'tally'
      ? await tx.first('SELECT 1 AS x FROM stickers WHERE goal_id = ? AND slot_index = ?', goalId, slotIndex)
      : await tx.first('SELECT 1 AS x FROM stickers WHERE goal_id = ? AND placed_at >= ? AND placed_at < ?', goalId, ...localDayRange(sticker.placedAt));
    if (taken) throw new Error(TAKEN);
    await tx.run(
      'INSERT INTO stickers (id, goal_id, placed_at, slot_index, sticker_type, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      sticker.id, sticker.goalId, sticker.placedAt, sticker.slotIndex, sticker.stickerType, now,
    );
    await tx.run(
      'UPDATE goals SET last_placed_at = MAX(COALESCE(last_placed_at, 0), ?), updated_at = ? WHERE id = ?',
      sticker.placedAt, now, goalId,
    );
    if (options.complete) {
      await tx.run('UPDATE goals SET completed_at = ?, completion_seen = 0 WHERE id = ?', sticker.placedAt, goalId);
    }
    await enqueue(tx, 'sticker', sticker.id, now);
    await enqueue(tx, 'goal', goalId, now);
  });
  return sticker;
}

export async function listStickers(goalId: string): Promise<Sticker[]> {
  const db = await getDb();
  const rows = await db.all<StickerRow>(
    'SELECT * FROM stickers WHERE goal_id = ? ORDER BY slot_index ASC',
    goalId,
  );
  return rows.map(toSticker);
}

/** 달력판 상세는 보고 있는 달만 읽는다 (PRD 6.3). from 이상, to 미만. */
export async function listStickersInRange(goalId: string, from: number, to: number): Promise<Sticker[]> {
  const db = await getDb();
  const rows = await db.all<StickerRow>(
    'SELECT * FROM stickers WHERE goal_id = ? AND placed_at >= ? AND placed_at < ? ORDER BY placed_at ASC',
    goalId, from, to,
  );
  return rows.map(toSticker);
}

export async function getSticker(id: string): Promise<Sticker | null> {
  const db = await getDb();
  const row = await db.first<StickerRow>('SELECT * FROM stickers WHERE id = ?', id);
  return row ? toSticker(row) : null;
}

/**
 * 스티커와 그 기록을 뗀다. 트랜잭션 연결에서는 CASCADE가 꺼져 있을 수 있어 기록도 직접 지운다. 지운 기록의 사진 경로를 돌려준다. 파일은 호출자가 정리한다.
 * 완성한 판이면 거부한다 (PRD 4.7). 마지막으로 붙인 시각은 바꾸지 않는다.
 */
export async function removeSticker(id: string): Promise<string | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const row = await tx.first<{ completed_at: number | null; photo_uri: string | null; photo_remote_path: string | null; record_id: string | null }>(
      `SELECT g.completed_at, r.photo_uri, r.photo_remote_path, r.id AS record_id FROM stickers s
         JOIN goals g ON g.id = s.goal_id
         LEFT JOIN records r ON r.sticker_id = s.id
        WHERE s.id = ?`,
      id,
    );
    if (!row) return null;
    if (row.completed_at !== null) throw new Error(COMPLETED);
    await tx.run('DELETE FROM records WHERE sticker_id = ?', id);
    await tx.run('DELETE FROM stickers WHERE id = ?', id);
    // 기록은 서버가 스티커와 함께 표식한다. 사진 파일은 기록 id로 따로 지운다.
    const now = Date.now();
    await enqueue(tx, 'sticker', id, now);
    if (row.record_id && (row.photo_uri || row.photo_remote_path)) await enqueue(tx, 'photo', row.record_id, now);
    return row.photo_uri;
  });
}

/** 그 목표에 **현재 붙어 있는** 스티커 수. 뗀 스티커는 행이 지워지므로 빠진다. */
export async function countStickers(goalId: string): Promise<number> {
  const db = await getDb();
  const row = await db.first<{ n: number }>(
    'SELECT COUNT(*) AS n FROM stickers WHERE goal_id = ?',
    goalId,
  );
  return row?.n ?? 0;
}
