import { createGoal } from '../src/repositories/goalRepository';
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
