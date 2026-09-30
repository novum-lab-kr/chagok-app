import { getDb, setDriverFactory } from '../../src/db/client';
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

  // 서버는 묶음 전체를 거부한다(23503). 기기가 한 건씩 나눠 보내 문제 항목만 보류하는지 실제 서버로 확인한다.
  it('부모가 서버에 없는 스티커만 보류하고 나머지는 올린다', async () => {
    const { client } = await newUser();
    const server = new SupabaseSyncServer({ rpc: (fn, args) => client.rpc(fn, args) });
    const kept = await createGoal({ name: '올라갈 목표', boardType: 'tally', totalSlots: 5 });
    const keptSticker = await placeSticker(kept.id, 0);
    const lost = await createGoal({ name: '전송이 빠진 목표', boardType: 'tally', totalSlots: 5 });
    await placeSticker(lost.id, 0);
    // 목표 전송만 빠진 상황을 만든다 (예: 그 목표가 먼저 보류됨)
    await (await getDb()).run("DELETE FROM outbox WHERE entity = 'goal' AND row_id = ?", lost.id);

    const result = await pushOnce({ server, photos: new FakePhotos(), deviceId: 'phone' });

    expect(result.held).toBe(1);
    expect(await pendingCount()).toEqual({ pending: 0, held: 1 });
    const rows = (await server.pull(0, 100)).rows;
    expect(rows.filter((r) => r.entity === 'goal').map((r) => r.row.id)).toEqual([kept.id]);
    expect(rows.filter((r) => r.entity === 'sticker').map((r) => r.row.id)).toEqual([keptSticker.id]);
  });
});
