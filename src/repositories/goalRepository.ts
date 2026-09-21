import { getDb } from '../db/client';
import { newId } from './ids';
import type { Goal, BoardType } from '../domain/types';

type GoalRow = {
  id: string;
  name: string;
  board_type: BoardType;
  total_slots: number | null;
  created_at: number;
};

function toGoal(r: GoalRow): Goal {
  return {
    id: r.id,
    name: r.name,
    boardType: r.board_type,
    totalSlots: r.total_slots,
    createdAt: r.created_at,
  };
}

export async function createGoal(input: {
  name: string;
  boardType: BoardType;
  totalSlots: number | null;
}): Promise<Goal> {
  const db = await getDb();
  const goal: Goal = {
    id: newId(),
    name: input.name,
    boardType: input.boardType,
    totalSlots: input.boardType === 'tally' ? input.totalSlots : null,
    createdAt: Date.now(),
  };
  await db.run(
    'INSERT INTO goals (id, name, board_type, total_slots, created_at) VALUES (?, ?, ?, ?, ?)',
    goal.id, goal.name, goal.boardType, goal.totalSlots, goal.createdAt,
  );
  return goal;
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
