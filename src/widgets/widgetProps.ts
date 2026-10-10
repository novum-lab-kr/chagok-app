import type { DateKey } from '../domain/dates';
import type { WidgetCalendarCell, WidgetGoal, WidgetSnapshot, WidgetTallyCell } from './snapshot';
import type { WidgetRequest } from './requests';

// 위젯 3종이 받는 props (PRD 4.10). 위젯 파일(widgets/ios/*)은 이 파일의 타입만 가져간다.
export type WidgetArt = { mascotYet: string; mascotDone: string; mascotFull: string; mascotSleepy: string; bubbles: { ivory: string; white: string; ink: string }; stickers: Record<string, string> };
export type CardBase = { id: string; name: string; placed: number; total: number; placedToday: boolean; undoable: boolean; remaining: number | null; sticker: string; locked?: boolean };
export type GoalCard = CardBase;
export type MonthCard = CardBase & { monthLabel: string; days: WidgetCalendarCell[]; firstWeekday: number; todayIndex: number };
/** todaySlots·removableSlots는 판 전체 칸 번호(0부터)다. 위젯 칸 i는 from - 1 + i번 칸이다. */
export type TallyCard = CardBase & { from: number; cells: WidgetTallyCell[]; todaySlots: number[]; removableSlots: number[] };
type Shared = {
  order: { id: string; name: string }[]; defaultId: string | null; today: DateKey;
  mascotYet: string; mascotDone: string; mascotFull: string; mascotSleepy: string; bubbles: WidgetArt['bubbles']; requests: WidgetRequest[];
};
export type GoalWidgetProps = Shared & { goals: Record<string, GoalCard> };
export type MonthWidgetProps = Shared & { goals: Record<string, MonthCard> };
export type TallyWidgetProps = Shared & { goals: Record<string, TallyCard> };

const base = (g: WidgetGoal, art: WidgetArt): CardBase => ({
  id: g.id, name: g.name, placed: g.placed, total: g.total,
  placedToday: g.placedToday, undoable: g.undoable, remaining: g.remaining,
  sticker: art.stickers[g.sticker] ?? art.stickers['basic.sprout'] ?? '',
  locked: g.locked,
});

function shared(goals: readonly WidgetGoal[], s: WidgetSnapshot, art: WidgetArt): Shared {
  // 기본 목표: 스냅샷의 기본(가장 최근에 붙인 목표)이 이 위젯 종류에 있으면 그것, 없으면 이 종류의 첫 목표.
  const defaultId = goals.some((g) => g.id === s.defaultGoalId) ? s.defaultGoalId : goals[0]?.id ?? null;
  return {
    order: goals.map((g) => ({ id: g.id, name: g.name })), defaultId, today: s.today,
    mascotYet: art.mascotYet, mascotDone: art.mascotDone, mascotFull: art.mascotFull, mascotSleepy: art.mascotSleepy, bubbles: art.bubbles, requests: [],
  };
}

export function goalWidgetProps(s: WidgetSnapshot, art: WidgetArt): GoalWidgetProps {
  return { ...shared(s.goals, s, art), goals: Object.fromEntries(s.goals.map((g) => [g.id, base(g, art)])) };
}

export function monthWidgetProps(s: WidgetSnapshot, art: WidgetArt, now: Date): MonthWidgetProps {
  const cal = s.goals.filter((g) => g.mini.type === 'calendar');
  const goals: Record<string, MonthCard> = {};
  for (const g of cal) {
    if (g.mini.type !== 'calendar') continue;
    goals[g.id] = { ...base(g, art), monthLabel: `${g.mini.month}월`, days: g.mini.days, firstWeekday: g.mini.firstWeekday, todayIndex: now.getDate() - 1 };
  }
  return { ...shared(cal, s, art), goals };
}

export function tallyWidgetProps(s: WidgetSnapshot, art: WidgetArt): TallyWidgetProps {
  const tal = s.goals.filter((g) => g.mini.type === 'tally');
  const goals: Record<string, TallyCard> = {};
  for (const g of tal) {
    if (g.mini.type !== 'tally') continue;
    goals[g.id] = { ...base(g, art), from: g.mini.from, cells: g.mini.cells, todaySlots: g.todaySlots, removableSlots: g.removableSlots };
  }
  return { ...shared(tal, s, art), goals };
}

export const nextMidnight = (now: Date): Date => new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
