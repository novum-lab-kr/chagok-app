import { createGoal } from '../src/repositories/goalRepository';
import { placeSticker, removeSticker } from '../src/repositories/stickerRepository';
import { upsertRecord, getRecord, listRecordedStickerIds, deleteRecord } from '../src/repositories/recordRepository';
import { withFreshDb } from './support/setup';

withFreshDb();

async function stickerOnGoal() {
  const g = await createGoal({ name: '테스트', boardType: 'tally', totalSlots: 10 });
  const s = await placeSticker(g.id, 0);
  return { goal: g, sticker: s };
}

describe('recordRepository', () => {
  it('기록이 없는 스티커는 null을 준다', async () => {
    const { sticker } = await stickerOnGoal();
    expect(await getRecord(sticker.id)).toBeNull();
  });

  it('메모만 저장할 수 있다', async () => {
    const { sticker } = await stickerOnGoal();
    const r = await upsertRecord(sticker.id, { photoUri: null, memo: '오늘 5km' });
    expect(r.memo).toBe('오늘 5km');
    expect(r.photoUri).toBeNull();
  });

  it('사진만 저장할 수 있다', async () => {
    const { sticker } = await stickerOnGoal();
    const r = await upsertRecord(sticker.id, { photoUri: 'file:///p.jpg', memo: null });
    expect(r.photoUri).toBe('file:///p.jpg');
    expect(r.memo).toBeNull();
  });

  it('같은 스티커에 다시 저장하면 덮어쓴다', async () => {
    const { sticker } = await stickerOnGoal();
    await upsertRecord(sticker.id, { photoUri: null, memo: '처음' });
    await upsertRecord(sticker.id, { photoUri: null, memo: '수정' });
    expect((await getRecord(sticker.id))?.memo).toBe('수정');
  });

  it('기록 있는 스티커 id 집합을 준다', async () => {
    const { goal, sticker } = await stickerOnGoal();
    const bare = await placeSticker(goal.id, 1);
    await upsertRecord(sticker.id, { photoUri: null, memo: 'ok' });
    const ids = await listRecordedStickerIds(goal.id);
    expect(ids.has(sticker.id)).toBe(true);
    expect(ids.has(bare.id)).toBe(false);
  });

  it('스티커를 떼면 기록도 같이 사라진다', async () => {
    const { sticker } = await stickerOnGoal();
    await upsertRecord(sticker.id, { photoUri: null, memo: 'ok' });
    await removeSticker(sticker.id);
    expect(await getRecord(sticker.id)).toBeNull();
  });

  it('기록만 지울 수 있다', async () => {
    const { sticker } = await stickerOnGoal();
    await upsertRecord(sticker.id, { photoUri: null, memo: 'ok' });
    await deleteRecord(sticker.id);
    expect(await getRecord(sticker.id)).toBeNull();
  });
});
