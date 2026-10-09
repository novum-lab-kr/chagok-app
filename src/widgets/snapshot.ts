import type { Goal } from '../domain/types';
import type { DateKey } from '../domain/dates';
import { dateKeyOf, daysInclusive, daysInMonth, localDateKey } from '../domain/dates';
import { inPeriod, orderGoals, progressBasis, progressOf, startDate } from '../domain/board';
import { kindLabel, percentLabel } from '../app-data/pocketAdapter';
import { normalizeStickerId } from '../stickers/stickerIds';
import type { WidgetCalendarCell, WidgetGoalView, WidgetMini, WidgetTallyCell } from '../design-system/widget-preview';

/**
 * 위젯 입력. 달력판은 이번 달에 붙인 날짜, 적립판은 붙인 칸 번호(0부터)를 준다.
 * 이번 달 기준 진행은 placedDates로 여기서 센다 — 자정 타임라인에서 다음 달을 만들 때도 맞게 하기 위해서다.
 */
export type WidgetInput = {
  goal: Goal; placedAll: number; placedDates: DateKey[]; slotIndexes: number[];
  /** 그날 마지막으로 붙인 스티커. 날짜가 스냅샷 날짜와 다르면(자정 타임라인) 무시한다 */
  todaySticker?: { dateKey: DateKey; hasRecord: boolean } | null;
  /** 적립판: 그날 붙인 칸 번호와 그중 기록이 없는 칸. 날짜가 스냅샷 날짜와 다르면 무시한다 */
  todaySlots?: { dateKey: DateKey; slots: number[]; removable: number[] } | null;
  /** 기본 스티커를 새로 붙일 수 있는 마지막 시각. 없으면 기한 없음, 0이면 이미 잠김 (스티커 묶음 체험, 2026-10-08) */
  usableUntil?: number | null;
};
export type WidgetGoal = WidgetGoalView & {
  placedToday: boolean;
  /** 적립판: 오늘 붙인 칸 번호(0부터) */
  todaySlots: number[];
  /** 적립판: 위젯에서 눌러 뗄 수 있는 칸 — 오늘 붙였고 기록이 없는 칸 (2026-10-07) */
  removableSlots: number[];
  /** 같은 곳을 다시 누르면 뗄 수 있는가 — 오늘 붙였고 기록이 없을 때 */
  undoable: boolean;
  /** 완성까지 남은 칸 수. 붙여서 완성되지 않는 판(종료일 없는 달력판)은 null. 1이면 다음이 마지막 칸 — 위젯은 판 화면을 연다 */
  remaining: number | null;
  placed: number;
  total: number;
  /** 기본 스티커 묶음의 체험이 끝났다 — 위젯은 붙이지 않고 앱을 열어 안내한다 (RELEASE-DECISIONS 2026-10-08) */
  locked: boolean;
};
export type WidgetSnapshot = { today: DateKey; goals: WidgetGoal[]; defaultGoalId: string | null };

/** 적립판 위젯의 10칸 묶음(5×2, PRD 4.10). */
export const TALLY_CHUNK = 10;

/** 완성까지 남은 칸 수 (PRD 4.3·4.7). 종료일 없는 달력판은 붙여서 완성되지 않는다. */
function remainingOf(goal: Goal, placedAll: number): number | null {
  if (goal.boardType === 'tally') return Math.max(0, (goal.totalSlots ?? 0) - placedAll);
  if (goal.endDate === null) return null;
  return Math.max(0, daysInclusive(startDate(goal), goal.endDate) - placedAll);
}

function calendarMini(goal: Goal, placed: ReadonlySet<DateKey>, now: Date): WidgetMini {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = localDateKey(now.getTime());
  const days: WidgetCalendarCell[] = [];
  for (let d = 1; d <= daysInMonth(year, month); d++) {
    const key = dateKeyOf(year, month, d);
    days.push(!inPeriod(goal, key) ? 'outside' : placed.has(key) ? 'filled' : key < today ? 'missed' : 'future');
  }
  return { type: 'calendar', year, month, firstWeekday: new Date(year, month - 1, 1).getDay(), days };
}

function tallyMini(goal: Goal, slotIndexes: readonly number[], chunk: number): WidgetMini {
  const total = goal.totalSlots ?? 0;
  const taken = new Set(slotIndexes);
  let next = 0;
  while (next < total && taken.has(next)) next++;
  const anchor = next < total ? next : Math.max(total - 1, 0);
  const start = Math.floor(anchor / chunk) * chunk;
  const cells: WidgetTallyCell[] = [];
  for (let i = start; i < Math.min(start + chunk, total); i++) cells.push(taken.has(i) ? 'filled' : 'empty');
  return { type: 'tally', from: start + 1, cells, placed: taken.size, total };
}

/** 앱이 만들어 위젯에 넘긴다. 내 목표 탭의 목표만, 목록과 같은 순서로 (위젯 설계). */
export function buildWidgetSnapshot(inputs: readonly WidgetInput[], now: Date, chunk = TALLY_CHUNK): WidgetSnapshot {
  const byId = new Map(inputs.map((i) => [i.goal.id, i]));
  const { active } = orderGoals(inputs.map((i) => i.goal));
  const goals = active.map((goal): WidgetGoal => {
    const input = byId.get(goal.id)!;
    const basis = progressBasis(goal, now);
    const placed = basis.kind === 'all'
      ? input.placedAll
      : input.placedDates.filter((d) => d.startsWith(`${basis.year}-${String(basis.month).padStart(2, '0')}-`)).length;
    const progress = progressOf(goal, placed, now);
    const placedToday = input.todaySticker?.dateKey === localDateKey(now.getTime());
    const todaySlots = input.todaySlots?.dateKey === localDateKey(now.getTime()) ? input.todaySlots : null;
    return {
      id: goal.id,
      name: goal.name,
      sticker: normalizeStickerId(goal.defaultStickerId),
      kind: kindLabel(goal),
      progressLabel: percentLabel(goal, placed, now),
      percent: progress.percent,
      placed: progress.value,
      total: progress.total,
      placedToday,
      undoable: placedToday && input.todaySticker?.hasRecord === false,
      todaySlots: todaySlots?.slots ?? [],
      removableSlots: todaySlots?.removable ?? [],
      remaining: remainingOf(goal, input.placedAll),
      locked: input.usableUntil != null && now.getTime() >= input.usableUntil,
      mini: goal.boardType === 'calendar'
        ? calendarMini(goal, new Set(input.placedDates), now)
        : tallyMini(goal, input.slotIndexes, chunk),
    };
  });
  return { today: localDateKey(now.getTime()), goals, defaultGoalId: goals[0]?.id ?? null };
}
