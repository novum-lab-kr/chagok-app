import { buildSlots, nextSlotIndex } from '../src/domain/slots';
import type { Goal, Sticker } from '../src/domain/types';

const tallyGoal: Goal = {
  id: 'g1', name: '러닝 30회', boardType: 'tally',
  totalSlots: 30, defaultStickerId: 'sprout', createdAt: 0,
};

const calendarGoal: Goal = {
  id: 'g2', name: '매일 독서', boardType: 'calendar',
  totalSlots: null, defaultStickerId: 'sprout', createdAt: 0,
};

const sticker = (slotIndex: number, placedAt = 0): Sticker => ({
  id: `s${slotIndex}`, goalId: 'g1', placedAt, slotIndex, stickerType: 'sprout',
});

describe('buildSlots - tally', () => {
  it('총 칸 수만큼 슬롯을 만든다', () => {
    expect(buildSlots(tallyGoal, [], new Date('2026-09-21'))).toHaveLength(30);
  });

  it('붙인 스티커를 해당 슬롯에 넣고 나머지는 빈칸이다', () => {
    const slots = buildSlots(tallyGoal, [sticker(0), sticker(1)], new Date('2026-09-21'));
    expect(slots[0].sticker).not.toBeNull();
    expect(slots[1].sticker).not.toBeNull();
    expect(slots[2].sticker).toBeNull();
  });

  it('슬롯 라벨은 1부터 시작하는 번호다', () => {
    const slots = buildSlots(tallyGoal, [], new Date('2026-09-21'));
    expect(slots[0].label).toBe('1');
    expect(slots[29].label).toBe('30');
  });
});

describe('buildSlots - calendar', () => {
  it('해당 월의 일수만큼 슬롯을 만든다', () => {
    expect(buildSlots(calendarGoal, [], new Date('2026-09-15'))).toHaveLength(30);
  });

  it('2월 윤년을 올바르게 처리한다', () => {
    expect(buildSlots(calendarGoal, [], new Date('2028-02-10'))).toHaveLength(29);
  });

  it('붙인 날짜에 스티커가 들어간다', () => {
    const placedAt = new Date('2026-09-03T10:00:00').getTime();
    const s: Sticker = { ...sticker(2, placedAt), goalId: 'g2' };
    const slots = buildSlots(calendarGoal, [s], new Date('2026-09-15'));
    expect(slots[2].sticker).not.toBeNull();
    expect(slots[0].sticker).toBeNull();
  });
});

describe('nextSlotIndex', () => {
  it('tally: 다음 빈 칸 번호를 준다', () => {
    expect(nextSlotIndex(tallyGoal, [sticker(0), sticker(1)], new Date())).toBe(2);
  });

  it('tally: 판이 다 차면 null을 준다', () => {
    const full = Array.from({ length: 30 }, (_, i) => sticker(i));
    expect(nextSlotIndex(tallyGoal, full, new Date())).toBeNull();
  });

  it('calendar: 오늘 날짜의 슬롯 번호를 준다', () => {
    expect(nextSlotIndex(calendarGoal, [], new Date('2026-09-21'))).toBe(20);
  });

  it('calendar: 오늘 이미 붙였으면 null을 준다', () => {
    const today = new Date('2026-09-21T09:00:00');
    const s: Sticker = { ...sticker(20, today.getTime()), goalId: 'g2' };
    expect(nextSlotIndex(calendarGoal, [s], today)).toBeNull();
  });
});
