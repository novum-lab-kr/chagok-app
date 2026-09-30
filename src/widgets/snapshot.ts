import type { Goal } from '../domain/types';
import type { DateKey } from '../domain/dates';
import { dateKeyOf, daysInMonth, localDateKey } from '../domain/dates';
import { inPeriod, orderGoals, progressBasis, progressOf } from '../domain/board';
import { kindLabel, percentLabel, safeStickerId } from '../app-data/pocketAdapter';
import type { WidgetCalendarCell, WidgetGoalView, WidgetMini, WidgetTallyCell } from '../design-system/widget-preview';

/**
 * 위젯 입력. 달력판은 이번 달에 붙인 날짜, 적립판은 붙인 칸 번호(0부터)를 준다.
 * 이번 달 기준 진행은 placedDates로 여기서 센다 — 자정 타임라인에서 다음 달을 만들 때도 맞게 하기 위해서다.
 */
export type WidgetInput = { goal: Goal; placedAll: number; placedDates: DateKey[]; slotIndexes: number[] };
export type WidgetSnapshot = { today: DateKey; goals: WidgetGoalView[]; defaultGoalId: string | null };

/** 적립판 중간 크기에 보이는 칸 수. 실제 위젯 크기에 렌더해 보고 정한다 (위젯 설계). */
export const TALLY_CHUNK = 30;

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
  const goals = active.map((goal): WidgetGoalView => {
    const input = byId.get(goal.id)!;
    const basis = progressBasis(goal, now);
    const placed = basis.kind === 'all'
      ? input.placedAll
      : input.placedDates.filter((d) => d.startsWith(`${basis.year}-${String(basis.month).padStart(2, '0')}-`)).length;
    return {
      id: goal.id,
      name: goal.name,
      sticker: safeStickerId(goal.defaultStickerId),
      kind: kindLabel(goal),
      progressLabel: percentLabel(goal, placed, now),
      percent: progressOf(goal, placed, now).percent,
      mini: goal.boardType === 'calendar'
        ? calendarMini(goal, new Set(input.placedDates), now)
        : tallyMini(goal, input.slotIndexes, chunk),
    };
  });
  return { today: localDateKey(now.getTime()), goals, defaultGoalId: goals[0]?.id ?? null };
}
