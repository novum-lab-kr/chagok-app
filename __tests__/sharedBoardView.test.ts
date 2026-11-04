import { canPlaceOn, friendBoardsOf, memberBadgesOf, memberRowsOf, oneBoardCells, oneBoardDay, oneBoardShown, placeCompletes, placedWhen } from '../src/app-data/sharedBoardView';
import type { Goal, GoalMember, Sticker } from '../src/domain/types';

const at = (day: number, hour = 9, minute = 0) => new Date(2026, 8, day, hour, minute).getTime();
const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 'g', mode: 'one', role: 'member', name: '걷기', boardType: 'tally', totalSlots: 10, initialSlots: 10, defaultStickerId: 'basic.shoe',
  createdAt: at(1), endDate: null, completedAt: null, completionSeen: true, lastPlacedAt: null, sortOrder: null, ...over,
});
const member = (userId: string, name: string, joinedAt: number, stickerId = 'basic.star'): GoalMember => ({
  goalId: 'g', userId, isMe: userId === 'me', role: userId === 'u-owner' ? 'owner' : 'member', displayName: name, stickerId, joinedAt,
});
const sticker = (id: string, placedBy: string, slotIndex: number, placedAt: number, stickerType = 'basic.flower'): Sticker => ({
  id, goalId: 'g', placedAt, slotIndex, stickerType, dateKey: `2026-09-${String(new Date(placedAt).getDate()).padStart(2, '0')}`,
  tzOffsetMin: 540, boardUserId: null, placedBy,
});
const MEMBERS = [member('u-owner', '은주', at(1), 'basic.shoe'), member('me', '소라', at(3), 'basic.sprout'), member('u-min', '민', at(5), 'basic.cat')];

describe('friendBoardsOf (각자 판 친구 줄)', () => {
  it('친구 판에 나는 없고 들어온 순서다', () => {
    const friends = friendBoardsOf(goal({ mode: 'each' }), MEMBERS, {}, '2026-09-29');
    expect(friends.map((f) => [f.id, f.name, f.sticker])).toEqual([['u-owner', '은주', 'basic.shoe'], ['u-min', '민', 'basic.cat']]);
  });

  it('적립판 filled는 칸 번호(1부터)이고 칸 수는 목표 칸 수다', () => {
    const [first] = friendBoardsOf(goal({ mode: 'each' }), MEMBERS, { 'u-owner': [sticker('a', 'u-owner', 0, at(2)), sticker('b', 'u-owner', 4, at(3))] }, '2026-09-29');
    expect(first.board).toEqual({ kind: 'tally', total: 10, filled: new Set([1, 5]) });
  });

  it('달력판 start는 그 사람이 들어온 날, dates는 붙인 날이다', () => {
    const friends = friendBoardsOf(goal({ mode: 'each', boardType: 'calendar', totalSlots: null }), MEMBERS, { 'u-min': [sticker('a', 'u-min', 6, at(7))] }, '2026-09-29');
    expect(friends[1].board).toEqual({ kind: 'calendar', today: '2026-09-29', start: '2026-09-05', dates: new Set(['2026-09-07']) });
  });

  it('스티커를 고르지 않은 사람은 목표 기본 스티커로 그린다', () => {
    const [first] = friendBoardsOf(goal({ mode: 'each' }), [{ ...MEMBERS[0], stickerId: null }], {}, '2026-09-29');
    expect(first.sticker).toBe('basic.shoe');
  });
});

describe('memberRowsOf (목표 설정 함께하는 사람)', () => {
  it('들어온 순서 그대로, 나는 me, 만든 사람은 owner', () => {
    expect(memberRowsOf(goal(), MEMBERS)).toEqual([
      { id: 'u-owner', name: '은주', sticker: 'basic.shoe', owner: true },
      { id: 'me', name: '소라', sticker: 'basic.sprout', me: true },
      { id: 'u-min', name: '민', sticker: 'basic.cat' },
    ]);
  });
});

describe('memberBadgesOf (한 판 사람 줄)', () => {
  it('들어온 순서 그대로, 나만 me', () => {
    expect(memberBadgesOf(MEMBERS)).toEqual([
      { id: 'u-owner', name: '은주', sticker: 'basic.shoe' },
      { id: 'me', name: '소라', sticker: 'basic.sprout', me: true },
      { id: 'u-min', name: '민', sticker: 'basic.cat' },
    ]);
  });
});

describe('oneBoardCells (한 판 적립판)', () => {
  const stickers = [
    sticker('a', 'u-owner', 0, at(2, 8, 5), 'basic.shoe'),
    sticker('b', 'me', 1, at(3), 'basic.sprout'),
    sticker('c', 'u-gone', 2, at(4), ''), // 차단한 사람의 칸
  ];

  it('가려진 칸은 hidden이고 filled에 없다', () => {
    const cells = oneBoardCells(stickers, MEMBERS);
    expect(cells.hidden).toEqual(new Set([3]));
    expect(cells.filled).toEqual({ 1: 'basic.shoe', 2: 'basic.sprout' });
  });

  it('내 칸과 가려진 칸은 placedBy에 없고, 친구 칸은 이름과 시각이다', () => {
    expect(oneBoardCells(stickers, MEMBERS).placedBy).toEqual({ 1: { name: '은주', at: at(2, 8, 5) } });
  });

  it('멤버 행을 아직 받지 못한 사람의 칸은 그리되 placedBy에는 없다(이름 없는 창을 띄우지 않는다)', () => {
    const cells = oneBoardCells([sticker('n', 'u-new', 4, at(5))], MEMBERS);
    expect(cells.filled).toEqual({ 5: 'basic.flower' });
    expect(cells.placedBy).toEqual({});
  });
});

describe('한 판 달력판 (하루 두 장까지)', () => {
  const days = [
    sticker('late', 'me', 2, at(3, 20)),
    sticker('early', 'u-owner', 2, at(3, 7)),
    sticker('hid', 'u-gone', 3, at(4, 7), ''),
    sticker('after', 'u-min', 3, at(4, 9)),
    sticker('only-hidden', 'u-gone', 5, at(6, 8), ''),
  ];
  const calendar = goal({ boardType: 'calendar', totalSlots: null, initialSlots: null, endDate: '2026-09-30' });
  const now = new Date(2026, 8, 10, 12);

  it('oneBoardShown: 날마다 먼저 붙인 한 장, 가려진 칸은 빼고', () => {
    const shown = oneBoardShown(days);
    expect(Object.fromEntries(Object.entries(shown).map(([date, s]) => [date, s.id]))).toEqual({ '2026-09-03': 'early', '2026-09-04': 'after' });
  });

  it('oneBoardDay: 그날 붙인 사람을 먼저 붙인 순서로, 그날 내 스티커는 둘째여도 mine', () => {
    const day = oneBoardDay(days, MEMBERS, '2026-09-03');
    expect(day.people).toEqual([{ name: '은주', at: at(3, 7), me: false }, { name: '소라', at: at(3, 20), me: true }]);
    expect(day.mine?.id).toBe('late');
    expect(oneBoardDay(days, MEMBERS, '2026-09-04').mine).toBeUndefined();
  });

  it('canPlaceOn: 친구 한 장만 있는 날, 가려진 칸만 있는 날은 붙인다', () => {
    expect(canPlaceOn(calendar, [sticker('x', 'u-min', 9, at(10))], { date: '2026-09-10' }, now)).toBe(true);
    expect(canPlaceOn(calendar, days, { date: '2026-09-06' }, now)).toBe(true);
  });

  it('canPlaceOn: 그날 두 장이면(가려진 칸도 센다), 내가 이미 붙였으면, 미래면 붙이지 않는다', () => {
    expect(canPlaceOn(calendar, days, { date: '2026-09-04' }, now)).toBe(false);
    expect(canPlaceOn(calendar, [sticker('m', 'me', 2, at(3))], { date: '2026-09-03' }, now)).toBe(false);
    expect(canPlaceOn(calendar, [], { date: '2026-09-11' }, now)).toBe(false);
  });

  it('canPlaceOn: 한 판이 아니면 지금 규칙(그날 스티커가 있으면 안 됨) 그대로', () => {
    const solo = { ...calendar, mode: 'solo' as const };
    expect(canPlaceOn(solo, [sticker('x', 'me', 9, at(10))], { date: '2026-09-10' }, now)).toBe(false);
    expect(canPlaceOn(solo, [], { date: '2026-09-10' }, now)).toBe(true);
  });

  it('placeCompletes: 이미 스티커가 있는 날에 붙이는 둘째 장은 완성을 묻지 않는다', () => {
    // 9월 1~30일 = 30일. 29일이 차 있으면 다음 새 날이 완성이다
    expect(placeCompletes(calendar, 29, [], '2026-09-10')).toBe(true);
    expect(placeCompletes(calendar, 29, [sticker('x', 'u-min', 9, at(10))], '2026-09-10')).toBe(false);
    expect(placeCompletes({ ...calendar, mode: 'solo' }, 29, [sticker('x', 'me', 8, at(9))], '2026-09-10')).toBe(true);
  });
});

describe('placedWhen', () => {
  it('「9월 3일 8:05」', () => {
    expect(placedWhen(at(3, 8, 5))).toBe('9월 3일 8:05');
  });
});
