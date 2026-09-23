import { getDb } from '../db/client';
import { newId } from './ids';
import { DEFAULT_STICKER_ID } from '../domain/types';
import type { Goal, BoardType } from '../domain/types';

type GoalRow = {
  id: string;
  name: string;
  board_type: BoardType;
  total_slots: number | null;
  default_sticker_id: string;
  created_at: number;
};

function toGoal(r: GoalRow): Goal {
  return {
    id: r.id,
    name: r.name,
    boardType: r.board_type,
    totalSlots: r.total_slots,
    defaultStickerId: r.default_sticker_id,
    createdAt: r.created_at,
  };
}

export async function createGoal(input: {
  name: string;
  boardType: BoardType;
  totalSlots: number | null;
  defaultStickerId?: string;
}): Promise<Goal> {
  const db = await getDb();
  const goal: Goal = {
    id: newId(),
    name: input.name,
    boardType: input.boardType,
    totalSlots: input.boardType === 'tally' ? input.totalSlots : null,
    defaultStickerId: input.defaultStickerId ?? DEFAULT_STICKER_ID,
    createdAt: Date.now(),
  };
  await db.run(
    `INSERT INTO goals (id, name, board_type, total_slots, default_sticker_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    goal.id, goal.name, goal.boardType, goal.totalSlots,
    goal.defaultStickerId, goal.createdAt,
  );
  return goal;
}

/**
 * 목표 설정에서 이름·기본 스티커를 바꾼다 (PRD 4.4).
 * 이미 붙어 있는 스티커의 종류는 건드리지 않는다.
 */
export async function updateGoal(
  id: string,
  patch: { name?: string; defaultStickerId?: string },
): Promise<void> {
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  if (patch.name !== undefined) { sets.push('name = ?'); values.push(patch.name); }
  if (patch.defaultStickerId !== undefined) {
    sets.push('default_sticker_id = ?');
    values.push(patch.defaultStickerId);
  }
  if (sets.length === 0) return;

  const db = await getDb();
  await db.run(`UPDATE goals SET ${sets.join(', ')} WHERE id = ?`, ...values, id);
}

export async function listGoals(): Promise<Goal[]> {
  const db = await getDb();
  const rows = await db.all<GoalRow>('SELECT * FROM goals ORDER BY created_at DESC');
  return rows.map(toGoal);
}

export async function getGoal(id: string): Promise<Goal | null> {
  const db = await getDb();
  const row = await db.first<GoalRow>('SELECT * FROM goals WHERE id = ?', id);
  return row ? toGoal(row) : null;
}

export async function deleteGoal(id: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM goals WHERE id = ?', id);
}
