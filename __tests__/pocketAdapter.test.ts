import { toPocketGoal, localDateKey } from '../src/app-data/pocketAdapter';
import type { Goal, Sticker } from '../src/domain/types';

const tally: Goal = {
  id: 'g1', name: '러닝', boardType: 'tally', totalSlots: 20,
  defaultStickerId: 'shoe', createdAt: 0,
};
const cal: Goal = {
  id: 'g2', name: '독서', boardType: 'calendar', totalSlots: null,
  defaultStickerId: 'book', createdAt: 0,
};
const stk = (over: Partial<Sticker>): Sticker => ({
  id: 's', goalId: 'g1', placedAt: 0, slotIndex: 0, stickerType: 'sprout', ...over,
});

describe('localDateKey', () => {
  it('로컬 시간 기준 YYYY-MM-DD를 만든다', () => {
    // UTC 변환을 쓰면 자정 근처에서 하루가 밀린다
    const d = new Date(2026, 8, 21, 23, 30);
    expect(localDateKey(d.getTime())).toBe('2026-09-21');
  });
  it('한 자리 월·일을 0으로 채운다', () => {
    expect(localDateKey(new Date(2026, 0, 5).getTime())).toBe('2026-01-05');
  });
});

describe('toPocketGoal - 적립판', () => {
  it('slotIndex 0은 칸 번호 1이 된다', () => {
    const p = toPocketGoal(tally, [stk({ slotIndex: 0 }), stk({ slotIndex: 4 })]);
    expect(p.filled).toEqual([1, 5]);
  });
  it('총 칸 수와 종류를 옮긴다', () => {
    const p = toPocketGoal(tally, []);
    expect(p.kind).toBe('tally');
    expect(p.total).toBe(20);
    expect(p.sticker).toBe('shoe');
  });
  it('달력 기록은 비어 있다', () => {
    expect(toPocketGoal(tally, [stk({})]).calendarRecords).toEqual({});
  });
});

describe('toPocketGoal - 달력판', () => {
  it('붙인 날짜를 키로 스티커 종류를 담는다', () => {
    const at = new Date(2026, 8, 3, 10).getTime();
    const p = toPocketGoal(cal, [stk({ goalId: 'g2', placedAt: at, stickerType: 'book' })]);
    expect(p.calendarRecords).toEqual({ '2026-09-03': 'book' });
  });
  it('filled는 쓰지 않는다', () => {
    const p = toPocketGoal(cal, [stk({ goalId: 'g2', placedAt: Date.now() })]);
    expect(p.filled).toEqual([]);
  });
});

describe('알 수 없는 스티커 종류', () => {
  it('폐기된 id가 있어도 렌더 가능한 값으로 대체한다', () => {
    const p = toPocketGoal({ ...tally, defaultStickerId: 'stamp-good' }, []);
    expect(p.sticker).toBe('sprout');
  });
  it('붙은 스티커의 폐기된 종류도 대체한다', () => {
    const at = new Date(2026, 8, 3).getTime();
    const p = toPocketGoal(cal, [stk({ goalId: 'g2', placedAt: at, stickerType: 'dot' })]);
    expect(p.calendarRecords['2026-09-03']).toBe('sprout');
  });
});
