import { loadBoard } from '../src/app-data/boardData';
import { localDateKey } from '../src/domain/dates';
import { createGoal, getGoal } from '../src/repositories/goalRepository';
import { placeSticker } from '../src/repositories/stickerRepository';
import { upsertRecord } from '../src/repositories/recordRepository';
import { getDb } from '../src/db/client';
import { withFreshDb } from './support/setup';

withFreshDb();

/** 지난 날짜의 스티커. placeSticker는 지금 시각으로만 붙이므로 직접 넣는다. */
async function stickerAt(goalId: string, id: string, at: number) {
  const db = await getDb();
  await db.run('INSERT INTO stickers (id, goal_id, placed_at, slot_index, sticker_type, date_key, tz_offset_min) VALUES (?, ?, ?, ?, ?, ?, 540)', id, goalId, at, new Date(at).getDate() - 1, 'sprout', localDateKey(at));
}

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

  describe('함께 목표', () => {
    async function sharedGoal(mode: 'each' | 'one') {
      const g = await createGoal({ name: '함께', boardType: 'tally', totalSlots: 10 });
      const db = await getDb();
      await db.run('UPDATE goals SET mode = ? WHERE id = ?', mode, g.id);
      await db.run("INSERT INTO goal_members (goal_id, user_id, role, display_name, joined_at) VALUES (?, 'u-min', 'member', '민', ?)", g.id, g.createdAt + 2);
      await db.run("INSERT INTO goal_members (goal_id, user_id, role, display_name, joined_at) VALUES (?, 'u-ji', 'member', '지우', ?)", g.id, g.createdAt + 1);
      await db.run("INSERT INTO goal_members (goal_id, user_id, role, display_name, joined_at) VALUES (?, 'u-view', 'viewer', '보기', ?)", g.id, g.createdAt + 3);
      return g;
    }
    async function boardSticker(goalId: string, id: string, boardUserId: string | null, placedBy: string, slot: number) {
      await (await getDb()).run(
        'INSERT INTO stickers (id, goal_id, placed_at, slot_index, sticker_type, date_key, tz_offset_min, board_user_id, placed_by) VALUES (?, ?, ?, ?, ?, ?, 540, ?, ?)',
        id, goalId, 1000 + slot, slot, 'basic.star', '2026-09-03', boardUserId, placedBy,
      );
    }

    it('혼자 목표는 members가 빈 배열이고 friendStickers도 비어 있다', async () => {
      const g = await createGoal({ name: '혼자', boardType: 'tally', totalSlots: 5 });
      const board = await loadBoard(g.id, 2026, 9, new Date());
      expect(board).toMatchObject({ members: [], friendStickers: {} });
    });

    it('각자 판은 친구마다 그 사람 판 칸만 읽고, 내 판 칸은 stickers에 있다. 보기만 하는 사람은 뺀다', async () => {
      const g = await sharedGoal('each');
      await placeSticker(g.id, 0);
      await boardSticker(g.id, 'min-1', 'u-min', 'u-min', 3);
      await boardSticker(g.id, 'ji-1', 'u-ji', 'u-ji', 1);
      const board = await loadBoard(g.id, 2026, 9, new Date());
      expect(board?.members.map((m) => m.userId)).toEqual(['me', 'u-ji', 'u-min']);
      expect(board?.stickers.map((s) => s.slotIndex)).toEqual([0]);
      expect(Object.fromEntries(Object.entries(board!.friendStickers).map(([user, list]) => [user, list.map((s) => s.id)])))
        .toEqual({ 'u-ji': ['ji-1'], 'u-min': ['min-1'] });
    });

    it('한 판은 판 하나의 칸을 모두 stickers로 읽고(가려진 칸 포함) friendStickers는 비어 있다', async () => {
      const g = await sharedGoal('one');
      await boardSticker(g.id, 'a', null, 'u-min', 0);
      await (await getDb()).run(
        "INSERT INTO stickers (id, goal_id, placed_at, slot_index, sticker_type, date_key, tz_offset_min, board_user_id, placed_by) VALUES ('hid', ?, 5, 1, NULL, '2026-09-03', 540, NULL, 'u-gone')", g.id,
      );
      const board = await loadBoard(g.id, 2026, 9, new Date());
      expect(board?.stickers.map((s) => [s.id, s.stickerType])).toEqual([['a', 'basic.star'], ['hid', '']]);
      expect(board).toMatchObject({ placedAll: 2, friendStickers: {} });
    });

    it('한 판 달력판의 placedAll은 스티커가 있는 날 수다(같은 날 두 장은 하루, 가려진 칸 포함)', async () => {
      const g = await sharedGoal('one');
      const db = await getDb();
      await db.run("UPDATE goals SET board_type = 'calendar', total_slots = NULL WHERE id = ?", g.id);
      await boardSticker(g.id, 'a', null, 'u-min', 2);
      await boardSticker(g.id, 'b', null, 'me', 2);
      await db.run(
        "INSERT INTO stickers (id, goal_id, placed_at, slot_index, sticker_type, date_key, tz_offset_min, board_user_id, placed_by) VALUES ('hid', ?, 5, 3, NULL, '2026-09-04', 540, NULL, 'u-gone')", g.id,
      );
      const board = await loadBoard(g.id, 2026, 9, new Date(2026, 8, 10));
      expect(board?.stickers).toHaveLength(3);
      expect(board?.placedAll).toBe(2);
    });
  });
});
