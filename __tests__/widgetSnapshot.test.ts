import { buildWidgetSnapshot } from '../src/widgets/snapshot';
import type { WidgetInput } from '../src/widgets/snapshot';
import type { Goal } from '../src/domain/types';

const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min);
const goal = (over: Partial<Goal>): Goal => ({
  id: 'g', name: '산책', boardType: 'calendar', totalSlots: null, defaultStickerId: 'sprout',
  createdAt: at(2026, 9, 1).getTime(), endDate: null, completedAt: null, completionSeen: false,
  lastPlacedAt: null, initialSlots: null, ...over,
});
const cal = (over: Partial<WidgetInput> = {}): WidgetInput =>
  ({ goal: goal({}), placedAll: 0, placedDates: [], slotIndexes: [], ...over });

describe('위젯 스냅샷 · 달력판', () => {
  it('붙인 날, 지난 빈 날, 오늘과 앞으로, 기간 밖을 나눈다', () => {
    const input = cal({ goal: goal({ createdAt: at(2026, 9, 3).getTime() }), placedDates: ['2026-09-03', '2026-09-05'], placedAll: 2 });
    const mini = buildWidgetSnapshot([input], at(2026, 9, 6)).goals[0].mini;
    if (mini.type !== 'calendar') throw new Error('calendar expected');
    expect(mini.days.slice(0, 7)).toEqual(['outside', 'outside', 'filled', 'missed', 'filled', 'future', 'future']);
    expect(mini.days).toHaveLength(30);
    expect(mini.firstWeekday).toBe(new Date(2026, 8, 1).getDay());
  });

  it('오늘 빈칸은 00:00에도 23:59에도 future다 (Review Focus 4)', () => {
    for (const now of [at(2026, 9, 6, 0, 0), at(2026, 9, 6, 23, 59)]) {
      const mini = buildWidgetSnapshot([cal()], now).goals[0].mini;
      if (mini.type !== 'calendar') throw new Error('calendar expected');
      expect(mini.days[5]).toBe('future');
      expect(mini.days[4]).toBe('missed');
    }
  });

  it('종료일 없는 달력판은 이번 달 기준 문구, 다음 달 0시에는 0%', () => {
    const input = cal({ placedDates: ['2026-09-29', '2026-09-30'], placedAll: 2 });
    expect(buildWidgetSnapshot([input], at(2026, 9, 30)).goals[0].progressLabel).toBe('이번 달 6%');
    const next = buildWidgetSnapshot([input], at(2026, 10, 1, 0, 0)).goals[0];
    expect(next.progressLabel).toBe('이번 달 0%');
    if (next.mini.type !== 'calendar') throw new Error('calendar expected');
    expect(next.mini.month).toBe(10);
    expect(next.mini.days.every((d) => d === 'future')).toBe(true);
  });

  it('종료일 있는 달력판은 전체 기준이고 종료일 뒤는 기간 밖이다', () => {
    const input = cal({ goal: goal({ endDate: '2026-09-10' }), placedAll: 5 });
    const g = buildWidgetSnapshot([input], at(2026, 9, 6)).goals[0];
    expect(g.progressLabel).toBe('50%');
    if (g.mini.type !== 'calendar') throw new Error('calendar expected');
    expect(g.mini.days[10]).toBe('outside');
  });
});

describe('위젯 스냅샷 · 적립판 묶음 (Review Focus 5)', () => {
  const tally = (total: number, slotIndexes: number[]): WidgetInput => ({
    goal: goal({ boardType: 'tally', totalSlots: total, initialSlots: total }), placedAll: slotIndexes.length, placedDates: [], slotIndexes,
  });
  const range = (n: number, from = 0) => Array.from({ length: n }, (_, i) => i + from);

  it('다음 빈칸이 든 묶음을 보여준다', () => {
    const mini = buildWidgetSnapshot([tally(100, range(45))], at(2026, 9, 6)).goals[0].mini;
    expect(mini).toMatchObject({ type: 'tally', from: 41, placed: 45, total: 100 });
    if (mini.type !== 'tally') throw new Error('tally expected');
    expect(mini.cells).toHaveLength(10);
    expect(mini.cells.slice(3, 6)).toEqual(['filled', 'filled', 'empty']);
  });
  it('마지막 묶음은 남은 칸만큼만', () => {
    const mini = buildWidgetSnapshot([tally(35, range(31))], at(2026, 9, 6)).goals[0].mini;
    expect(mini).toMatchObject({ from: 31 });
    if (mini.type !== 'tally') throw new Error('tally expected');
    expect(mini.cells).toEqual(['filled', 'empty', 'empty', 'empty', 'empty']);
  });
  it('중간 칸을 뗐으면 가장 앞 빈칸의 묶음이다', () => {
    const mini = buildWidgetSnapshot([tally(60, [0, 1, 3, ...range(40, 4)])], at(2026, 9, 6)).goals[0].mini;
    expect(mini).toMatchObject({ from: 1 });
  });
  it('빈칸이 없으면 마지막 묶음', () => {
    const mini = buildWidgetSnapshot([tally(60, range(60))], at(2026, 9, 6)).goals[0].mini;
    expect(mini).toMatchObject({ from: 51 });
  });
});

describe('위젯 스냅샷 · 목록', () => {
  it('완성한 판은 빼고, 기본 목표는 가장 최근에 붙인 목표다', () => {
    const a = cal({ goal: goal({ id: 'a', lastPlacedAt: at(2026, 9, 2).getTime() }) });
    const b = cal({ goal: goal({ id: 'b', lastPlacedAt: at(2026, 9, 5).getTime() }) });
    const done = cal({ goal: goal({ id: 'c', completedAt: at(2026, 9, 5).getTime(), lastPlacedAt: at(2026, 9, 6).getTime() }) });
    const snap = buildWidgetSnapshot([a, b, done], at(2026, 9, 6));
    expect(snap.goals.map((g) => g.id)).toEqual(['b', 'a']);
    expect(snap.defaultGoalId).toBe('b');
  });
  it('목표가 없으면 빈 목록과 null', () => {
    expect(buildWidgetSnapshot([], at(2026, 9, 6))).toEqual({ today: '2026-09-06', goals: [], defaultGoalId: null });
  });
  it('목록 카드와 같은 문구 함수를 쓴다', () => {
    const snap = buildWidgetSnapshot([cal({ goal: goal({ boardType: 'tally', totalSlots: 10 }), placedAll: 4 })], at(2026, 9, 6));
    expect(snap.goals[0]).toMatchObject({ kind: '적립판', progressLabel: '40%', percent: 40, sticker: 'sprout' });
  });
});

describe('위젯 스냅샷 · 위젯이 판단할 값', () => {
  const tallyInput = (totalSlots: number, placed: number): WidgetInput => ({
    goal: goal({ boardType: 'tally', totalSlots }), placedAll: placed, placedDates: [], slotIndexes: [...Array(placed).keys()],
  });

  it('오늘 붙였고 기록이 없으면 다시 눌러 뗄 수 있다', () => {
    const input = cal({ placedDates: ['2026-09-06'], placedAll: 1, todaySticker: { dateKey: '2026-09-06', hasRecord: false } });
    expect(buildWidgetSnapshot([input], at(2026, 9, 6)).goals[0]).toMatchObject({ placedToday: true, undoable: true });
  });

  it('기록이 있으면 뗄 수 없다 (Review Focus 6)', () => {
    const input = cal({ placedDates: ['2026-09-06'], placedAll: 1, todaySticker: { dateKey: '2026-09-06', hasRecord: true } });
    expect(buildWidgetSnapshot([input], at(2026, 9, 6)).goals[0]).toMatchObject({ placedToday: true, undoable: false });
  });

  it('적립판은 오늘 붙인 칸과 그중 위젯에서 뗄 수 있는 칸을 준다 (2026-10-07)', () => {
    const input = { ...tallyInput(10, 3), todaySlots: { dateKey: '2026-09-06', slots: [1, 2], removable: [2] } };
    expect(buildWidgetSnapshot([input], at(2026, 9, 6)).goals[0]).toMatchObject({ todaySlots: [1, 2], removableSlots: [2] });
    expect(buildWidgetSnapshot([input], at(2026, 9, 7, 0, 0)).goals[0]).toMatchObject({ todaySlots: [], removableSlots: [] });
    expect(buildWidgetSnapshot([tallyInput(10, 3)], at(2026, 9, 6)).goals[0]).toMatchObject({ todaySlots: [], removableSlots: [] });
  });

  it('자정 타임라인에서는 어제 붙인 것을 오늘 붙임으로 보지 않는다', () => {
    const input = cal({ placedDates: ['2026-09-06'], placedAll: 1, todaySticker: { dateKey: '2026-09-06', hasRecord: false } });
    expect(buildWidgetSnapshot([input], at(2026, 9, 7, 0, 0)).goals[0]).toMatchObject({ placedToday: false, undoable: false });
  });

  it('완성까지 남은 칸 수를 준다 (종료일 없는 달력판은 null)', () => {
    expect(buildWidgetSnapshot([tallyInput(3, 2)], at(2026, 9, 6)).goals[0].remaining).toBe(1);
    const ended = cal({ goal: goal({ endDate: '2026-09-10' }), placedAll: 5 });
    expect(buildWidgetSnapshot([ended], at(2026, 9, 6)).goals[0].remaining).toBe(5); // 9/1~9/10 10일 - 5
    expect(buildWidgetSnapshot([cal()], at(2026, 9, 6)).goals[0].remaining).toBeNull();
  });

  it('적립판은 다음 빈칸이 든 10칸 묶음을 보여 준다', () => {
    const mini = buildWidgetSnapshot([tallyInput(25, 12)], at(2026, 9, 6)).goals[0].mini;
    expect(mini).toMatchObject({ type: 'tally', from: 11, placed: 12, total: 25 });
    if (mini.type === 'tally') expect(mini.cells).toHaveLength(10);
  });

  it('진행 수(placed/total)를 함께 준다', () => {
    expect(buildWidgetSnapshot([tallyInput(20, 5)], at(2026, 9, 6)).goals[0]).toMatchObject({ placed: 5, total: 20, percent: 25 });
  });
});
