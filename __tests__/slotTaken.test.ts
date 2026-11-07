import { notifySlotTaken, subscribeSlotTaken } from '../src/sync/slotTaken';

describe('칸 겹침 알림', () => {
  it('구독하면 목표 id를 받고, 해제하면 받지 않는다', () => {
    const got: string[] = [];
    const off = subscribeSlotTaken((goalId) => got.push(goalId));
    notifySlotTaken('g1');
    off();
    notifySlotTaken('g2');
    expect(got).toEqual(['g1']);
  });

  it('구독자가 없으면 아무 일도 없다', () => {
    expect(() => notifySlotTaken('g1')).not.toThrow();
  });
});
