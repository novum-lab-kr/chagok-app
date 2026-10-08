import {
  localDateKey, dayAfter, daysInclusive, startOfDayAfter, daysInMonth, monthKeyOf,
} from '../src/domain/dates';
import {
  startDate, isCompleted, isPeriodOver, periodEndAt, progressBasis, progressOf, inPeriod,
  canPlace, completesBoard, needsRemoveConfirm, isDateEnabled, monthNav, placedAtFor,
  endDateFloor, extendEndDateFloor, defaultExtraSlots, nextEmptySlot, orderGoals, pendingCompletion, parseSlotCount,
  GOAL_NAME_MAX, MEMO_MAX, goalNameError, memoError, shownGoalNameError,
} from '../src/domain/board';
import type { Goal, Sticker } from '../src/domain/types';

/** 로컬 시각. 테스트가 어느 시간대에서 돌아도 같은 날짜가 된다. */
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const NOW = new Date(2026, 8, 29, 10); // 2026-09-29 10:00

const base: Goal = {
  id: 'g', name: '목표', boardType: 'tally', totalSlots: 15, defaultStickerId: 'sprout',
  createdAt: at(2026, 9, 10), endDate: null, completedAt: null, completionSeen: false,
  lastPlacedAt: null, initialSlots: 15,
};
const tally = (over: Partial<Goal> = {}): Goal => ({ ...base, ...over });
const calendar = (over: Partial<Goal> = {}): Goal =>
  ({ ...base, boardType: 'calendar', totalSlots: null, initialSlots: null, ...over });
const stk = (slotIndex: number, placedAt = at(2026, 9, 20)): Sticker =>
  ({ id: `s${slotIndex}-${placedAt}`, goalId: 'g', placedAt, slotIndex, stickerType: 'sprout' });
const onDay = (d: number, m = 9) => stk(d - 1, at(2026, m, d));

describe('dates', () => {
  it('localDateKey는 로컬 날짜다. 자정 직전도 그날이다', () => {
    expect(localDateKey(at(2026, 9, 21, 23, 59))).toBe('2026-09-21');
    expect(localDateKey(at(2026, 1, 5, 0, 0))).toBe('2026-01-05');
  });
  it('dayAfter는 월말·연말을 넘긴다', () => {
    expect(dayAfter('2026-09-30')).toBe('2026-10-01');
    expect(dayAfter('2026-12-31')).toBe('2027-01-01');
    expect(dayAfter('2028-02-28')).toBe('2028-02-29');
  });
  it('daysInclusive는 양 끝을 모두 센다', () => {
    expect(daysInclusive('2026-09-10', '2026-09-10')).toBe(1);
    expect(daysInclusive('2026-09-10', '2026-10-31')).toBe(52);
  });
  it('startOfDayAfter는 다음 날 0시(로컬)다', () => {
    expect(startOfDayAfter('2026-09-23')).toBe(new Date(2026, 8, 24).getTime());
  });
  it('daysInMonth는 윤년 2월을 29일로 센다', () => {
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 9)).toBe(30);
  });
  it('monthKeyOf', () => {
    expect(monthKeyOf(2026, 9)).toBe('2026-09');
  });
});

describe('완성 상태', () => {
  it('completedAt이 있으면 완성이다', () => {
    expect(isCompleted(tally())).toBe(false);
    expect(isCompleted(tally({ completedAt: 1 }))).toBe(true);
  });
  it('종료일 다음 날부터 기간이 지난 것이다. 종료일 당일은 아니다', () => {
    const g = calendar({ endDate: '2026-09-29' });
    expect(isPeriodOver(g, NOW)).toBe(false);
    expect(isPeriodOver(g, new Date(2026, 8, 30, 0, 0))).toBe(true);
    expect(isPeriodOver(calendar(), NOW)).toBe(false);
    expect(isPeriodOver(tally({ endDate: '2026-01-01' }), NOW)).toBe(false);
  });
  it('periodEndAt은 종료일 다음 날 0시다', () => {
    expect(periodEndAt('2026-09-23')).toBe(new Date(2026, 8, 24).getTime());
  });
  it('완성 흐름을 보여줄 판: 완성했고 아직 닫기/계속하기를 고르지 않았다', () => {
    expect(pendingCompletion(tally({ completedAt: 1 }))).toBe(true);
    expect(pendingCompletion(tally({ completedAt: 1, completionSeen: true }))).toBe(false);
    expect(pendingCompletion(tally())).toBe(false);
  });
});

describe('진행률 (PRD 4.1, 4.3)', () => {
  it('적립판: 붙은 칸 / 칸 수, 내림', () => {
    const g = tally({ totalSlots: 15 });
    expect(progressBasis(g, NOW)).toEqual({ kind: 'all' });
    expect(progressOf(g, 6, NOW)).toEqual({ value: 6, total: 15, percent: 40 });
    expect(progressOf(g, 14, NOW).percent).toBe(93);
  });
  it('기간 달력판: 붙은 날 / 시작일–종료일 날 수', () => {
    const g = calendar({ createdAt: at(2026, 9, 10, 22), endDate: '2026-10-31' });
    expect(startDate(g)).toBe('2026-09-10');
    expect(progressOf(g, 9, NOW)).toEqual({ value: 9, total: 52, percent: 17 });
  });
  it('기간 없는 달력판: 이번 달 기준', () => {
    const g = calendar();
    expect(progressBasis(g, NOW)).toEqual({ kind: 'month', year: 2026, month: 9, current: true });
    expect(progressOf(g, 9, NOW)).toEqual({ value: 9, total: 30, percent: 30 });
  });
  it('기간 없는 달력판을 완성했으면 완성한 달 기준이다', () => {
    const g = calendar({ completedAt: at(2026, 8, 31) });
    expect(progressBasis(g, NOW)).toEqual({ kind: 'month', year: 2026, month: 8, current: false });
    expect(progressOf(g, 31, NOW).total).toBe(31);
  });
});

describe('기간', () => {
  const g = calendar({ createdAt: at(2026, 9, 10), endDate: '2026-09-23' });
  it('시작일부터 종료일까지가 기간이다', () => {
    expect(inPeriod(g, '2026-09-09')).toBe(false);
    expect(inPeriod(g, '2026-09-10')).toBe(true);
    expect(inPeriod(g, '2026-09-23')).toBe(true);
    expect(inPeriod(g, '2026-09-24')).toBe(false);
    expect(inPeriod(calendar({ createdAt: at(2026, 9, 10) }), '2030-01-01')).toBe(true);
  });
  it('기간 안 날짜를 누를 수 있다. 완성한 판도 같다 (2026-10-08)', () => {
    expect(isDateEnabled(g, '2026-09-24', false)).toBe(false);
    expect(isDateEnabled(g, '2026-09-15', false)).toBe(true);
    const done = { ...g, completedAt: at(2026, 9, 24, 0) };
    expect(isDateEnabled(done, '2026-09-15', false)).toBe(true);
    expect(isDateEnabled(done, '2026-09-24', false)).toBe(false);
  });
  it('종료일 없는 판은 완성한 날까지가 기간이다', () => {
    const done = calendar({ createdAt: at(2026, 9, 10), completedAt: at(2026, 9, 25, 21) });
    expect(isDateEnabled(done, '2026-09-25', false)).toBe(true);
    expect(isDateEnabled(done, '2026-09-26', false)).toBe(false);
    expect(isDateEnabled(done, '2026-09-26', true)).toBe(true); // 붙은 날은 기록을 열 수 있다
  });
  it('시작한 달에서는 이전 달, 종료일이 있는 달에서는 다음 달로 가지 않는다', () => {
    expect(monthNav(g, 2026, 9)).toEqual({ canGoPrev: false, canGoNext: false });
    const long = calendar({ createdAt: at(2026, 9, 10), endDate: '2026-11-02' });
    expect(monthNav(long, 2026, 10)).toEqual({ canGoPrev: true, canGoNext: true });
    expect(monthNav(long, 2026, 11)).toEqual({ canGoPrev: true, canGoNext: false });
  });
  it('기간 없는 달력판은 미래 달로 계속 간다', () => {
    expect(monthNav(calendar(), 2027, 5)).toEqual({ canGoPrev: true, canGoNext: true });
  });
  it('목표 설정의 종료일 하한: 마지막으로 붙인 날 다음 날, 없으면 시작일 다음 날', () => {
    expect(endDateFloor(calendar({ createdAt: at(2026, 9, 10) }))).toBe('2026-09-11');
    expect(endDateFloor(calendar({ createdAt: at(2026, 9, 10), lastPlacedAt: at(2026, 9, 28, 23) }))).toBe('2026-09-29');
  });
  it('종료일 늘리기의 하한: 오늘과 기존 종료일 다음 날 중 늦은 날', () => {
    expect(extendEndDateFloor(calendar({ endDate: '2026-09-23' }), NOW)).toBe('2026-09-29');
    expect(extendEndDateFloor(calendar({ endDate: '2026-10-05' }), NOW)).toBe('2026-10-06');
  });
});

describe('붙이기 (PRD 4.2, 4.3)', () => {
  it('적립판은 범위 안의 어느 빈칸에든 붙인다', () => {
    const g = tally({ totalSlots: 5 });
    const placed = [stk(0), stk(3)];
    expect(canPlace(g, placed, { slot: 2 }, NOW)).toBe(true);
    expect(canPlace(g, placed, { slot: 3 }, NOW)).toBe(false);
    expect(canPlace(g, placed, { slot: 5 }, NOW)).toBe(false);
    expect(canPlace(g, placed, { slot: -1 }, NOW)).toBe(false);
  });
  it('100칸이 넘는 적립판도 붙인다 (상한 없음)', () => {
    expect(canPlace(tally({ totalSlots: 300 }), [], { slot: 250 }, NOW)).toBe(true);
  });
  it('달력판은 시작일부터 오늘까지, 기간 안에서, 하루 한 번 붙인다 (2026-10-08)', () => {
    const g = calendar({ createdAt: at(2026, 9, 10) });
    expect(canPlace(g, [], { date: '2026-09-29' }, NOW)).toBe(true);
    expect(canPlace(g, [], { date: '2026-09-28' }, NOW)).toBe(true);
    expect(canPlace(g, [], { date: '2026-09-10' }, NOW)).toBe(true);
    expect(canPlace(g, [], { date: '2026-09-09' }, NOW)).toBe(false);
    expect(canPlace(g, [], { date: '2026-09-30' }, NOW)).toBe(false);
    expect(canPlace(g, [onDay(28)], { date: '2026-09-28' }, NOW)).toBe(false);
    expect(canPlace(g, [onDay(29)], { date: '2026-09-29' }, NOW)).toBe(false);
    expect(canPlace(calendar({ createdAt: at(2026, 9, 10), endDate: '2026-09-28' }), [], { date: '2026-09-29' }, NOW)).toBe(false);
  });
  it('달력판에 적립판 칸을, 적립판에 날짜를 주면 거부한다', () => {
    expect(canPlace(calendar(), [], { slot: 0 }, NOW)).toBe(false);
    expect(canPlace(tally(), [], { date: '2026-09-29' }, NOW)).toBe(false);
  });
  it('완성한 판에도 붙인다 — 종료일 없는 판은 완성한 날까지 (2026-10-08)', () => {
    expect(canPlace(tally({ completedAt: 1 }), [], { slot: 0 }, NOW)).toBe(true);
    expect(canPlace(calendar({ createdAt: at(2026, 9, 10), endDate: '2026-09-23', completedAt: at(2026, 9, 24, 0) }), [], { date: '2026-09-20' }, NOW)).toBe(true);
    const manual = calendar({ createdAt: at(2026, 9, 10), completedAt: at(2026, 9, 25, 21) });
    expect(canPlace(manual, [], { date: '2026-09-24' }, NOW)).toBe(true);
    expect(canPlace(manual, [], { date: '2026-09-26' }, NOW)).toBe(false);
  });
  it('지난 날짜에 붙이면 그 날짜에 지금 시·분으로 둔다 (스티커 날짜는 붙인 시각에서 정해진다)', () => {
    expect(placedAtFor('2026-09-29', NOW.getTime())).toBe(NOW.getTime());
    expect(placedAtFor('2026-09-20', NOW.getTime())).toBe(at(2026, 9, 20, 10));
  });
  it('다음 빈칸은 번호가 가장 작은 빈칸이다', () => {
    expect(nextEmptySlot(tally({ totalSlots: 3 }), [stk(0), stk(2)])).toBe(1);
    expect(nextEmptySlot(tally({ totalSlots: 2 }), [stk(0), stk(1)])).toBeNull();
  });
});

describe('마지막 칸 확인 (PRD 4.7)', () => {
  it('적립판: 이번에 붙이면 다 찬다', () => {
    expect(completesBoard(tally({ totalSlots: 15 }), 14)).toBe(true);
    expect(completesBoard(tally({ totalSlots: 15 }), 13)).toBe(false);
  });
  it('기간 달력판: 이번에 붙이면 기간 안의 날을 다 채운다', () => {
    const g = calendar({ createdAt: at(2026, 9, 27), endDate: '2026-09-29' });
    expect(completesBoard(g, 2)).toBe(true);
    expect(completesBoard(g, 1)).toBe(false);
  });
  it('기간 없는 달력판은 붙여서 완성되지 않는다', () => {
    expect(completesBoard(calendar(), 1000)).toBe(false);
  });
});

describe('떼기 (PRD 4.5, 4.7)', () => {
  it('기록이 있을 때만 확인한다 — 지난 날도 다시 붙일 수 있다 (2026-10-08)', () => {
    expect(needsRemoveConfirm(true)).toBe(true);
    expect(needsRemoveConfirm(false)).toBe(false);
  });
});

describe('칸 늘리기 (2026-09-30)', () => {
  it('기본값은 처음 만든 칸 수다', () => {
    expect(defaultExtraSlots(tally({ totalSlots: 30, initialSlots: 15 }))).toBe(15);
  });
  it('처음 칸 수를 모르면 지금 칸 수를 쓴다', () => {
    expect(defaultExtraSlots(tally({ totalSlots: 30, initialSlots: null }))).toBe(30);
  });
});

describe('목록 정렬 (PRD 4.1)', () => {
  it('내 목표는 마지막으로 붙인 시각(없으면 만든 시각) 최근순, 완성한 판은 완성 시각 최근순', () => {
    const goals = [
      tally({ id: 'old-placed', createdAt: 1, lastPlacedAt: 50 }),
      tally({ id: 'new-empty', createdAt: 60 }),
      tally({ id: 'recent', createdAt: 2, lastPlacedAt: 100 }),
      tally({ id: 'done-early', completedAt: 10 }),
      tally({ id: 'done-late', completedAt: 20 }),
    ];
    const { active, completed } = orderGoals(goals);
    expect(active.map((g) => g.id)).toEqual(['recent', 'new-empty', 'old-placed']);
    expect(completed.map((g) => g.id)).toEqual(['done-late', 'done-early']);
  });
});

describe('목표 설정 칸 수 입력 (2026-09-30)', () => {
  it('지금 칸 수 이상의 정수만 받는다', () => {
    expect(parseSlotCount('45', 30)).toEqual({ ok: true, value: 45 });
    expect(parseSlotCount('30', 30)).toEqual({ ok: true, value: 30 });
    expect(parseSlotCount('030', 30)).toEqual({ ok: true, value: 30 });
  });
  it('줄이는 값은 이유와 함께 거부한다', () => {
    expect(parseSlotCount('15', 30)).toEqual({ ok: false, reason: '지금 30칸보다 줄일 수 없어요.' });
  });
  it('빈칸·숫자가 아닌 값·0은 거부한다', () => {
    expect(parseSlotCount('', 30)).toEqual({ ok: false, reason: '칸 수를 입력해 주세요.' });
    expect(parseSlotCount('3.5', 30)).toEqual({ ok: false, reason: '숫자만 입력할 수 있어요.' });
    expect(parseSlotCount('abc', 30)).toEqual({ ok: false, reason: '숫자만 입력할 수 있어요.' });
    expect(parseSlotCount('0', 0)).toEqual({ ok: false, reason: '1칸 이상이어야 해요.' });
  });
});

describe('입력 글자 수 (2026-10-08)', () => {
  test('목표 이름: 비었거나 띄어쓰기만 있으면 입력해 달라고 한다', () => {
    expect(goalNameError('')).toBe('목표 이름을 입력해주세요.');
    expect(goalNameError('   ')).toBe('목표 이름을 입력해주세요.');
  });
  test('목표 이름: 20자에 닿으면 한도를 알린다', () => {
    expect(GOAL_NAME_MAX).toBe(20);
    expect(goalNameError('가'.repeat(19))).toBeUndefined();
    expect(goalNameError('가'.repeat(20))).toBe('20자까지 입력할 수 있어요.');
  });
  test('메모: 비어도 괜찮고 500자에 닿으면 한도를 알린다', () => {
    expect(MEMO_MAX).toBe(500);
    expect(memoError('')).toBeUndefined();
    expect(memoError('가'.repeat(499))).toBeUndefined();
    expect(memoError('가'.repeat(500))).toBe('500자까지 입력할 수 있어요.');
  });
  test('새 목표: 처음 연 빈 칸에는 문구가 없고, 건드린 뒤 비면 보인다', () => {
    expect(shownGoalNameError('', false)).toBeUndefined();
    expect(shownGoalNameError('', true)).toBe('목표 이름을 입력해주세요.');
    expect(shownGoalNameError('   ', false)).toBe('목표 이름을 입력해주세요.');
    expect(shownGoalNameError('책 읽기', false)).toBeUndefined();
  });
  test('한도를 넘은 이름(예전에 저장된 값)도 한도 문구를 보인다', () => {
    expect(goalNameError('가'.repeat(25))).toBe('20자까지 입력할 수 있어요.');
    expect(shownGoalNameError('가'.repeat(25), false)).toBe('20자까지 입력할 수 있어요.');
  });
});
