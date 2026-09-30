import { loadBoard, monthRange } from '../src/app-data/boardData';
import { createGoal, getGoal } from '../src/repositories/goalRepository';
import { placeSticker } from '../src/repositories/stickerRepository';
import { upsertRecord } from '../src/repositories/recordRepository';
import { getDb } from '../src/db/client';
import { withFreshDb } from './support/setup';

withFreshDb();

/** 지난 날짜의 스티커. placeSticker는 지금 시각으로만 붙이므로 직접 넣는다. */
async function stickerAt(goalId: string, id: string, at: number) {
  const db = await getDb();
  await db.run('INSERT INTO stickers (id, goal_id, placed_at, slot_index, sticker_type) VALUES (?, ?, ?, ?, ?)', id, goalId, at, new Date(at).getDate() - 1, 'sprout');
}

describe('monthRange', () => {
  it('그 달 1일 0시부터 다음 달 1일 0시 전까지 (로컬)', () => {
    expect(monthRange(2026, 12)).toEqual([new Date(2026, 11, 1).getTime(), new Date(2027, 0, 1).getTime()]);
  });
});

describe('loadBoard', () => {
  it('없는 목표면 null', async () => {
    expect(await loadBoard('none', 2026, 9, new Date())).toBeNull();
  });

  it('적립판은 스티커를 모두 읽고, 기록 있는 스티커를 표시한다', async () => {
    const g = await createGoal({ name: '적립', boardType: 'tally', totalSlots: 5 });
    const a = await placeSticker(g.id, 0);
    await placeSticker(g.id, 3);
    await upsertRecord(a.id, { photoUri: null, memo: '메모' });
    const now = new Date();
    const board = await loadBoard(g.id, now.getFullYear(), now.getMonth() + 1, now);
    expect(board?.stickers.map((s) => s.slotIndex)).toEqual([0, 3]);
    expect(board).toMatchObject({ placedAll: 2, placedInBasis: 2 });
    expect([...board!.recordedIds]).toEqual([a.id]);
  });

  it('달력판은 보고 있는 달만 읽고, 전체 수는 따로 센다', async () => {
    const g = await createGoal({ name: '달력', boardType: 'calendar', totalSlots: null });
    await stickerAt(g.id, 'aug', new Date(2026, 7, 20, 9).getTime());
    await stickerAt(g.id, 'sep', new Date(2026, 8, 3, 9).getTime());
    const now = new Date(2026, 8, 29, 10);
    const board = await loadBoard(g.id, 2026, 8, now);
    expect(board?.stickers.map((s) => s.id)).toEqual(['aug']);
    expect(board).toMatchObject({ placedAll: 2, placedInBasis: 1 });
  });

  it('읽기 전에 종료일이 지난 판을 완성한다', async () => {
    const g = await createGoal({ name: '달력', boardType: 'calendar', totalSlots: null, endDate: '2026-09-23' });
    const board = await loadBoard(g.id, 2026, 9, new Date(2026, 8, 29, 10));
    expect(board?.goal.completedAt).toBe(new Date(2026, 8, 24).getTime());
    expect((await getGoal(g.id))?.completionSeen).toBe(false);
  });
});
