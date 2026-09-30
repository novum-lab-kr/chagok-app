import { setDriverFactory } from '../../src/db/client';
import { createGoal, listGoals } from '../../src/repositories/goalRepository';
import { placeSticker } from '../../src/repositories/stickerRepository';
import { upsertRecord } from '../../src/repositories/recordRepository';
import { pendingCount } from '../../src/sync/outbox';
import { pushOnce } from '../../src/sync/push';
import { restoreAll } from '../../src/sync/restore';
import { SupabaseSyncServer } from '../../src/sync/supabaseServer';
import { FakePhotos } from '../support/fakeServer';
import { createNodeDriver } from '../support/nodeDriver';
import { withFreshDb } from '../support/setup';
import { describeIfServer, newUser } from './support';

withFreshDb();

describeIfServer('기기 ↔ 서버 왕복', () => {
  it('기기에서 올린 기록을 새 기기에서 복원한다', async () => {
    const { client } = await newUser();
    const server = new SupabaseSyncServer({ rpc: (fn, args) => client.rpc(fn, args) });
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 5 });
    const s = await placeSticker(g.id, 0);
    await upsertRecord(s.id, { memo: '공원 한 바퀴', photoUri: null });

    await pushOnce({ server, photos: new FakePhotos(), deviceId: 'phone' });
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });

    setDriverFactory(async () => createNodeDriver()); // 새 기기
    expect(await listGoals()).toEqual([]);
    await restoreAll(server);
    expect((await listGoals()).map((x) => x.name)).toEqual(['산책']);
  });
});
