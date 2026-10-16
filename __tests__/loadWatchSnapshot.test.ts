import { createGoal } from '../src/repositories/goalRepository';
import { placeSticker } from '../src/repositories/stickerRepository';
import { upsertRecord } from '../src/repositories/recordRepository';
import { loadWatchInputs, loadWatchSnapshot } from '../src/watch/loadSnapshot';
import { withFreshDb } from './support/setup';

withFreshDb();

describe('loadWatchInputs', () => {
  it('적립판은 전체 스티커와 기록 여부를 읽는다', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 5 });
    const s = await placeSticker(g.id, 0);
    await upsertRecord(s.id, { memo: '좋았다', photoUri: null });
    await placeSticker(g.id, 1);
    const [input] = await loadWatchInputs(new Date());
    expect(input.placedAll).toBe(2);
    expect([...input.stickers].sort((a, b) => a.slotIndex - b.slotIndex).map((x) => [x.slotIndex, x.recorded]))
      .toEqual([[0, true], [1, false]]);
  });

  it('완성한 판은 읽지 않는다', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 1 });
    await placeSticker(g.id, 0, undefined, { complete: true });
    expect(await loadWatchInputs(new Date())).toEqual([]);
  });
});

describe('loadWatchSnapshot', () => {
  it('성장 수와 최근 블록 색을 담는다', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 5 });
    await placeSticker(g.id, 0, 'basic.book');
    const s = await loadWatchSnapshot(new Date(), 9);
    expect(s.growth).toBe(9);
    expect(s.recentColors).toHaveLength(1);
    expect(s.goals.map((x) => x.id)).toEqual([g.id]);
    expect(s.lastGoalId).toBe(g.id);
  });
});
