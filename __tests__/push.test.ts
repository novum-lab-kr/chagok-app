import { createGoal, deleteGoal, updateGoal } from '../src/repositories/goalRepository';
import { placeSticker, removeSticker } from '../src/repositories/stickerRepository';
import { upsertRecord } from '../src/repositories/recordRepository';
import { pendingCount, takeBatch } from '../src/sync/outbox';
import { pushOnce } from '../src/sync/push';
import { FakePhotos, FakeServer } from './support/fakeServer';
import { withFreshDb } from './support/setup';

withFreshDb();

const setup = () => ({ server: new FakeServer(), photos: new FakePhotos(), deviceId: 'd1' });

describe('pushOnce', () => {
  it('행을 올리고 outbox를 비운다', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    await pushOnce(deps);
    expect(deps.server.live('goal')).toEqual([g.id]);
    expect(deps.server.live('sticker')).toEqual([s.id]);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('네트워크 오류면 던지고 outbox를 그대로 둔다', async () => {
    const deps = setup();
    await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    deps.server.failNext = 1;
    await expect(pushOnce(deps)).rejects.toThrow('network');
    expect((await pendingCount()).pending).toBe(1);
  });

  it('서버는 반영했는데 응답을 잃으면, 다시 보내도 결과가 같다', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    deps.server.applyThenFail = true;
    await expect(pushOnce(deps)).rejects.toThrow();
    await pushOnce(deps);
    expect(deps.server.live('goal')).toEqual([g.id]);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('사진을 올린 뒤 기록 행에 서버 경로를 남겨 올린다', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    const r = await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: null });
    await pushOnce(deps);
    const stored = deps.server.rows.get(`record:${r.id}`)!.row as { photo_remote_path: string | null };
    expect(stored.photo_remote_path).toBe(`u/${r.id}.jpg`);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('떼면 서버에서도 스티커와 기록이 사라지고 사진도 지워진다', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    const r = await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: '메모' });
    await pushOnce(deps);
    expect(deps.photos.remote.has(`u/${r.id}.jpg`)).toBe(true);
    await removeSticker(s.id);
    await pushOnce(deps);
    expect(deps.server.live('sticker')).toEqual([]);
    expect(deps.server.live('record')).toEqual([]);
    expect(deps.photos.remote.size).toBe(0);
  });

  it('기기 사진이 사라졌으면 사진 항목을 버리고 나머지는 올린다', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    await upsertRecord(s.id, { photoUri: 'record-photo:gone.jpg', memo: '메모' });
    deps.photos.missingLocal.add('record-photo:gone.jpg');
    await pushOnce(deps);
    expect(deps.photos.remote.size).toBe(0);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('거부된 항목만 보류하고 나머지는 올린다', async () => {
    const deps = setup();
    const a = await createGoal({ name: 'a', boardType: 'tally', totalSlots: 3 });
    const b = await createGoal({ name: 'b', boardType: 'tally', totalSlots: 3 });
    deps.server.reject.add(a.id);
    const result = await pushOnce(deps);
    expect(deps.server.live('goal')).toEqual([b.id]);
    expect(result.held).toBe(1);
    expect(await pendingCount()).toEqual({ pending: 0, held: 1 });
  });

  it('묶음 크기로 나눠 보낸다', async () => {
    const deps = setup();
    for (let i = 0; i < 5; i++) await createGoal({ name: `g${i}`, boardType: 'tally', totalSlots: 1 });
    await pushOnce({ ...deps, batchSize: 2 });
    expect(deps.server.pushes).toBe(3);
    expect(deps.server.live('goal')).toHaveLength(5);
  });

  it('목표를 지우면 서버의 딸린 행이 모두 표식된다', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    await upsertRecord(s.id, { photoUri: null, memo: '메모' });
    await pushOnce(deps);
    await deleteGoal(g.id);
    await pushOnce(deps);
    expect([deps.server.live('goal'), deps.server.live('sticker'), deps.server.live('record')]).toEqual([[], [], []]);
  });

  it('보내는 동안 같은 목표가 다시 바뀌면 그 수정도 올라간다 (Review Focus 1)', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const realPush = deps.server.push.bind(deps.server);
    let once = true;
    deps.server.push = async (id, changes) => {
      await realPush(id, changes);
      if (once) { once = false; await updateGoal(g.id, { name: '걷기' }); }
    };
    await pushOnce(deps);
    expect((deps.server.rows.get(`goal:${g.id}`)!.row as { name: string }).name).toBe('걷기');
    expect(await takeBatch(10)).toEqual([]);
  });
});
