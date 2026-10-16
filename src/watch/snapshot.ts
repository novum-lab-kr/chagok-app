import type { Goal } from '../domain/types';
import type { DateKey } from '../domain/dates';
import { dateKeyOf, daysInMonth, localDateKey } from '../domain/dates';
import { inPeriod, orderGoals, startDate } from '../domain/board';
import { normalizeStickerId } from '../stickers/stickerIds';
import { remainingOf } from '../widgets/snapshot';
import { nextMidnight } from '../widgets/widgetProps';
import { blockColorOf } from './blockColor';

/** 칸 상태 (워치 설계 「워치 스냅샷」). 지난날 붙인 칸은 워치에서 떼지 않는다. */
export type WatchTallyCell = 'placed' | 'placedToday' | 'empty';
/** 달력판 날짜 상태. empty는 시작일부터 오늘까지의 빈 날(붙일 수 있다), future는 앞날 */
export type WatchDay = 'placed' | 'placedToday' | 'empty' | 'future' | 'outside';
export type WatchBoard =
  | { type: 'tally'; cells: WatchTallyCell[]; /** 기록(사진, 메모)이 있는 칸 번호 */ recorded: number[] }
  | { type: 'calendar'; year: number; month: number; firstWeekday: number; days: WatchDay[]; /** 기록이 있는 날짜 - 1 */ recorded: number[]; startDate: DateKey; endDate: DateKey | null };
export type WatchGoal = {
  id: string; name: string; sticker: string;
  /** 블록 색 (PRD 4.14) */
  color: string;
  /** 완성까지 남은 칸. 1이면 다음이 마지막 칸이라 워치가 완성 확인을 띄운다. 종료일 없는 달력판은 null */
  remaining: number | null;
  /** 기본 스티커 묶음 체험이 끝났다. 워치는 붙이지 않는다 (PRD 4.12) */
  locked: boolean;
  board: WatchBoard;
};
export type WatchDayView = { today: DateKey; goals: WatchGoal[] };
/** 폰이 워치에 보내는 값 하나 (updateApplicationContext). 자정 뒤 값을 함께 보내 폰을 열지 않아도 날이 바뀐다. */
export type WatchSnapshot = WatchDayView & {
  v: 1;
  /** 성장 수 = 블록 수 (growth.ts) */
  growth: number;
  /** 최근 붙인 스티커의 블록 색, 최근순. 머리 위 블록 색에 쓴다 */
  recentColors: string[];
  /** 마지막으로 붙인 진행 중 목표. 차곡이 화면 아래 작은 판 */
  lastGoalId: string | null;
  afterMidnight: WatchDayView;
};

export type WatchStickerInput = { slotIndex: number; dateKey: DateKey; recorded: boolean };
/** stickers: 적립판은 그 목표 전체, 달력판은 그 시점이 속한 달. placedAll: 그 목표에 붙어 있는 전체 수 */
export type WatchInput = { goal: Goal; stickers: WatchStickerInput[]; placedAll: number; usableUntil: number | null };

function tallyBoard(goal: Goal, stickers: readonly WatchStickerInput[], today: DateKey): WatchBoard {
  const bySlot = new Map(stickers.map((s) => [s.slotIndex, s]));
  const cells: WatchTallyCell[] = [];
  for (let i = 0; i < (goal.totalSlots ?? 0); i++) {
    const s = bySlot.get(i);
    cells.push(!s ? 'empty' : s.dateKey === today ? 'placedToday' : 'placed');
  }
  return { type: 'tally', cells, recorded: stickers.filter((s) => s.recorded).map((s) => s.slotIndex).sort((a, b) => a - b) };
}

function calendarBoard(goal: Goal, stickers: readonly WatchStickerInput[], now: Date): WatchBoard {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = localDateKey(now.getTime());
  const byDate = new Map(stickers.map((s) => [s.dateKey, s]));
  const days: WatchDay[] = [];
  const recorded: number[] = [];
  for (let d = 1; d <= daysInMonth(year, month); d++) {
    const key = dateKeyOf(year, month, d);
    const s = byDate.get(key);
    if (s?.recorded) recorded.push(d - 1);
    days.push(!inPeriod(goal, key) ? 'outside' : s ? (key === today ? 'placedToday' : 'placed') : key > today ? 'future' : 'empty');
  }
  return { type: 'calendar', year, month, firstWeekday: new Date(year, month - 1, 1).getDay(), days, recorded, startDate: startDate(goal), endDate: goal.endDate };
}

/** 그 시점의 목표 목록. 진행 중인 목표만, 앱 목록과 같은 순서(마지막으로 붙인 순, PRD 4.1). */
export function buildWatchDay(inputs: readonly WatchInput[], now: Date): WatchDayView {
  const today = localDateKey(now.getTime());
  const byId = new Map(inputs.map((i) => [i.goal.id, i]));
  const { active } = orderGoals(inputs.map((i) => i.goal));
  const goals = active.map((goal): WatchGoal => {
    const input = byId.get(goal.id)!;
    const sticker = normalizeStickerId(goal.defaultStickerId);
    return {
      id: goal.id,
      name: goal.name,
      sticker,
      color: blockColorOf(sticker),
      remaining: remainingOf(goal, input.placedAll),
      locked: input.usableUntil != null && now.getTime() >= input.usableUntil,
      board: goal.boardType === 'calendar' ? calendarBoard(goal, input.stickers, now) : tallyBoard(goal, input.stickers, today),
    };
  });
  return { today, goals };
}

export function buildWatchSnapshot(args: { now: WatchInput[]; afterMidnight: WatchInput[]; growth: number; recentStickers: string[]; date: Date }): WatchSnapshot {
  const day = buildWatchDay(args.now, args.date);
  const placed = args.now.map((i) => i.goal).filter((g) => g.completedAt === null && g.lastPlacedAt !== null);
  const last = placed.reduce<Goal | null>((a, g) => (a === null || g.lastPlacedAt! > a.lastPlacedAt! ? g : a), null);
  return {
    v: 1,
    ...day,
    growth: args.growth,
    recentColors: args.recentStickers.map(blockColorOf),
    lastGoalId: last?.id ?? null,
    afterMidnight: buildWatchDay(args.afterMidnight, nextMidnight(args.date)),
  };
}
