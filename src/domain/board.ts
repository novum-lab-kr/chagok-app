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

/** 달력 날짜를 누를 수 있는가. 완성한 판은 기록을 열 수 있는 날(스티커가 있는 날)만. */
export function isDateEnabled(goal: Goal, date: DateKey, hasSticker: boolean): boolean {
  return isCompleted(goal) ? hasSticker : inPeriod(goal, date);
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

export function canPlace(goal: Goal, stickers: readonly Sticker[], target: PlaceTarget, now: Date): boolean {
  if (isCompleted(goal)) return false;
  if (goal.boardType === 'tally') {
    if (!('slot' in target)) return false;
    const { slot } = target;
    return Number.isInteger(slot) && slot >= 0 && slot < (goal.totalSlots ?? 0)
      && !stickers.some((s) => s.slotIndex === slot);
  }
  if (!('date' in target)) return false;
  const { date } = target;
  return date === localDateKey(now.getTime()) && inPeriod(goal, date)
    && !stickers.some((s) => stickerDate(s) === date);
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

export const canRemove = (goal: Goal): boolean => !isCompleted(goal);

/**
 * 떼기 전에 확인하는가. 기록(사진·메모)이 있으면 확인한다 (PRD 4.5).
 * 달력판의 지난 날은 다시 붙일 수 없으므로 기록이 없어도 확인한다 (2026-09-30).
 */
export function needsRemoveConfirm(goal: Goal, sticker: Sticker, hasRecord: boolean, now: Date): boolean {
  if (hasRecord) return true;
  return goal.boardType === 'calendar' && stickerDate(sticker) < localDateKey(now.getTime());
}

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

export { dateKeyOf };
