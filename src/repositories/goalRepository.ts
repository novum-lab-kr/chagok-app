import { getDb } from '../db/client';
import { newId } from './ids';
import { DEFAULT_STICKER_ID } from '../domain/types';
import type { Goal, BoardType } from '../domain/types';
import { localDateKey } from '../domain/dates';
import { periodEndAt, progressBasis } from '../domain/board';
import { enqueue } from '../sync/outbox';

type GoalRow = {
  id: string;
  name: string;
  board_type: BoardType;
  total_slots: number | null;
  default_sticker_id: string;
  created_at: number;
  end_date: string | null;
  completed_at: number | null;
  completion_seen: number;
  last_placed_at: number | null;
  initial_slots: number | null;
};

function toGoal(r: GoalRow): Goal {
  return {
    id: r.id,
    name: r.name,
    boardType: r.board_type,
    totalSlots: r.total_slots,
    defaultStickerId: r.default_sticker_id,
    createdAt: r.created_at,
    endDate: r.end_date,
    completedAt: r.completed_at,
    completionSeen: r.completion_seen === 1,
    lastPlacedAt: r.last_placed_at,
    initialSlots: r.initial_slots,
  };
}

export async function createGoal(input: {
  name: string;
  boardType: BoardType;
  totalSlots: number | null;
  defaultStickerId?: string;
  /** 달력판만. 적립판에 주면 버린다 */
  endDate?: string | null;
}): Promise<Goal> {
  const db = await getDb();
  const tally = input.boardType === 'tally';
  const goal: Goal = {
    id: newId(),
    name: input.name,
    boardType: input.boardType,
    totalSlots: tally ? input.totalSlots : null,
    defaultStickerId: input.defaultStickerId ?? DEFAULT_STICKER_ID,
    createdAt: Date.now(),
    endDate: tally ? null : input.endDate ?? null,
    completedAt: null,
    completionSeen: false,
    lastPlacedAt: null,
    initialSlots: tally ? input.totalSlots : null,
  };
  await db.transaction(async (tx) => {
    await tx.run(
      `INSERT INTO goals (id, name, board_type, total_slots, default_sticker_id, created_at, end_date, initial_slots, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      goal.id, goal.name, goal.boardType, goal.totalSlots,
      goal.defaultStickerId, goal.createdAt, goal.endDate, goal.initialSlots, goal.createdAt,
    );
    await enqueue(tx, 'goal', goal.id, goal.createdAt);
  });
  return goal;
}

/**
 * 목표 설정에서 이름·기본 스티커·종료일을 바꾼다 (PRD 4.4).
 * 이미 붙어 있는 스티커의 종류는 건드리지 않는다. endDate: null은 종료일 지우기다.
 */
export async function updateGoal(
  id: string,
  patch: { name?: string; defaultStickerId?: string; endDate?: string | null },
): Promise<void> {
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  if (patch.name !== undefined) { sets.push('name = ?'); values.push(patch.name); }
  if (patch.defaultStickerId !== undefined) {
    sets.push('default_sticker_id = ?');
    values.push(patch.defaultStickerId);
  }
  if (patch.endDate !== undefined) { sets.push('end_date = ?'); values.push(patch.endDate); }
  if (sets.length === 0) return;
  await writeGoal(id, sets.join(', '), ...values);
}

/** 목표 한 행을 고치고 updated_at·outbox를 같은 트랜잭션에서 남긴다 (계정·백업 설계 ②). */
async function writeGoal(id: string, sql: string, ...params: (string | number | null)[]): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.transaction(async (tx) => {
    await tx.run(`UPDATE goals SET ${sql}, updated_at = ? WHERE id = ?`, ...params, now, id);
    await enqueue(tx, 'goal', id, now);
  });
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

/** 완성한다. 완성 흐름(닫기/계속하기)을 아직 보여주지 않은 상태가 된다 (PRD 4.7). */
export async function completeGoal(id: string, at: number): Promise<void> {
  await writeGoal(id, 'completed_at = ?, completion_seen = 0', at);
}

/** 완성 다이얼로그에서 닫기를 골랐다. 다시 묻지 않는다. */
export async function markCompletionSeen(id: string): Promise<void> {
  await writeGoal(id, 'completion_seen = 1');
}

const REOPEN = 'completed_at = NULL, completion_seen = 0';

/** 기간 없는 달력판의 계속하기: 완성을 푼다. */
export async function reopenGoal(id: string): Promise<void> {
  await writeGoal(id, REOPEN);
}

/** 적립판의 계속하기: 칸을 더하고 진행 중으로 돌아간다. 상한은 없다 (2026-09-30). */
export async function extendSlots(id: string, add: number): Promise<void> {
  if (!Number.isInteger(add) || add < 1) throw new Error('더할 칸 수는 1 이상이어야 합니다.');
  const goal = await getGoal(id);
  if (!goal || goal.boardType !== 'tally') return; // 적립판만 칸을 늘린다
  await writeGoal(id, `total_slots = total_slots + ?, ${REOPEN}`, add);
}

/** 기간 달력판의 계속하기: 종료일을 바꾸고 진행 중으로 돌아간다. */
export async function extendEndDate(id: string, endDate: string): Promise<void> {
  await writeGoal(id, `end_date = ?, ${REOPEN}`, endDate);
}

/**
 * 종료일이 지난 진행 중 달력판을 완성한다. 확인 없이 완성되고, 판을 처음 열 때 완성 흐름을 보여준다 (PRD 4.7).
 * 목록·상세를 읽기 전에 부른다.
 */
export async function settleExpiredPeriods(now: Date): Promise<void> {
  const db = await getDb();
  const today = localDateKey(now.getTime());
  const rows = await db.all<{ id: string; end_date: string }>(
    `SELECT id, end_date FROM goals
      WHERE board_type = 'calendar' AND end_date IS NOT NULL AND completed_at IS NULL AND end_date < ?`,
    today,
  );
  for (const r of rows) await completeGoal(r.id, periodEndAt(r.end_date));
}

/** 삭제 확인에 보여줄 수. 기록은 사진이나 비어 있지 않은 메모가 있는 것만 센다 (기록 표식과 같은 기준). */
export async function countGoalContents(id: string): Promise<{ stickers: number; records: number }> {
  const db = await getDb();
  const row = await db.first<{ stickers: number; records: number }>(
    `SELECT
       (SELECT COUNT(*) FROM stickers WHERE goal_id = ?) AS stickers,
       (SELECT COUNT(*) FROM records r JOIN stickers s ON s.id = r.sticker_id
         WHERE s.goal_id = ?
           AND (NULLIF(TRIM(r.memo), '') IS NOT NULL OR NULLIF(TRIM(r.photo_uri), '') IS NOT NULL)) AS records`,
    id, id,
  );
  return { stickers: row?.stickers ?? 0, records: row?.records ?? 0 };
}

/**
 * 목표와 그 스티커·기록을 지운다. 지운 기록의 사진 경로를 돌려준다.
 * 사진 파일은 호출자가 DB 삭제가 성공한 뒤에 정리한다.
 * expo의 트랜잭션은 별도 연결이라 `PRAGMA foreign_keys`가 꺼져 있을 수 있다. CASCADE에 기대지 않고 직접 지운다.
 */
export async function deleteGoal(id: string): Promise<string[]> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    // 복원 뒤 사진을 아직 못 받은 기록(서버 경로만 있음)도 서버 사진을 지워야 한다.
    const photos = await tx.all<{ id: string; photo_uri: string | null }>(
      `SELECT r.id, r.photo_uri FROM records r JOIN stickers s ON s.id = r.sticker_id
        WHERE s.goal_id = ? AND (r.photo_uri IS NOT NULL OR r.photo_remote_path IS NOT NULL)`,
      id,
    );
    await tx.run('DELETE FROM records WHERE sticker_id IN (SELECT id FROM stickers WHERE goal_id = ?)', id);
    await tx.run('DELETE FROM stickers WHERE goal_id = ?', id);
    await tx.run('DELETE FROM goals WHERE id = ?', id);
    // 딸린 스티커·기록은 서버가 연쇄 표식한다. 사진 파일은 기록 id로 따로 지운다.
    const now = Date.now();
    await enqueue(tx, 'goal', id, now);
    for (const p of photos) await enqueue(tx, 'photo', p.id, now);
    return photos.flatMap((p) => (p.photo_uri ? [p.photo_uri] : []));
  });
}

export type GoalSummary = {
  goal: Goal;
  /** 지금 붙어 있는 전체 수 */
  placedAll: number;
  /** 진행률 기준(progressBasis) 안에서 붙어 있는 수. 기간 없는 달력판만 전체와 다르다 */
  placedInBasis: number;
};

/**
 * 목록 카드용. 스티커를 전부 읽지 않고 목표·달별 개수만 읽는다 (PRD 6.3).
 * 달은 기기 로컬 시간 기준이다.
 */
export async function listGoalSummaries(now: Date): Promise<GoalSummary[]> {
  const db = await getDb();
  const goals = (await db.all<GoalRow>('SELECT * FROM goals')).map(toGoal);
  const counts = await db.all<{ goal_id: string; ym: string; n: number }>(
    `SELECT goal_id, strftime('%Y-%m', placed_at / 1000, 'unixepoch', 'localtime') AS ym, COUNT(*) AS n
       FROM stickers GROUP BY goal_id, ym`,
  );
  return goals.map((goal) => {
    const mine = counts.filter((c) => c.goal_id === goal.id);
    const placedAll = mine.reduce((sum, c) => sum + c.n, 0);
    const basis = progressBasis(goal, now);
    const placedInBasis = basis.kind === 'all'
      ? placedAll
      : mine.find((c) => c.ym === `${basis.year}-${String(basis.month).padStart(2, '0')}`)?.n ?? 0;
    return { goal, placedAll, placedInBasis };
  });
}
