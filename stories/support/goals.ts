import type {CalendarBoardView, GoalCardItem, TallyBoardView} from '../../src/design-system';
import {goalCard, percentLabel, toPocketGoal} from '../../src/app-data/pocketAdapter';
import {isCompleted, isDateEnabled, monthNav, progressBasis, progressOf} from '../../src/domain/board';
import {dateKeyOf, localDateKey, monthKeyOf} from '../../src/domain/dates';
import type {Goal, Sticker} from '../../src/domain/types';

/**
 * 스토리 예시 목표. 앱과 같은 도메인 모양(Goal·Sticker)으로 두고, 화면 값(진행률·문구·누를 수 있는 날)은
 * 앱이 쓰는 함수(src/domain/board, src/app-data/pocketAdapter)로 만든다 — 규칙이 바뀌면 스토리도 같이 바뀐다.
 */
export const NOW = new Date(2026, 8, 29, 12, 0);
export const TODAY = localDateKey(NOW.getTime());
const at = (month: number, day: number, hour = 9) => new Date(2026, month - 1, day, hour).getTime();

type Fields = Pick<Goal, 'id' | 'name' | 'defaultStickerId' | 'createdAt'> & Partial<Goal>;
const base = {totalSlots: null, endDate: null, completedAt: null, completionSeen: true, lastPlacedAt: null, initialSlots: null};
const tally = (g: Fields & {totalSlots: number}): Goal => ({...base, boardType: 'tally', initialSlots: g.totalSlots, ...g});
const calendar = (g: Fields): Goal => ({...base, boardType: 'calendar', ...g});

export const goals = {
  reading: tally({id: 'reading', name: '책 읽기', defaultStickerId: 'basic.sprout', totalSlots: 15, createdAt: at(8, 20), lastPlacedAt: at(9, 29, 8)}),
  walk: calendar({id: 'walk', name: '매일 저녁 동네 한 바퀴 걷기', defaultStickerId: 'basic.shoe', createdAt: at(9, 1), lastPlacedAt: at(9, 28, 21)}),
  water: calendar({id: 'water', name: '물 여덟 잔 마시기', defaultStickerId: 'basic.flower', createdAt: at(9, 10, 22), endDate: '2026-10-31', lastPlacedAt: at(9, 29, 7)}),
  stretch: tally({id: 'stretch', name: '자기 전 스트레칭 십 분', defaultStickerId: 'basic.star', totalSlots: 20, createdAt: at(9, 5, 23), lastPlacedAt: at(9, 29, 8), completedAt: at(9, 29, 8)}),
  vitamin: calendar({id: 'vitamin', name: '영양제 챙겨 먹기', defaultStickerId: 'basic.star', createdAt: at(9, 1, 8), endDate: '2026-09-23', lastPlacedAt: at(9, 22, 8), completedAt: at(9, 24, 0)}),
} satisfies Record<string, Goal>;
export type GoalKey = keyof typeof goals;

function sticker(goal: Goal, slotIndex: number, dateKey: string): Sticker {
  return {id: `${goal.id}-${slotIndex}`, goalId: goal.id, placedAt: NOW.getTime(), slotIndex, stickerType: goal.defaultStickerId, dateKey, tzOffsetMin: 540};
}
/** 적립판: 앞에서부터 count칸 */
export const slots = (goal: Goal, count: number): Sticker[] => Array.from({length: count}, (_, i) => sticker(goal, i, TODAY));
/** 달력판: 9월의 날짜 */
const days = (goal: Goal, list: number[]): Sticker[] => list.map(day => sticker(goal, day - 1, dateKeyOf(2026, 9, day)));

export const stickersOf: Record<GoalKey, Sticker[]> = {
  reading: slots(goals.reading, 6),
  walk: days(goals.walk, [2, 4, 7, 10, 14, 17, 20, 23, 28]),
  water: days(goals.water, [10, 12, 15, 16, 19, 22, 25, 26, 29]),
  stretch: slots(goals.stretch, 20),
  vitamin: days(goals.vitamin, [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 13, 14, 15, 16, 18, 19, 21, 22]),
};

/** 진행률 기준 안의 수 (앱은 src/app-data/boardData.ts가 DB에서 센다). */
function placedInBasis(goal: Goal, stickers: readonly Sticker[]) {
  const basis = progressBasis(goal, NOW);
  return basis.kind === 'all' ? stickers.length : stickers.filter(s => s.dateKey.startsWith(monthKeyOf(basis.year, basis.month))).length;
}

/** 목록 카드. 앱 목표 탭과 같은 goalCard. */
export const cardOf = (goal: Goal, stickers: readonly Sticker[]): GoalCardItem =>
  goalCard({goal, placedAll: stickers.length, placedInBasis: placedInBasis(goal, stickers)}, NOW);
export const cardFor = (key: GoalKey) => cardOf(goals[key], stickersOf[key]);

/** 판 상세(BoardDetailScreen) 값. 앱 app/goal/[id]/index.tsx와 같은 함수로 만든다. 누르는 동작은 비운다. */
export function boardOf(goal: Goal, stickers: readonly Sticker[], {recorded}: {/** 사진·메모가 있는 칸 번호(1부터) */recorded?: ReadonlySet<number>} = {}) {
  const noop = () => {};
  const pocket = toPocketGoal(goal, stickers);
  const done = isCompleted(goal);
  const placed = placedInBasis(goal, stickers);
  const progress = progressOf(goal, placed, NOW);
  const year = 2026, month = 9;
  const board: TallyBoardView | CalendarBoardView = goal.boardType === 'tally'
    ? {kind: 'tally', total: goal.totalSlots ?? 0, filled: pocket.filledStickers ?? {}, recorded, onPress: noop, onOpenRecord: noop}
    : {kind: 'calendar', year, month, records: pocket.calendarRecords, selectedDate: done ? undefined : TODAY,
      isDateEnabled: date => isDateEnabled(goal, date, Boolean(pocket.calendarRecords[date])), ...monthNav(goal, year, month),
      onSelect: noop, onMonthChange: noop, onOpenRecord: noop};
  return {name: goal.name, sticker: pocket.sticker, completed: done, board,
    progress: {value: progress.value, total: progress.total, percentLabel: percentLabel(goal, placed, NOW)}};
}
