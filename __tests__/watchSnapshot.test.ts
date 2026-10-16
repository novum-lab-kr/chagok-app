import type { Goal } from '../src/domain/types';
import { buildWatchDay, buildWatchSnapshot } from '../src/watch/snapshot';
import type { WatchInput } from '../src/watch/snapshot';
import { blockColorOf } from '../src/watch/blockColor';

const t = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 'g', name: '산책', boardType: 'calendar', totalSlots: null, defaultStickerId: 'sports_normal.walk',
  createdAt: t(2026, 10, 3), endDate: null, completedAt: null, completionSeen: false,
  lastPlacedAt: null, initialSlots: null, ...over,
});
const tally = (over: Partial<Goal> = {}) => goal({ id: 't', name: '독서', boardType: 'tally', totalSlots: 12, defaultStickerId: 'basic.book', ...over });
const input = (g: Goal, stickers: WatchInput['stickers'] = [], over: Partial<WatchInput> = {}): WatchInput =>
  ({ goal: g, stickers, placedAll: stickers.length, usableUntil: null, ...over });

describe('buildWatchDay: 적립판', () => {
  it('칸마다 지난날 붙임, 오늘 붙임, 빈칸과 기록 칸', () => {
    const now = new Date(t(2026, 10, 16));
    const view = buildWatchDay([input(tally(), [
      { slotIndex: 0, dateKey: '2026-10-15', recorded: true },
      { slotIndex: 1, dateKey: '2026-10-16', recorded: false },
    ])], now);
    const board = view.goals[0].board;
    if (board.type !== 'tally') throw new Error('tally');
    expect(board.cells.slice(0, 3)).toEqual(['placed', 'placedToday', 'empty']);
    expect(board.cells).toHaveLength(12);
    expect(board.recorded).toEqual([0]);
    expect(view.goals[0].remaining).toBe(10);
    expect(view.goals[0].color).toBe(blockColorOf('basic.book'));
  });
});

describe('buildWatchDay: 달력판', () => {
  it('이번 달 날짜별 상태, 시작 전은 outside, 앞날은 future', () => {
    const now = new Date(t(2026, 10, 16));
    const view = buildWatchDay([input(goal(), [
      { slotIndex: 4, dateKey: '2026-10-05', recorded: false },
      { slotIndex: 15, dateKey: '2026-10-16', recorded: true },
    ])], now);
    const board = view.goals[0].board;
    if (board.type !== 'calendar') throw new Error('calendar');
    expect(board).toMatchObject({ year: 2026, month: 10, firstWeekday: 4, startDate: '2026-10-03', endDate: null, recorded: [15] });
    expect(board.days).toHaveLength(31);
    expect(board.days[1]).toBe('outside');      // 10/2, 시작 전
    expect(board.days[3]).toBe('empty');        // 10/4, 지난 빈 날
    expect(board.days[4]).toBe('placed');       // 10/5
    expect(board.days[15]).toBe('placedToday'); // 10/16
    expect(board.days[16]).toBe('future');      // 10/17
    expect(view.goals[0].remaining).toBeNull(); // 종료일 없음
  });

  it('종료일 뒤는 outside, 남은 칸은 기간 기준', () => {
    const now = new Date(t(2026, 10, 16));
    const view = buildWatchDay([input(goal({ endDate: '2026-10-20' }), [], { placedAll: 3 })], now);
    const board = view.goals[0].board;
    if (board.type !== 'calendar') throw new Error('calendar');
    expect(board.days[20]).toBe('outside');   // 10/21
    expect(view.goals[0].remaining).toBe(15); // 10/3~10/20 = 18일 - 3
  });
});

describe('buildWatchDay: 목록', () => {
  it('완성한 판은 빼고, 마지막으로 붙인 순', () => {
    const now = new Date(t(2026, 10, 16));
    const view = buildWatchDay([
      input(goal({ id: 'a', lastPlacedAt: t(2026, 10, 10) })),
      input(goal({ id: 'b', lastPlacedAt: t(2026, 10, 15) })),
      input(goal({ id: 'c', completedAt: t(2026, 10, 14) })),
    ], now);
    expect(view.goals.map((g) => g.id)).toEqual(['b', 'a']);
  });

  it('체험이 끝난 기본 스티커면 locked', () => {
    const now = new Date(t(2026, 10, 16));
    expect(buildWatchDay([input(goal(), [], { usableUntil: t(2026, 10, 15) })], now).goals[0].locked).toBe(true);
    expect(buildWatchDay([input(goal(), [], { usableUntil: t(2026, 10, 17) })], now).goals[0].locked).toBe(false);
  });
});

describe('buildWatchSnapshot', () => {
  it('성장 수와 마지막으로 붙인 목표', () => {
    const date = new Date(t(2026, 10, 16, 23, 59));
    const a = goal({ id: 'a', lastPlacedAt: t(2026, 10, 10) });
    const b = tally({ id: 'b', lastPlacedAt: t(2026, 10, 16, 9) });
    const s = buildWatchSnapshot({
      now: [input(a), input(b)], afterMidnight: [input(a), input(b)],
      growth: 7, date,
    });
    expect(s).toMatchObject({ v: 1, today: '2026-10-16', growth: 7, lastGoalId: 'b' });
    expect(s.afterMidnight.today).toBe('2026-10-17');
  });

  it('처리한 요청 id를 담는다 — 워치가 아직 처리 안 된 요청에서 지운다 (워치 계획 2 Review Focus 1)', () => {
    const s = buildWatchSnapshot({ now: [input(goal())], afterMidnight: [input(goal())], growth: 0, handled: ['r1', 'r2'], date: new Date(t(2026, 10, 16)) });
    expect(s.handled).toEqual(['r1', 'r2']);
  });

  it('아무것도 붙이지 않았으면 lastGoalId는 null', () => {
    const s = buildWatchSnapshot({ now: [input(goal())], afterMidnight: [input(goal())], growth: 0, date: new Date(t(2026, 10, 16)) });
    expect(s.lastGoalId).toBeNull();
  });

  it('자정 뒤에는 오늘 붙인 칸이 지난 칸이 된다 (Review Focus 4)', () => {
    const date = new Date(t(2026, 10, 16, 23, 59));
    const stickers = [{ slotIndex: 0, dateKey: '2026-10-16', recorded: false }];
    const s = buildWatchSnapshot({ now: [input(tally(), stickers)], afterMidnight: [input(tally(), stickers)], growth: 1, date });
    const before = s.goals[0].board;
    const after = s.afterMidnight.goals[0].board;
    if (before.type !== 'tally' || after.type !== 'tally') throw new Error('tally');
    expect(before.cells[0]).toBe('placedToday');
    expect(after.cells[0]).toBe('placed');
  });

  it('10월 31일 자정 뒤는 11월 달력 (Review Focus 4)', () => {
    const date = new Date(t(2026, 10, 31, 23, 59));
    const s = buildWatchSnapshot({ now: [input(goal())], afterMidnight: [input(goal())], growth: 0, date });
    const after = s.afterMidnight.goals[0].board;
    if (after.type !== 'calendar') throw new Error('calendar');
    expect([after.year, after.month, after.days.length]).toEqual([2026, 11, 30]);
    expect(after.days[0]).toBe('empty'); // 11/1 = 그날 오늘, 빈칸
  });
});
