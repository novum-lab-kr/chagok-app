import { createGoal } from '../src/repositories/goalRepository';
import { placeSticker } from '../src/repositories/stickerRepository';
import { loadWidgetSnapshot } from '../src/widgets/loadSnapshot';
import { withFreshDb } from './support/setup';

withFreshDb();

describe('loadWidgetSnapshot', () => {
  it('진행 중인 목표를 읽어 스냅샷을 만든다', async () => {
    // 달력판을 먼저 만든다. 적립판에 나중에 붙여야 적립판이 "가장 최근"이 된다.
    await createGoal({ name: '산책', boardType: 'calendar', totalSlots: null });
    await new Promise((r) => setTimeout(r, 5)); // 같은 ms면 최근순이 동점이 된다
    const t = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 5 });
    await placeSticker(t.id, 0);
    await placeSticker(t.id, 2);
    const snap = await loadWidgetSnapshot(new Date());
    expect(snap.goals).toHaveLength(2);
    const tally = snap.goals.find((g) => g.id === t.id)!;
    expect(tally.mini).toMatchObject({ type: 'tally', placed: 2, total: 5, cells: ['filled', 'empty', 'filled', 'empty', 'empty'] });
    expect(snap.defaultGoalId).toBe(t.id);
  });
});
