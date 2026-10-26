import { createGoal } from '../src/repositories/goalRepository';
import { placeSticker } from '../src/repositories/stickerRepository';
import { upsertRecord } from '../src/repositories/recordRepository';
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

  it('적립판은 오늘 붙인 칸과 기록 없는 칸을 읽는다', async () => {
    const t = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 5 });
    await placeSticker(t.id, 0);
    const s = await placeSticker(t.id, 1);
    await upsertRecord(s.id, { memo: '메모', photoUri: null });
    const snap = await loadWidgetSnapshot(new Date());
    expect(snap.goals.find((x) => x.id === t.id)).toMatchObject({ todaySlots: [0, 1], removableSlots: [0] });
  });

  it('오늘 붙인 스티커의 기록 여부를 읽는다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'calendar', totalSlots: null });
    const s = await placeSticker(g.id, new Date().getDate() - 1);
    await upsertRecord(s.id, { memo: '메모', photoUri: null });
    const snap = await loadWidgetSnapshot(new Date());
    expect(snap.goals.find((x) => x.id === g.id)).toMatchObject({ placedToday: true, undoable: false });
  });
});

describe('loadWidgetSnapshot · 묶음', () => {
  it('잠긴 묶음 스티커가 기본인 목표는 locked', async () => {
    await createGoal({ name: '동물', boardType: 'tally', totalSlots: 5, defaultStickerId: 'sports_normal.run' });
    await createGoal({ name: '새싹', boardType: 'tally', totalSlots: 5 });
    const snap = await loadWidgetSnapshot(new Date());
    expect(Object.fromEntries(snap.goals.map((g) => [g.name, g.locked]))).toEqual({ 동물: true, 새싹: false });
  });
});
