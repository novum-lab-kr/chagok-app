import { createGoal, deleteGoal } from '../src/repositories/goalRepository';
import { placeSticker, removeSticker } from '../src/repositories/stickerRepository';
import { getSetting, setSetting } from '../src/repositories/appSettingsRepository';
import { getDb } from '../src/db/client';
import { pushOnce } from '../src/sync/push';
import { restoreAll } from '../src/sync/restore';
import { wipeDevice } from '../src/sync/wipe';
import { updateGrowth } from '../src/watch/growth';
import { FakePhotos, FakeServer } from './support/fakeServer';
import { withFreshDb } from './support/setup';

withFreshDb();

describe('updateGrowth: 저장된 값', () => {
  it('저장된 값과 지금 수 중 큰 값', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 10 });
    for (let i = 0; i < 4; i++) await placeSticker(g.id, i);
    await setSetting('watchGrowth', '7');
    expect(await updateGrowth()).toBe(7);
    await setSetting('watchGrowth', '3');
    expect(await updateGrowth()).toBe(4);
  });

  it('깨진 값은 무시한다', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 10 });
    for (let i = 0; i < 4; i++) await placeSticker(g.id, i);
    await setSetting('watchGrowth', 'abc');
    expect(await updateGrowth()).toBe(4);
    await setSetting('watchGrowth', '-2');
    expect(await updateGrowth()).toBe(4);
  });
});

describe('updateGrowth (워치 설계 「성장 수」)', () => {
  it('처음에는 지금까지 붙인 스티커 전체, 완성한 판도 센다', async () => {
    const a = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 1 });
    const b = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 5 });
    await placeSticker(a.id, 0, undefined, { complete: true });
    await placeSticker(b.id, 0);
    expect(await updateGrowth()).toBe(2);
    expect(await getSetting('watchGrowth')).toBe('2');
  });

  it('떼고 다시 붙여도, 목표를 지워도 줄거나 늘지 않는다 (Review Focus 2)', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 10 });
    for (let i = 0; i < 4; i++) await placeSticker(g.id, i);
    const fifth = await placeSticker(g.id, 4);
    expect(await updateGrowth()).toBe(5);
    await removeSticker(fifth.id);
    expect(await updateGrowth()).toBe(5);
    await placeSticker(g.id, 4);
    expect(await updateGrowth()).toBe(5);
    await deleteGoal(g.id);
    expect(await updateGrowth()).toBe(5);
  });

  it('기기를 비우면 0부터 (Review Focus 3)', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 10 });
    await placeSticker(g.id, 0);
    await updateGrowth();
    await wipeDevice(() => {});
    expect(await updateGrowth()).toBe(0);
  });

  it('복원하면 복원된 스티커 수부터 (Review Focus 3)', async () => {
    const server = new FakeServer();
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 10 });
    await placeSticker(g.id, 0);
    await pushOnce({ server, photos: new FakePhotos(), deviceId: 'old' });
    for (let i = 1; i < 6; i++) await placeSticker(g.id, i); // 백업하지 않은 5개
    expect(await updateGrowth()).toBe(6);
    const db = await getDb();
    await db.exec('DELETE FROM records; DELETE FROM stickers; DELETE FROM goals; DELETE FROM outbox;');
    await restoreAll(server);
    expect(await updateGrowth()).toBe(1);
  });
});

