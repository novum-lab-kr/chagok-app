import { getDb } from '../db/client';
import { newId } from './ids';
import { STICKER_TYPE_DEFAULT } from '../domain/types';
import type { Sticker, StickerType } from '../domain/types';

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

export async function placeSticker(
  goalId: string,
  slotIndex: number,
  stickerType: StickerType = STICKER_TYPE_DEFAULT,
): Promise<Sticker> {
  const db = await getDb();
  const sticker: Sticker = {
    id: newId(),
    goalId,
    placedAt: Date.now(),
    slotIndex,
    stickerType,
  };
  await db.run(
    'INSERT INTO stickers (id, goal_id, placed_at, slot_index, sticker_type) VALUES (?, ?, ?, ?, ?)',
    sticker.id, sticker.goalId, sticker.placedAt, sticker.slotIndex, sticker.stickerType,
  );
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

export async function getSticker(id: string): Promise<Sticker | null> {
  const db = await getDb();
  const row = await db.first<StickerRow>('SELECT * FROM stickers WHERE id = ?', id);
  return row ? toSticker(row) : null;
}

export async function removeSticker(id: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM stickers WHERE id = ?', id);
}

/**
 * 누적 총계 (PRD 4.3). 그 목표에 **현재 붙어 있는** 스티커 수다.
 * 뗀 스티커는 행이 지워지므로 자동으로 빠진다.
 * 달력판의 월별 진행과는 다른 값이며, 같은 자리에 섞어 표시하지 않는다.
 */
export async function countStickers(goalId: string): Promise<number> {
  const db = await getDb();
  const row = await db.first<{ n: number }>(
    'SELECT COUNT(*) AS n FROM stickers WHERE goal_id = ?',
    goalId,
  );
  return row?.n ?? 0;
}
