import { toPocketGoal, goalCard, percentLabel, kindLabel, longDate, boardLabel, periodLabel, deleteDescription } from '../src/app-data/pocketAdapter';
import type { Goal, Sticker } from '../src/domain/types';
import { localDateKey } from '../src/domain/dates';

const tally: Goal = {
  id: 'g1', name: '러닝', boardType: 'tally', totalSlots: 20,
  defaultStickerId: 'shoe', createdAt: 0,
  endDate: null, completedAt: null, completionSeen: false, lastPlacedAt: null, initialSlots: 20,
};
const cal: Goal = {
  id: 'g2', name: '독서', boardType: 'calendar', totalSlots: null,
  defaultStickerId: 'book', createdAt: 0,
  endDate: null, completedAt: null, completionSeen: false, lastPlacedAt: null, initialSlots: null,
};
const stk = (over: Partial<Sticker>): Sticker => {
  const placedAt = over.placedAt ?? 0;
  return { id: 's', goalId: 'g1', placedAt, slotIndex: 0, stickerType: 'sprout', dateKey: localDateKey(placedAt), tzOffsetMin: 540, ...over };
};

describe('toPocketGoal - 적립판', () => {
  it('slotIndex 0은 칸 번호 1이 된다', () => {
    const p = toPocketGoal(tally, [stk({ slotIndex: 0 }), stk({ slotIndex: 4 })]);
    expect(p.filled).toEqual([1, 5]);
  });
  it('총 칸 수와 종류를 옮긴다', () => {
    const p = toPocketGoal(tally, []);
    expect(p.kind).toBe('tally');
    expect(p.total).toBe(20);
    expect(p.sticker).toBe('basic.shoe');
  });
  it('칸마다 실제로 붙은 스티커 종류를 담는다 (기본 스티커를 바꿔도 유지)', () => {
    const p = toPocketGoal(tally, [
      stk({ slotIndex: 0, stickerType: 'cat' }),
      stk({ slotIndex: 2, stickerType: 'star' }),
    ]);
    expect(p.sticker).toBe('basic.shoe');
    expect(p.filledStickers).toEqual({ 1: 'basic.cat', 3: 'basic.star' });
  });
  it('붙은 칸의 폐기된 종류는 대체한다', () => {
    const p = toPocketGoal(tally, [stk({ slotIndex: 0, stickerType: 'dot' })]);
    expect(p.filledStickers).toEqual({ 1: 'basic.sprout' });
  });
  it('달력 기록은 비어 있다', () => {
    expect(toPocketGoal(tally, [stk({})]).calendarRecords).toEqual({});
  });
});

describe('toPocketGoal - 달력판', () => {
  it('붙인 날짜를 키로 스티커 종류를 담는다', () => {
    const at = new Date(2026, 8, 3, 10).getTime();
    const p = toPocketGoal(cal, [stk({ goalId: 'g2', placedAt: at, stickerType: 'book' })]);
    expect(p.calendarRecords).toEqual({ '2026-09-03': 'basic.book' });
  });
  it('filled는 쓰지 않는다', () => {
    const p = toPocketGoal(cal, [stk({ goalId: 'g2', placedAt: Date.now() })]);
    expect(p.filled).toEqual([]);
  });
});

describe('알 수 없는 스티커 종류', () => {
  it('폐기된 id가 있어도 렌더 가능한 값으로 대체한다', () => {
    const p = toPocketGoal({ ...tally, defaultStickerId: 'stamp-good' }, []);
    expect(p.sticker).toBe('basic.sprout');
  });
  it('붙은 스티커의 폐기된 종류도 대체한다', () => {
    const at = new Date(2026, 8, 3).getTime();
    const p = toPocketGoal(cal, [stk({ goalId: 'g2', placedAt: at, stickerType: 'dot' })]);
    expect(p.calendarRecords['2026-09-03']).toBe('basic.sprout');
  });
});

describe('목록 카드와 진행 문구 (PRD 4.1)', () => {
  const NOW = new Date(2026, 8, 29, 10);
  const at = (m: number, d: number, h = 12) => new Date(2026, m - 1, d, h).getTime();

  it('판 종류 배지', () => {
    expect(kindLabel(tally)).toBe('적립판');
    expect(kindLabel(cal)).toBe('달력판');
  });

  it('적립판 진행 중: m% 채웠어요', () => {
    const card = goalCard({ goal: { ...tally, totalSlots: 15 }, placedAll: 6, placedInBasis: 6 }, NOW);
    expect(card).toMatchObject({ id: 'g1', name: '러닝', sticker: 'basic.shoe', kind: '적립판', percent: 40, status: ['40% 채웠어요'] });
  });

  it('종료일 없는 달력판은 이번 달을 붙인다', () => {
    const card = goalCard({ goal: cal, placedAll: 20, placedInBasis: 9 }, NOW);
    expect(card.status).toEqual(['이번 달 30% 채웠어요']);
  });

  it('완성한 판: m%와 M/D 완성. 종료일 없는 달력판은 완성한 달을 붙인다', () => {
    const doneTally = goalCard({ goal: { ...tally, totalSlots: 20, completedAt: at(9, 29, 8) }, placedAll: 20, placedInBasis: 20 }, NOW);
    expect(doneTally.status).toEqual(['100%', '9/29 완성']);
    const doneOpen = goalCard({ goal: { ...cal, completedAt: at(8, 31) }, placedAll: 10, placedInBasis: 10 }, NOW);
    expect(doneOpen.status).toEqual(['8월 32%', '8/31 완성']);
  });

  it('기간 달력판은 기준 달을 붙이지 않는다', () => {
    const g = { ...cal, createdAt: at(9, 10), endDate: '2026-10-31' };
    expect(percentLabel(g, 9, NOW)).toBe('17%');
  });

  it('날짜와 판 정보 표기', () => {
    expect(longDate('2026-09-03')).toBe('9월 3일');
    expect(boardLabel({ ...tally, totalSlots: 20 })).toBe('적립판 · 20칸');
    expect(boardLabel(cal)).toBe('달력판');
    expect(periodLabel({ ...cal, createdAt: at(9, 1), endDate: '2026-09-23' })).toBe('9월 1일 – 9월 23일');
    expect(periodLabel({ ...cal, createdAt: at(9, 1) })).toBe('9월 1일부터');
  });
});

describe('삭제 확인 문구 (2026-09-30)', () => {
  it('0개인 항목은 쓰지 않는다', () => {
    expect(deleteDescription({ stickers: 6, records: 2 })).toBe('붙인 스티커 6개와 기록 2개가 함께 지워지고, 되돌릴 수 없어요.');
    expect(deleteDescription({ stickers: 6, records: 0 })).toBe('붙인 스티커 6개가 함께 지워지고, 되돌릴 수 없어요.');
    expect(deleteDescription({ stickers: 0, records: 0 })).toBe('이 목표가 지워지고, 되돌릴 수 없어요.');
  });
});
