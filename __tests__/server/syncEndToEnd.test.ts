import { getDb, setDriverFactory } from '../../src/db/client';
import { randomUUID } from 'node:crypto';
import { createGoal, listGoals } from '../../src/repositories/goalRepository';
import { listBoardStickers, listStickers, placeSticker } from '../../src/repositories/stickerRepository';
import { upsertRecord } from '../../src/repositories/recordRepository';
import { pendingCount } from '../../src/sync/outbox';
import { pullOnce } from '../../src/sync/pull';
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
    const { client, userId } = await newUser();
    const server = new SupabaseSyncServer({ rpc: (fn, args) => client.rpc(fn, args) });
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 5 });
    const s = await placeSticker(g.id, 0);
    await upsertRecord(s.id, { memo: '공원 한 바퀴', photoUri: null });

    await pushOnce({ server, photos: new FakePhotos(), deviceId: 'phone' });
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });

    setDriverFactory(async () => createNodeDriver()); // 새 기기
    expect(await listGoals()).toEqual([]);
    await restoreAll({ server, userId });
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

    expect(result.held).toBe(2); // 그 목표의 스티커와 내 멤버 행(sync_push가 멤버 행이 없으면 23503)
    expect(await pendingCount()).toEqual({ pending: 0, held: 2 });
    const rows = (await server.pull(0, 100)).rows;
    expect(rows.filter((r) => r.entity === 'goal').map((r) => r.row.id)).toEqual([kept.id]);
    expect(rows.filter((r) => r.entity === 'sticker').map((r) => r.row.id)).toEqual([keptSticker.id]);
  });

  // 각자 판 함께 목표: B가 붙인 칸은 B의 판(board_user_id = B)에 들어오고 A의 내 판 목록에는 보이지 않는다.
  it('A가 각자 판 함께 목표를 만들고 B가 들어와 붙이면 A의 pullOnce로 B의 칸이 들어온다', async () => {
    const a = await newUser();
    const b = await newUser();
    const rpc = async <T>(c: typeof a.client, fn: string, args: Record<string, unknown>): Promise<T> => {
      const { data, error } = await c.rpc(fn, args);
      if (error) throw new Error(error.message);
      return data as T;
    };
    const made = await rpc<{ goal_id: string; invite_code: string }>(a.client, 'create_shared_goal', {
      p_mode: 'each', p_name: '같이 걷기', p_board_type: 'tally', p_total_slots: 10, p_end_date: null,
      p_display_name: '은주', p_sticker_id: 'basic.clover',
    });
    const joined = await rpc<{ error?: string }>(b.client, 'join_goal', { p_code: made.invite_code, p_display_name: '민수', p_sticker_id: 'basic.heart' });
    expect(joined.error).toBeUndefined();
    const stickerId = randomUUID();
    const serverB = new SupabaseSyncServer({ rpc: (fn, args) => b.client.rpc(fn, args) });
    await serverB.push('phone-b', [{
      entity: 'sticker', op: 'upsert',
      row: { id: stickerId, goal_id: made.goal_id, placed_at: 1, slot_index: 0, sticker_type: 'basic.heart', updated_at: 1, date_key: '2026-11-05', tz_offset_min: 540 },
    }]);

    const serverA = new SupabaseSyncServer({ rpc: (fn, args) => a.client.rpc(fn, args) });
    await pullOnce({ server: serverA, userId: a.userId });

    const board = await listBoardStickers(made.goal_id, b.userId);
    expect(board.map((x) => x.id)).toEqual([stickerId]);
    expect(await listStickers(made.goal_id)).toEqual([]); // 내 판(ME)에는 B의 칸이 없다
  });
});
