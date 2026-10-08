import { getDb } from '../src/db/client';
import { completeGoal, createGoal, deleteGoal, extendSlots, updateGoal } from '../src/repositories/goalRepository';
import { placeSticker, removeSticker } from '../src/repositories/stickerRepository';
import { deleteRecord, upsertRecord } from '../src/repositories/recordRepository';
import { takeBatch } from '../src/sync/outbox';
import { withFreshDb } from './support/setup';

withFreshDb();

const keys = async () => (await takeBatch(100)).map((e) => `${e.entity}:${e.rowId}`).sort();
const clear = async () => (await getDb()).run('DELETE FROM outbox');

describe('저장소 → outbox', () => {
  it('목표를 만들고 고치면 goal 한 줄이고 updated_at이 바뀐다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    expect(await keys()).toEqual([`goal:${g.id}`]);
    const db = await getDb();
    const before = (await db.first<{ updated_at: number }>('SELECT updated_at FROM goals'))!.updated_at;
    await new Promise((r) => setTimeout(r, 2));
    await updateGoal(g.id, { name: '걷기' });
    const after = (await db.first<{ updated_at: number }>('SELECT updated_at FROM goals'))!.updated_at;
    expect(after).toBeGreaterThan(before);
    expect(await keys()).toEqual([`goal:${g.id}`]);
  });

  it('붙이기는 sticker와 goal을 남긴다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    await clear();
    const s = await placeSticker(g.id, 0);
    expect(await keys()).toEqual([`goal:${g.id}`, `sticker:${s.id}`].sort());
  });

  it('사진 있는 스티커를 떼면 sticker와 photo를 남긴다 (서버 사진 정리)', async () => {
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    const r = await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: null });
    await clear();
    await removeSticker(s.id);
    expect(await keys()).toEqual([`photo:${r.id}`, `sticker:${s.id}`].sort());
  });

  it('기록 저장: 사진이 바뀔 때만 photo를 남긴다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    await clear();
    const r = await upsertRecord(s.id, { photoUri: null, memo: '메모' });
    expect(await keys()).toEqual([`record:${r.id}`]);
    await clear();
    await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: '메모' });
    expect(await keys()).toEqual([`photo:${r.id}`, `record:${r.id}`].sort());
    await clear();
    await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: '메모2' });
    expect(await keys()).toEqual([`record:${r.id}`]);
  });

  it('기록 삭제: 사진이 있었으면 photo도 남긴다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    const r = await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: null });
    await clear();
    await deleteRecord(s.id);
    expect(await keys()).toEqual([`photo:${r.id}`, `record:${r.id}`].sort());
  });

  it('목표 삭제는 goal 한 줄과 사진 있던 기록의 photo만 남긴다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s1 = await placeSticker(g.id, 0);
    await placeSticker(g.id, 1);
    const r1 = await upsertRecord(s1.id, { photoUri: 'record-photo:a.jpg', memo: null });
    await clear();
    await deleteGoal(g.id);
    expect(await keys()).toEqual([`goal:${g.id}`, `photo:${r1.id}`].sort());
  });

  it('쓰기가 실패하면 outbox도 되돌려진다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 1 });
    await placeSticker(g.id, 0, 'sprout', { complete: true });
    await clear();
    await expect(updateGoal(g.id, { totalSlots: 3 })).rejects.toThrow('완성한 판'); // 완성한 판의 칸 수는 목표 설정에서 바꾸지 않는다
    await expect(placeSticker(g.id, 0)).rejects.toThrow(); // 이미 붙은 칸
    expect(await keys()).toEqual([]);
  });

  it('완성과 칸 늘리기도 goal을 남긴다', async () => {
    const c = await createGoal({ name: '산책', boardType: 'calendar', totalSlots: null });
    const t = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 2 });
    await clear();
    await completeGoal(c.id, 5);
    await extendSlots(t.id, 2);
    expect(await keys()).toEqual([`goal:${c.id}`, `goal:${t.id}`].sort());
  });

  it('칸 늘리기는 달력판에 아무것도 하지 않는다', async () => {
    const c = await createGoal({ name: '산책', boardType: 'calendar', totalSlots: null });
    await clear();
    await extendSlots(c.id, 2);
    expect(await keys()).toEqual([]);
  });
});

describe('복원 뒤 사진을 아직 못 받은 기록 (리뷰 #2)', () => {
  async function restoredRecord() {
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    const r = await upsertRecord(s.id, { photoUri: null, memo: '메모' });
    const db = await getDb();
    await db.run('UPDATE records SET photo_remote_path = ? WHERE id = ?', `u/${r.id}.jpg`, r.id);
    await clear();
    return { g, s, r };
  }
  it('스티커를 떼면 서버 사진을 지우도록 photo를 남긴다', async () => {
    const { s, r } = await restoredRecord();
    await removeSticker(s.id);
    expect(await keys()).toContain(`photo:${r.id}`);
  });
  it('기록을 지우면 photo를 남긴다', async () => {
    const { s, r } = await restoredRecord();
    await deleteRecord(s.id);
    expect(await keys()).toContain(`photo:${r.id}`);
  });
  it('목표를 지우면 photo를 남긴다', async () => {
    const { g, r } = await restoredRecord();
    await deleteGoal(g.id);
    expect(await keys()).toContain(`photo:${r.id}`);
  });
});
