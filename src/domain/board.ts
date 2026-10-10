/**
 * 판 규칙 (PRD 4.1–4.7, docs/DEV-DESIGN-home-structure.md 2절). UI 없는 순수 함수다.
 * 시각은 `now`로 받아 테스트에서 고정한다. 날짜는 모두 로컬 날짜 키다.
 * 적립판 칸 번호는 0부터(slotIndex)다. 화면의 1부터 번호는 어댑터가 바꾼다.
 */
import { dateKeyOf, dayAfter, daysInclusive, daysInMonth, localDateKey, monthKeyOf, startOfDayAfter } from './dates';
import type { DateKey } from './dates';
import type { Goal, Sticker } from './types';

/** 붙일 자리. 적립판은 칸, 달력판은 날짜. */
export type PlaceTarget = { slot: number } | { date: DateKey };

export type ProgressBasis =
  | { kind: 'all' }
  /** 종료일 없는 달력판. current = 이번 달(진행 중), 아니면 완성한 달 */
  | { kind: 'month'; year: number; month: number; current: boolean };

export type Progress = { value: number; total: number; percent: number };

/** 시작일 = 만든 날 (PRD 4.3). */
export const startDate = (goal: Goal): DateKey => localDateKey(goal.createdAt);

export const isCompleted = (goal: Goal): boolean => goal.completedAt !== null;

/** 완성했고 아직 닫기/계속하기를 고르지 않았다. 판을 열면 완성 흐름을 보여준다. */
export const pendingCompletion = (goal: Goal): boolean => isCompleted(goal) && !goal.completionSeen;

const hasPeriod = (goal: Goal): goal is Goal & { endDate: DateKey } =>
  goal.boardType === 'calendar' && goal.endDate !== null;

/** 종료일 다음 날부터 기간이 지난 것이다. 종료일 당일은 아직 붙일 수 있다. */
export function isPeriodOver(goal: Goal, now: Date): boolean {
  return hasPeriod(goal) && localDateKey(now.getTime()) > goal.endDate;
}

/** 종료일이 지나 완성된 판의 완성 시각: 종료일 다음 날 0시. */
export const periodEndAt = (endDate: DateKey): number => startOfDayAfter(endDate);

export function progressBasis(goal: Goal, now: Date): ProgressBasis {
  if (goal.boardType === 'tally' || goal.endDate !== null) return { kind: 'all' };
  const ref = new Date(goal.completedAt ?? now.getTime());
  return { kind: 'month', year: ref.getFullYear(), month: ref.getMonth() + 1, current: goal.completedAt === null };
}

/** 이 판의 전체 칸 수. 기간 없는 달력판은 기준 달의 날 수다. */
export function totalOf(goal: Goal, now: Date): number {
  if (goal.boardType === 'tally') return goal.totalSlots ?? 0;
  if (goal.endDate !== null) return daysInclusive(startDate(goal), goal.endDate);
  const basis = progressBasis(goal, now) as Extract<ProgressBasis, { kind: 'month' }>;
  return daysInMonth(basis.year, basis.month);
}

/** placed = 기준(progressBasis) 안에서 붙어 있는 스티커 수. */
export function progressOf(goal: Goal, placed: number, now: Date): Progress {
  const total = totalOf(goal, now);
  return { value: placed, total, percent: total > 0 ? Math.floor((placed / total) * 100) : 0 };
}

/** 시작일부터 종료일(없으면 끝없이)까지. */
export function inPeriod(goal: Goal, date: DateKey): boolean {
  return date >= startDate(goal) && (goal.endDate === null || date <= goal.endDate);
}

/**
 * 고칠 수 있는 기간. 완성한 판도 칸을 고칠 수 있다 (2026-10-08) — 종료일 없는 판은 완성한 날까지.
 * 완성은 한 번 되면 그대로다. 칸을 떼도 진행 중으로 돌아가지 않는다.
 */
function inEditablePeriod(goal: Goal, date: DateKey): boolean {
  if (!inPeriod(goal, date)) return false;
  return goal.endDate !== null || goal.completedAt === null || date <= localDateKey(goal.completedAt);
}

/** 달력 날짜를 누를 수 있는가. 고칠 수 있는 기간 안이거나, 스티커가 붙어 있어 기록을 열 수 있는 날. */
export function isDateEnabled(goal: Goal, date: DateKey, hasSticker: boolean): boolean {
  return hasSticker || inEditablePeriod(goal, date);
}

/** 시작한 달에서는 이전 달, 종료일이 있는 달에서는 다음 달로 가지 않는다. 기간 없는 달력판은 미래로 계속 간다. */
export function monthNav(goal: Goal, year: number, month: number): { canGoPrev: boolean; canGoNext: boolean } {
  const shown = monthKeyOf(year, month);
  return {
    canGoPrev: shown > startDate(goal).slice(0, 7),
    canGoNext: goal.endDate === null || shown < goal.endDate.slice(0, 7),
  };
}

export const stickerDate = (s: Sticker): DateKey => localDateKey(s.placedAt);

/**
 * 붙일 수 있는가. 적립판은 빈칸 어디든, 달력판은 시작일부터 오늘까지의 빈 날 (2026-10-08 — 지난 날짜도, 미래는 안 됨).
 * 완성한 판도 붙인다.
 */
export function canPlace(goal: Goal, stickers: readonly Sticker[], target: PlaceTarget, now: Date): boolean {
  if (goal.boardType === 'tally') {
    if (!('slot' in target)) return false;
    const { slot } = target;
    return Number.isInteger(slot) && slot >= 0 && slot < (goal.totalSlots ?? 0)
      && !stickers.some((s) => s.slotIndex === slot);
  }
  if (!('date' in target)) return false;
  const { date } = target;
  return date <= localDateKey(now.getTime()) && inEditablePeriod(goal, date)
    && !stickers.some((s) => stickerDate(s) === date);
}

/** 달력판 스티커의 붙인 시각. 스티커 날짜는 붙인 시각에서 정해지므로, 지난 날짜면 그 날짜에 지금 시·분으로 둔다. */
export function placedAtFor(date: DateKey, now: number): number {
  if (date === localDateKey(now)) return now;
  const t = new Date(now);
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, t.getHours(), t.getMinutes(), t.getSeconds(), t.getMilliseconds()).getTime();
}

/**
 * 이번에 붙이면 판이 다 차는가. placedTotal은 붙이기 전 그 목표에 붙어 있는 전체 스티커 수다.
 * 기간 없는 달력판은 붙여서 완성되지 않는다 (목표 설정에서 수동 완성, PRD 4.3).
 */
export function completesBoard(goal: Goal, placedTotal: number): boolean {
  if (goal.boardType === 'tally') return placedTotal + 1 >= (goal.totalSlots ?? 0);
  if (goal.endDate === null) return false;
  return placedTotal + 1 >= daysInclusive(startDate(goal), goal.endDate);
}

/**
 * 떼기 전에 확인하는가. 기록(사진·메모)이 있을 때만 (PRD 4.5).
 * 지난 날도 다시 붙일 수 있게 되어 지난 날 확인은 없앴다 (2026-10-08).
 */
export const needsRemoveConfirm = (hasRecord: boolean): boolean => hasRecord;

/** 번호가 가장 작은 빈칸(0부터). 기존 focus를 둘 칸이다 (PRD 4.2). */
export function nextEmptySlot(goal: Goal, stickers: readonly Sticker[]): number | null {
  const taken = new Set(stickers.map((s) => s.slotIndex));
  for (let i = 0; i < (goal.totalSlots ?? 0); i++) if (!taken.has(i)) return i;
  return null;
}

/** 목표 설정의 종료일 하한: 마지막으로 붙인 날(없으면 시작일) 다음 날 (PRD 4.3). */
export function endDateFloor(goal: Goal): DateKey {
  return dayAfter(goal.lastPlacedAt !== null ? localDateKey(goal.lastPlacedAt) : startDate(goal));
}

/** 계속하기의 종료일 하한: 오늘과 기존 종료일 다음 날 중 늦은 날 (PRD 4.7). */
export function extendEndDateFloor(goal: Goal, now: Date): DateKey {
  const today = localDateKey(now.getTime());
  const afterEnd = goal.endDate ? dayAfter(goal.endDate) : today;
  return afterEnd > today ? afterEnd : today;
}

/** 칸 늘리기의 기본값: 처음 만든 칸 수만큼 더한다 (2026-09-30). */
export const defaultExtraSlots = (goal: Goal): number => goal.initialSlots ?? goal.totalSlots ?? 0;

/** 내 목표: 마지막으로 붙인 시각(없으면 만든 시각) 최근순. 완성한 판: 완성 시각 최근순 (PRD 4.1). */
export function orderGoals<G extends Goal>(goals: readonly G[]): { active: G[]; completed: G[] } {
  const recent = (g: Goal) => g.lastPlacedAt ?? g.createdAt;
  return {
    active: goals.filter((g) => !isCompleted(g)).sort((a, b) => recent(b) - recent(a)),
    completed: goals.filter(isCompleted).sort((a, b) => b.completedAt! - a.completedAt!),
  };
}

/**
 * 목표 설정의 적립판 칸 수 입력 (2026-09-30). 늘리기만 된다 — 지금 칸 수 이상의 정수만 받는다.
 * 앞의 0은 무시한다("030" → 30). reason은 입력칸 아래에 그대로 보여준다.
 */
export function parseSlotCount(input: string, current: number): { ok: true; value: number } | { ok: false; reason: string } {
  const text = input.trim();
  if (text === '') return { ok: false, reason: '칸 수를 입력해 주세요.' };
  if (!/^\d+$/.test(text)) return { ok: false, reason: '숫자만 입력할 수 있어요.' };
  const value = Number(text);
  if (value < 1) return { ok: false, reason: '1칸 이상이어야 해요.' };
  if (value < current) return { ok: false, reason: `지금 ${current}칸보다 줄일 수 없어요.` };
  return { ok: true, value };
}

/**
 * 입력 글자 수 (2026-10-08). 입력칸은 maxLength로 한도를 넘지 못하게 하고, 이 문구는 입력칸 아래에 보여준다.
 * 글자 수는 RN maxLength와 같은 기준(string.length)으로 센다.
 */
export const GOAL_NAME_MAX = 20;
export const MEMO_MAX = 500;
export function goalNameError(name: string): string | undefined {
  if (name.trim() === '') return '목표 이름을 입력해주세요.';
  if (name.length >= GOAL_NAME_MAX) return `${GOAL_NAME_MAX}자까지 입력할 수 있어요.`;
  return undefined;
}
/** 메모는 비워 둬도 된다. */
export function memoError(memo: string): string | undefined {
  return memo.length >= MEMO_MAX ? `${MEMO_MAX}자까지 입력할 수 있어요.` : undefined;
}
/**
 * 새 목표의 이름 문구. 처음 연 빈 칸에는 보이지 않고, 이름을 썼다가 지웠거나
 * 칸을 눌렀다가 비운 채 나왔을 때(touched) 보인다. 띄어쓰기만 있으면 바로 보인다.
 */
export function shownGoalNameError(name: string, touched: boolean): string | undefined {
  return name === '' && !touched ? undefined : goalNameError(name);
}

export { dateKeyOf };
