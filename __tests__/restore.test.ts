import { getDb } from '../src/db/client';
import { createGoal, listGoals } from '../src/repositories/goalRepository';
import { listStickers, placeSticker, removeSticker } from '../src/repositories/stickerRepository';
import { getRecord, upsertRecord } from '../src/repositories/recordRepository';
import { getSetting } from '../src/repositories/appSettingsRepository';
import { pendingCount, takeBatch } from '../src/sync/outbox';
import { pushOnce } from '../src/sync/push';
import { applyRestore, downloadRestoredPhotos, hasLocalData, pullAll, replaceServerWithDevice, restoreAll, summarizeDevice, summarizeSnapshot } from '../src/sync/restore';
import { FakePhotos, FakeServer } from './support/fakeServer';
import { withFreshDb } from './support/setup';

withFreshDb();

/** 다른 기기에서 올린 백업을 흉내 낸다: 이 DB에서 만들어 올린 뒤 로컬을 비운다. */
async function seedServer() {
  const server = new FakeServer();
  const photos = new FakePhotos();
  const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
  const s = await placeSticker(g.id, 0);
  const r = await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: '메모' });
  const gone = await placeSticker(g.id, 1);
  await pushOnce({ server, photos, deviceId: 'old' });
  await removeSticker(gone.id);
  await pushOnce({ server, photos, deviceId: 'old' });
  const db = await getDb();
  await db.exec('DELETE FROM records; DELETE FROM stickers; DELETE FROM goals; DELETE FROM outbox;');
  return { server, photos, g, s, r };
}

describe('복원', () => {
  it('서버 행을 모두 받아 채우고, 삭제 표식은 되살리지 않는다', async () => {
    const { server, g, s } = await seedServer();
    const { photos } = await restoreAll(server, 2); // 여러 페이지
    expect((await listGoals()).map((x) => x.id)).toEqual([g.id]);
    expect((await listStickers(g.id)).map((x) => x.id)).toEqual([s.id]);
    expect(photos).toHaveLength(1);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 }); // 복원은 outbox를 만들지 않는다
    expect(await getSetting('syncCursor')).not.toBeNull();
  });

  it('받는 중 실패하면 기기는 그대로다', async () => {
    const { server } = await seedServer();
    await createGoal({ name: '기기 목표', boardType: 'tally', totalSlots: 1 });
    let calls = 0;
    const real = server.pull.bind(server);
    server.pull = async (since, limit) => { if (++calls === 2) throw new Error('network'); return real(since, limit); };
    await expect(restoreAll(server, 1)).rejects.toThrow('network');
    expect((await listGoals()).map((x) => x.name)).toEqual(['기기 목표']);
  });

  it('사진을 받아 기록에 연결하고, 실패한 것은 남겨 둔다', async () => {
    const { server, photos, s, r } = await seedServer();
    const restored = await restoreAll(server);
    photos.failDownload.add(r.id);
    expect(await downloadRestoredPhotos(photos, restored.photos)).toEqual({ failed: [r.id] });
    expect(JSON.parse((await getSetting('pendingPhotoDownloads'))!)).toEqual(restored.photos);
    photos.failDownload.clear();
    expect(await downloadRestoredPhotos(photos, restored.photos)).toEqual({ failed: [] });
    expect((await getRecord(s.id))?.photoUri).toBe(`record-photo:${r.id}-restored.jpg`);
    expect(await getSetting('pendingPhotoDownloads')).toBeNull();
  });

  it('이 기기 기록 유지: 서버를 기기 행으로 바꾸고 사진은 outbox로 올린다', async () => {
    const { server } = await seedServer();
    const g = await createGoal({ name: '기기 목표', boardType: 'tally', totalSlots: 2 });
    const s = await placeSticker(g.id, 0);
    const r = await upsertRecord(s.id, { photoUri: 'record-photo:b.jpg', memo: null });
    await replaceServerWithDevice(server, 'd1');
    expect(server.live('goal')).toEqual([g.id]);
    expect((await takeBatch(10)).map((e) => `${e.entity}:${e.rowId}`)).toEqual([`photo:${r.id}`]);
  });

  it('이 기기 기록 유지 중 실패하면 서버와 기기 outbox가 그대로다', async () => {
    const { server, g } = await seedServer();
    const mine = await createGoal({ name: '기기 목표', boardType: 'tally', totalSlots: 2 });
    server.failNext = 1;
    await expect(replaceServerWithDevice(server, 'd1')).rejects.toThrow();
    expect(server.live('goal')).toEqual([g.id]);
    expect((await takeBatch(10)).map((e) => e.rowId)).toEqual([mine.id]);
  });

  it('기기에 기록이 있는지', async () => {
    expect(await hasLocalData()).toBe(false);
    await createGoal({ name: 'x', boardType: 'tally', totalSlots: 1 });
    expect(await hasLocalData()).toBe(true);
  });

  it('받기만 하면 기기를 바꾸지 않고, 요약은 목표 이름·수·최근 수정 시각을 담는다', async () => {
    const { server } = await seedServer();
    const mine = await createGoal({ name: '물 마시기', boardType: 'tally', totalSlots: 5 });
    const snap = await pullAll(server, 2);
    expect((await listGoals()).map((x) => x.id)).toEqual([mine.id]); // 기기 그대로
    const s = summarizeSnapshot(snap);
    expect(s).toMatchObject({ goals: 1, stickers: 1, goalNames: ['산책'] });
    expect(s.updatedAt).toBe(Math.max(...[...snap.goals, ...snap.stickers, ...snap.records].map((r) => r.updated_at)));
    expect(await summarizeDevice()).toMatchObject({ goals: 1, stickers: 0, goalNames: ['물 마시기'] });
    expect(summarizeSnapshot({ goals: [], stickers: [], records: [], cursor: 0 })).toEqual({ goals: 0, stickers: 0, goalNames: [], updatedAt: null });
  });

  it('적용하면 바꾸기 전 기기 사진 경로를 돌려준다', async () => {
    const { server } = await seedServer();
    const mine = await createGoal({ name: '물 마시기', boardType: 'tally', totalSlots: 5 });
    const st = await placeSticker(mine.id, 0);
    await upsertRecord(st.id, { photoUri: 'record-photo:old.jpg', memo: null });
    const { oldPhotoUris } = await applyRestore(await pullAll(server));
    expect(oldPhotoUris).toEqual(['record-photo:old.jpg']);
  });
});
