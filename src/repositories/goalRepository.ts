import { getDb } from '../db/client';
import type { DbDriver } from '../db/driver';
import { ME, newId } from './ids';
import { DEFAULT_STICKER_ID } from '../domain/types';
import type { Goal, BoardType, GoalMode, MemberRole } from '../domain/types';
import { localDateKey, monthKeyOf } from '../domain/dates';
import { periodEndAt, progressBasis } from '../domain/board';
import { enqueue } from '../sync/outbox';
import { deleteStickerRow } from './stickerRepository';
import type { RemovedRecord } from './recordRepository';
import { track } from '../analytics';

type GoalRow = {
  id: string;
  mode: GoalMode;
  role: MemberRole;
  name: string;
  board_type: BoardType;
  total_slots: number | null;
  sticker_id: string | null;
  created_at: number;
  end_date: string | null;
  completed_at: number | null;
  completion_seen: number;
  last_placed_at: number | null;
  initial_slots: number | null;
  sort_order: number | null;
};

/** 목표와 내 멤버 행을 합쳐 읽는다. 내 멤버 행이 없는 목표는 나오지 않는다. */
const GOAL_SELECT = `SELECT g.id, g.mode, m.role, g.name, g.board_type, g.total_slots, m.sticker_id, g.created_at, g.end_date,
       m.completed_at, m.completion_seen, m.last_placed_at, g.initial_slots, m.sort_order
  FROM goals g JOIN goal_members m ON m.goal_id = g.id AND m.user_id = '${ME}'`;

function toGoal(r: GoalRow): Goal {
  return {
    id: r.id,
    mode: r.mode,
    role: r.role,
    name: r.name,
    boardType: r.board_type,
    totalSlots: r.total_slots,
    defaultStickerId: r.sticker_id ?? DEFAULT_STICKER_ID,
    createdAt: r.created_at,
    endDate: r.end_date,
    completedAt: r.completed_at,
    completionSeen: r.completion_seen === 1,
    lastPlacedAt: r.last_placed_at,
    initialSlots: r.initial_slots,
    sortOrder: r.sort_order,
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
  const createdAt = Date.now();
  return db.transaction(async (tx) => {
    // 새 목표는 내 목표 맨 위 (PRD 4.1). 지금 가장 작은 순서보다 하나 작게.
    const top = await tx.first<{ min: number | null }>('SELECT MIN(sort_order) AS min FROM goal_members WHERE user_id = ?', ME);
    const goal: Goal = {
      id: newId(),
      mode: 'solo',
      role: 'owner',
      name: input.name,
      boardType: input.boardType,
      totalSlots: tally ? input.totalSlots : null,
      defaultStickerId: input.defaultStickerId ?? DEFAULT_STICKER_ID,
      createdAt,
      endDate: tally ? null : input.endDate ?? null,
      completedAt: null,
      completionSeen: false,
      lastPlacedAt: null,
      initialSlots: tally ? input.totalSlots : null,
      sortOrder: top?.min == null ? 0 : top.min - 1,
    };
    await tx.run(
      `INSERT INTO goals (id, mode, name, board_type, total_slots, initial_slots, end_date, max_members, created_at, updated_at)
       VALUES (?, 'solo', ?, ?, ?, ?, ?, 1, ?, ?)`,
      goal.id, goal.name, goal.boardType, goal.totalSlots, goal.initialSlots, goal.endDate, goal.createdAt, goal.createdAt,
    );
    await tx.run(
      `INSERT INTO goal_members (goal_id, user_id, role, sticker_id, sort_order, joined_at, updated_at)
       VALUES (?, ?, 'owner', ?, ?, ?, ?)`,
      goal.id, ME, goal.defaultStickerId, goal.sortOrder, goal.createdAt, goal.createdAt,
    );
    await enqueue(tx, 'goal', goal.id, goal.createdAt);
    await enqueue(tx, 'member', goal.id, goal.createdAt);
    return goal;
  });
}

/**
 * 목표 설정에서 이름·기본 스티커·종료일·칸 수를 바꾼다 (PRD 4.4).
 * 이미 붙어 있는 스티커의 종류는 건드리지 않는다. endDate: null은 종료일 지우기다.
 * totalSlots는 진행 중인 적립판에서 늘리기만 된다 (2026-09-30). 줄이면 어느 칸에든 붙인 스티커가
 * 판 밖으로 밀려날 수 있다. 처음 만든 칸 수(initial_slots, 칸 늘리기 기본값)는 바꾸지 않는다.
 * 이름, 종료일, 칸 수는 목표 자체의 값이라 goal 항목, 기본 스티커는 내 멤버 행이라 member 항목이다.
 */
export async function updateGoal(
  id: string,
  patch: { name?: string; defaultStickerId?: string; endDate?: string | null; totalSlots?: number },
): Promise<void> {
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  if (patch.name !== undefined) { sets.push('name = ?'); values.push(patch.name); }
  if (patch.endDate !== undefined) { sets.push('end_date = ?'); values.push(patch.endDate); }
  const slots = patch.totalSlots;
  if (slots !== undefined) {
    if (!Number.isInteger(slots) || slots < 1) throw new Error('칸 수는 1 이상의 정수여야 합니다.');
    sets.push('total_slots = ?');
    values.push(slots);
  }
  const member = patch.defaultStickerId === undefined
    ? undefined
    : { sql: 'sticker_id = ?', params: [patch.defaultStickerId] };
  if (sets.length === 0 && !member) return;
  // 칸 수는 저장하는 순간의 값으로 검사한다. 화면을 연 뒤 판이 완성되거나 칸이 늘었을 수 있다.
  const check = slots === undefined ? undefined : async (tx: DbDriver) => {
    const row = await tx.first<{ board_type: BoardType; total_slots: number | null; completed_at: number | null }>(
      `SELECT g.board_type, g.total_slots, m.completed_at FROM goals g
         JOIN goal_members m ON m.goal_id = g.id AND m.user_id = ? WHERE g.id = ?`,
      ME, id,
    );
    if (!row) throw new Error('목표가 없습니다.');
    if (row.board_type !== 'tally') throw new Error('칸 수는 적립판만 바꿀 수 있습니다.');
    if (row.completed_at !== null) throw new Error('완성한 판은 고칠 수 없습니다.');
    if (slots < (row.total_slots ?? 0)) throw new Error('칸 수는 줄일 수 없습니다.');
  };
  await writeGoal(id, { goal: sets.length ? { sql: sets.join(', '), params: values } : undefined, member }, check);
}

type Part = { sql: string; params?: (string | number | null)[] };

/**
 * 목표 한 행(goal)과 내 멤버 행(member)을 고치고 updated_at과 outbox를 같은 트랜잭션에서 남긴다 (계정·백업 설계 ②).
 * 바꾼 쪽만 outbox에 넣는다. check가 던지면 아무것도 바꾸지 않는다.
 */
async function writeGoal(
  id: string, parts: { goal?: Part; member?: Part }, check?: (tx: DbDriver) => Promise<void>,
): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.transaction(async (tx) => {
    if (check) await check(tx);
    if (parts.goal) {
      await requireSolo(tx, id);
      await tx.run(`UPDATE goals SET ${parts.goal.sql}, updated_at = ? WHERE id = ?`, ...(parts.goal.params ?? []), now, id);
      await enqueue(tx, 'goal', id, now);
    }
    if (parts.member) {
      await tx.run(
        `UPDATE goal_members SET ${parts.member.sql}, updated_at = ? WHERE goal_id = ? AND user_id = ?`,
        ...(parts.member.params ?? []), now, id, ME,
      );
      await enqueue(tx, 'member', id, now);
    }
  });
}

/** 목표 자체를 바꾸거나 지우는 쓰기는 혼자 목표만 된다. 함께 목표는 서버 RPC로 바꾼다(2단계). 없는 목표는 건너뛴다. */
async function requireSolo(tx: DbDriver, id: string): Promise<void> {
  const row = await tx.first<{ mode: GoalMode }>('SELECT mode FROM goals WHERE id = ?', id);
  if (row && row.mode !== 'solo') throw new Error('함께 목표는 이 기기에서 바로 바꿀 수 없습니다.');
}

/**
 * 내 목표 순서를 저장한다 (PRD 4.1, 2026-10-30). ids는 목록 위에서부터의 진행 중 목표 id다.
 * 자리가 바뀐 목표만 고쳐 updated_at을 바꾸고 outbox에 넣는다 — 위젯과 워치도 이 신호로 다시 그린다.
 * 그사이 지워진 목표는 건너뛰고, ids에 없는 목표(그사이 만든 목표 등)는 그대로 둔다.
 */
export async function reorderGoals(ids: readonly string[]): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.transaction(async (tx) => {
    const rows = await tx.all<{ id: string; sort_order: number | null }>(
      'SELECT goal_id AS id, sort_order FROM goal_members WHERE user_id = ?', ME,
    );
    const current = new Map(rows.map((r) => [r.id, r.sort_order]));
    for (const [index, id] of ids.entries()) {
      if (!current.has(id) || current.get(id) === index) continue;
      await tx.run('UPDATE goal_members SET sort_order = ?, updated_at = ? WHERE goal_id = ? AND user_id = ?', index, now, id, ME);
      await enqueue(tx, 'member', id, now);
    }
  });
}

export async function listGoals(): Promise<Goal[]> {
  const db = await getDb();
  const rows = await db.all<GoalRow>(`${GOAL_SELECT} ORDER BY g.created_at DESC`);
  return rows.map(toGoal);
}

export async function getGoal(id: string): Promise<Goal | null> {
  const db = await getDb();
  const row = await db.first<GoalRow>(`${GOAL_SELECT} WHERE g.id = ?`, id);
  return row ? toGoal(row) : null;
}

/** 완성한다. 완성 흐름(닫기/계속하기)을 아직 보여주지 않은 상태가 된다 (PRD 4.7). */
export async function completeGoal(id: string, at: number): Promise<void> {
  await writeGoal(id, { member: { sql: 'completed_at = ?, completion_seen = 0', params: [at] } });
}

/** 완성 다이얼로그에서 닫기를 골랐다. 다시 묻지 않는다. */
export async function markCompletionSeen(id: string): Promise<void> {
  await writeGoal(id, { member: { sql: 'completion_seen = 1' } });
}

const REOPEN = 'completed_at = NULL, completion_seen = 0';

/** 기간 없는 달력판의 계속하기: 완성을 푼다. */
export async function reopenGoal(id: string): Promise<void> {
  await writeGoal(id, { member: { sql: REOPEN } });
}

/** 적립판의 계속하기: 칸을 더하고 진행 중으로 돌아간다. 상한은 없다 (2026-09-30). */
export async function extendSlots(id: string, add: number): Promise<void> {
  if (!Number.isInteger(add) || add < 1) throw new Error('더할 칸 수는 1 이상이어야 합니다.');
  const goal = await getGoal(id);
  if (!goal || goal.boardType !== 'tally') return; // 적립판만 칸을 늘린다
  await writeGoal(id, { goal: { sql: 'total_slots = total_slots + ?', params: [add] }, member: { sql: REOPEN } });
}

/** 기간 달력판의 계속하기: 종료일을 바꾸고 진행 중으로 돌아간다. */
export async function extendEndDate(id: string, endDate: string): Promise<void> {
  await writeGoal(id, { goal: { sql: 'end_date = ?', params: [endDate] }, member: { sql: REOPEN } });
}

/**
 * 종료일이 지난 진행 중 달력판을 완성한다. 확인 없이 완성되고, 판을 처음 열 때 완성 흐름을 보여준다 (PRD 4.7).
 * 목록·상세를 읽기 전에 부른다.
 */
export async function settleExpiredPeriods(now: Date): Promise<void> {
  const db = await getDb();
  const today = localDateKey(now.getTime());
  const rows = await db.all<{ id: string; end_date: string }>(
    `SELECT g.id, g.end_date FROM goals g JOIN goal_members m ON m.goal_id = g.id AND m.user_id = ?
      WHERE g.board_type = 'calendar' AND g.end_date IS NOT NULL AND m.completed_at IS NULL AND g.end_date < ?`,
    ME, today,
  );
  for (const r of rows) {
    await completeGoal(r.id, periodEndAt(r.end_date));
    track('goal_complete', { source: 'period_end' });
  }
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
 */
export async function deleteGoal(id: string): Promise<string[]> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await requireSolo(tx, id);
    const records = await deleteGoalRows(tx, id);
    // 멤버 행은 목표와 함께 서버가 지운다. 올리지 못한 멤버 항목이 남으면 이미 없는 행의 삭제를 따로 보내게 된다.
    await tx.run("DELETE FROM outbox WHERE entity = 'member' AND row_id = ?", id);
    // 딸린 스티커·기록은 서버가 연쇄 표식한다. 사진 파일은 기록 id로 따로 지운다.
    // 복원 뒤 사진을 아직 못 받은 기록(서버 경로만 있음)도 서버 사진을 지워야 한다.
    const now = Date.now();
    await enqueue(tx, 'goal', id, now);
    for (const r of records) if (r.photoUri || r.photoRemotePath) await enqueue(tx, 'photo', r.recordId, now);
    return records.flatMap((r) => (r.photoUri ? [r.photoUri] : []));
  });
}

/**
 * 목표와 그 멤버, 칸, 기록을 기기에서만 지운다(outbox를 만들지 않는다). 지운 기록을 돌려준다.
 * 목표 지우기와 받아 오기(지운 목표, 나간 목표)가 함께 쓴다.
 * expo의 트랜잭션은 별도 연결이라 `PRAGMA foreign_keys`가 꺼져 있을 수 있다. CASCADE에 기대지 않고 직접 지운다.
 */
export async function deleteGoalRows(tx: DbDriver, id: string): Promise<RemovedRecord[]> {
  const records: RemovedRecord[] = [];
  for (const { id: stickerId } of await tx.all<{ id: string }>('SELECT id FROM stickers WHERE goal_id = ?', id)) {
    const record = await deleteStickerRow(tx, stickerId);
    if (record) records.push(record);
  }
  await tx.run('DELETE FROM goal_members WHERE goal_id = ?', id);
  await tx.run('DELETE FROM goals WHERE id = ?', id);
  return records;
}

export type GoalSummary = {
  goal: Goal;
  /** 지금 붙어 있는 전체 수 */
  placedAll: number;
  /** 진행률 기준(progressBasis) 안에서 붙어 있는 수. 기간 없는 달력판만 전체와 다르다 */
  placedInBasis: number;
  /** 함께하는 사람 수(나 포함, 보기만 하는 사람은 뺀다. countMembers와 같은 규칙). 혼자 목표는 1 */
  memberCount: number;
};

/**
 * 목록 카드용. 스티커를 전부 읽지 않고 목표·달별 개수만 읽는다 (PRD 6.3).
 * 달은 스티커에 저장된 붙인 날짜(date_key) 기준이다. 내가 보는 판의 칸만 센다(친구 판은 뺀다).
 */
export async function listGoalSummaries(now: Date): Promise<GoalSummary[]> {
  const db = await getDb();
  const goals = (await db.all<GoalRow>(GOAL_SELECT)).map(toGoal);
  const counts = await db.all<{ goal_id: string; ym: string; n: number }>(
    `SELECT goal_id, substr(date_key, 1, 7) AS ym, COUNT(*) AS n
       FROM stickers WHERE board_user_id = '${ME}' OR board_user_id IS NULL GROUP BY goal_id, ym`,
  );
  const members = new Map((await db.all<{ goal_id: string; n: number }>(
    "SELECT goal_id, COUNT(*) AS n FROM goal_members WHERE role != 'viewer' GROUP BY goal_id",
  )).map((r) => [r.goal_id, r.n]));
  return goals.map((goal) => {
    const mine = counts.filter((c) => c.goal_id === goal.id);
    const placedAll = mine.reduce((sum, c) => sum + c.n, 0);
    const basis = progressBasis(goal, now);
    const placedInBasis = basis.kind === 'all'
      ? placedAll
      : mine.find((c) => c.ym === monthKeyOf(basis.year, basis.month))?.n ?? 0;
    return { goal, placedAll, placedInBasis, memberCount: members.get(goal.id) ?? 1 };
  });
}
