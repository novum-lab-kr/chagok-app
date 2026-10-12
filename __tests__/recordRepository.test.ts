import { createGoal } from '../src/repositories/goalRepository';
import { placeSticker, removeSticker } from '../src/repositories/stickerRepository';
import { upsertRecord, getRecord, listRecordedStickerIds, deleteRecord, listRecordTimeline } from '../src/repositories/recordRepository';
import { withFreshDb } from './support/setup';
import { localDateKey } from '../src/domain/dates';

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

  it('사진이나 내용 있는 메모만 표식 대상으로 삼는다', async () => {
    const { goal, sticker } = await stickerOnGoal();
    const empty = await placeSticker(goal.id, 1);
    const whitespace = await placeSticker(goal.id, 2);
    const photo = await placeSticker(goal.id, 3);
    await upsertRecord(sticker.id, { photoUri: null, memo: '기록' });
    await upsertRecord(empty.id, { photoUri: null, memo: null });
    await upsertRecord(whitespace.id, { photoUri: '', memo: '   ' });
    await upsertRecord(photo.id, { photoUri: 'file:///p.jpg', memo: null });
    expect(await listRecordedStickerIds(goal.id)).toEqual(new Set([sticker.id, photo.id]));
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

describe('완성한 판 (PRD 4.7)', () => {
  it('기록을 고칠 수 있다 (2026-10-08)', async () => {
    const { completeGoal } = await import('../src/repositories/goalRepository');
    const g = await createGoal({ name: '판', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    await upsertRecord(s.id, { photoUri: null, memo: '처음' });
    await completeGoal(g.id, 1);
    await upsertRecord(s.id, { photoUri: null, memo: '고침' });
    expect((await getRecord(s.id))?.memo).toBe('고침');
  });
});

describe('기록 모아보기 (하단 탭 「기록」, 2026-10-12)', () => {
  it('사진이나 내용 있는 메모가 있는 칸만, 붙인 시각 최근 순으로 준다', async () => {
    const walk = await createGoal({ name: '걷기', boardType: 'tally', totalSlots: 10 });
    const read = await createGoal({ name: '책 읽기', boardType: 'tally', totalSlots: 10 });
    const old = await placeSticker(walk.id, 0, 'basic.shoe', { placedAt: 1_000 });
    const bare = await placeSticker(walk.id, 1, 'basic.shoe', { placedAt: 2_000 });
    const blank = await placeSticker(walk.id, 2, 'basic.shoe', { placedAt: 3_000 });
    const recent = await placeSticker(read.id, 0, 'basic.sprout', { placedAt: 4_000 });
    await upsertRecord(old.id, { photoUri: null, memo: '첫날' });
    await upsertRecord(blank.id, { photoUri: '', memo: '  ' });
    await upsertRecord(recent.id, { photoUri: 'file:///p.jpg', memo: null });
    expect(bare.id).toBeTruthy();

    const list = await listRecordTimeline();

    expect(list).toEqual([
      { stickerId: recent.id, goalId: read.id, goalName: '책 읽기', sticker: 'basic.sprout', placedAt: 4_000, dateKey: localDateKey(4_000), memo: null, photoUri: 'file:///p.jpg' },
      { stickerId: old.id, goalId: walk.id, goalName: '걷기', sticker: 'basic.shoe', placedAt: 1_000, dateKey: localDateKey(1_000), memo: '첫날', photoUri: null },
    ]);
  });

  it('완성한 판의 기록도 넣고, 지운 목표의 기록은 빠진다', async () => {
    const { completeGoal, deleteGoal } = await import('../src/repositories/goalRepository');
    const done = await createGoal({ name: '완성', boardType: 'tally', totalSlots: 1 });
    const gone = await createGoal({ name: '지움', boardType: 'tally', totalSlots: 1 });
    const a = await placeSticker(done.id, 0);
    const b = await placeSticker(gone.id, 0);
    await upsertRecord(a.id, { photoUri: null, memo: '남음' });
    await upsertRecord(b.id, { photoUri: null, memo: '사라짐' });
    await completeGoal(done.id, 1);
    await deleteGoal(gone.id);
    expect((await listRecordTimeline()).map((e) => e.memo)).toEqual(['남음']);
  });
});
