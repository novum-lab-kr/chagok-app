import { createGoal, getGoal } from '../src/repositories/goalRepository';
import { placeSticker, listStickers, getSticker, removeSticker } from '../src/repositories/stickerRepository';
import { withFreshDb } from './support/setup';

withFreshDb();

async function goal() {
  return createGoal({ name: '테스트', boardType: 'tally', totalSlots: 10 });
}

describe('stickerRepository', () => {
  it('고른 스티커 종류로 붙인다', async () => {
    const g = await goal();
    const s = await placeSticker(g.id, 0, 'star');
    expect(s.goalId).toBe(g.id);
    expect(s.slotIndex).toBe(0);
    expect(s.stickerType).toBe('star');
    expect(s.placedAt).toBeGreaterThan(0);
  });

  it('종류를 안 주면 새싹이가 기본값이다', async () => {
    const g = await goal();
    expect((await placeSticker(g.id, 0)).stickerType).toBe('sprout');
  });

  it('한 판 안에서 종류를 섞어 쓸 수 있다', async () => {
    const g = await goal();
    await placeSticker(g.id, 0, 'sprout');
    await placeSticker(g.id, 1, 'flower');
    await placeSticker(g.id, 2, 'flower');
    const types = (await listStickers(g.id)).map((s) => s.stickerType);
    expect(types).toEqual(['sprout', 'flower', 'flower']);
  });

  it('다른 목표의 스티커는 섞이지 않는다', async () => {
    const a = await goal();
    const b = await goal();
    await placeSticker(a.id, 0);
    expect(await listStickers(b.id)).toHaveLength(0);
  });

  it('스티커를 뗀다', async () => {
    const g = await goal();
    const s = await placeSticker(g.id, 0);
    await removeSticker(s.id);
    expect(await getSticker(s.id)).toBeNull();
    expect(await listStickers(g.id)).toHaveLength(0);
  });

  it('목표를 지우면 스티커도 함께 사라진다', async () => {
    const g = await goal();
    const s = await placeSticker(g.id, 0);
    const { deleteGoal } = await import('../src/repositories/goalRepository');
    await deleteGoal(g.id);
    expect(await getSticker(s.id)).toBeNull();
  });

  it('id와 붙인 시각을 정해 붙일 수 있다 (위젯 요청)', async () => {
    const g = await goal();
    const at = new Date(2026, 9, 5, 23, 59).getTime();
    const s = await placeSticker(g.id, 0, 'sprout', { id: 'req-1', placedAt: at });
    expect(s.id).toBe('req-1');
    expect(s.placedAt).toBe(at);
    expect((await getSticker('req-1'))?.placedAt).toBe(at);
  });

  it('예전 시각으로 붙여도 마지막으로 붙인 시각은 뒤로 가지 않는다', async () => {
    const g = await goal();
    await placeSticker(g.id, 0);
    const before = (await getGoal(g.id))!.lastPlacedAt!;
    await placeSticker(g.id, 1, 'sprout', { placedAt: before - 60_000 });
    expect((await getGoal(g.id))!.lastPlacedAt).toBe(before);
  });
});

describe('이미 붙인 칸 (위젯 요청과 겹칠 때)', () => {
  it('적립판: 같은 칸에 두 번 붙이지 않는다', async () => {
    const g = await goal();
    await placeSticker(g.id, 3);
    await expect(placeSticker(g.id, 3)).rejects.toThrow('이미 붙인 칸입니다.');
    expect(await listStickers(g.id)).toHaveLength(1);
    await expect(placeSticker(g.id, 4)).resolves.toMatchObject({ slotIndex: 4 });
  });

  it('달력판: 같은 날에 두 번 붙이지 않는다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'calendar', totalSlots: null });
    const morning = new Date(2026, 9, 6, 8).getTime();
    await placeSticker(g.id, 5, 'sprout', { placedAt: morning });
    await expect(placeSticker(g.id, 5, 'sprout', { placedAt: new Date(2026, 9, 6, 21).getTime() }))
      .rejects.toThrow('이미 붙인 칸입니다.');
    expect(await listStickers(g.id)).toHaveLength(1);
    // 다른 날은 붙는다 (다음 날 0시, 같은 달 다른 날짜)
    await expect(placeSticker(g.id, 6, 'sprout', { placedAt: new Date(2026, 9, 7, 0).getTime() })).resolves.toMatchObject({ slotIndex: 6 });
  });
});

describe('누적 총계 (PRD 4.3)', () => {
  it('그 목표에 현재 붙어 있는 스티커 수를 센다', async () => {
    const g = await goal();
    await placeSticker(g.id, 0, 'sprout');
    await placeSticker(g.id, 1, 'star');
    const { countStickers } = await import('../src/repositories/stickerRepository');
    expect(await countStickers(g.id)).toBe(2);
  });

  it('뗀 스티커는 총계에서 빠진다', async () => {
    const g = await goal();
    const s = await placeSticker(g.id, 0);
    await placeSticker(g.id, 1);
    const { countStickers, removeSticker: rm } = await import('../src/repositories/stickerRepository');
    await rm(s.id);
    expect(await countStickers(g.id)).toBe(1);
  });

  it('다른 목표 스티커는 세지 않는다', async () => {
    const a = await goal();
    const b = await goal();
    await placeSticker(a.id, 0);
    const { countStickers } = await import('../src/repositories/stickerRepository');
    expect(await countStickers(b.id)).toBe(0);
  });
});

describe('붙이기·떼기와 목표 상태 (DEV-DESIGN 3절)', () => {
  it('붙이면 목표의 마지막으로 붙인 시각이 바뀌고, 떼도 그대로다', async () => {
    const { getGoal } = await import('../src/repositories/goalRepository');
    const g = await goal();
    const s = await placeSticker(g.id, 0);
    expect((await getGoal(g.id))?.lastPlacedAt).toBe(s.placedAt);
    await removeSticker(s.id);
    expect((await getGoal(g.id))?.lastPlacedAt).toBe(s.placedAt);
  });

  it('complete로 붙이면 같은 시각에 완성하고 완성 흐름을 기다린다', async () => {
    const { getGoal } = await import('../src/repositories/goalRepository');
    const g = await createGoal({ name: '한 칸', boardType: 'tally', totalSlots: 1 });
    const s = await placeSticker(g.id, 0, 'sprout', { complete: true });
    expect(await getGoal(g.id)).toMatchObject({ completedAt: s.placedAt, completionSeen: false });
  });

  it('완성한 판에는 붙이지 않고, 뗄 수도 없다', async () => {
    const { completeGoal } = await import('../src/repositories/goalRepository');
    const g = await goal();
    const s = await placeSticker(g.id, 0);
    await completeGoal(g.id, 1);
    await expect(placeSticker(g.id, 1)).rejects.toThrow();
    await expect(removeSticker(s.id)).rejects.toThrow();
    expect(await listStickers(g.id)).toHaveLength(1);
  });

  it('떼면 그 기록의 사진 경로를 돌려준다', async () => {
    const { upsertRecord, getRecord } = await import('../src/repositories/recordRepository');
    const g = await goal();
    const s = await placeSticker(g.id, 0);
    await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: null });
    expect(await removeSticker(s.id)).toBe('record-photo:a.jpg');
    expect(await getRecord(s.id)).toBeNull();
    const t = await placeSticker(g.id, 1);
    expect(await removeSticker(t.id)).toBeNull();
  });

  it('기간으로 읽으면 그 사이에 붙인 스티커만 준다', async () => {
    const { listStickersInRange } = await import('../src/repositories/stickerRepository');
    const g = await goal();
    const s = await placeSticker(g.id, 0);
    expect(await listStickersInRange(g.id, s.placedAt, s.placedAt + 1)).toHaveLength(1);
    expect(await listStickersInRange(g.id, s.placedAt + 1, s.placedAt + 100)).toHaveLength(0);
  });
});
