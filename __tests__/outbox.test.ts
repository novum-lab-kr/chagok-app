import { getDb } from '../src/db/client';
import { ack, enqueue, enqueueAll, hold, pendingCount, takeBatch } from '../src/sync/outbox';
import { subscribeLocalChange } from '../src/sync/changes';
import { withFreshDb } from './support/setup';

withFreshDb();

describe('outbox', () => {
  it('대상 하나당 한 줄이고, 다시 넣으면 queued_at이 앞으로만 간다', async () => {
    const db = await getDb();
    await enqueue(db, 'goal', 'g', 100);
    await enqueue(db, 'goal', 'g', 100); // 같은 ms에 두 번
    const batch = await takeBatch(10);
    expect(batch).toHaveLength(1);
    expect(batch[0].queuedAt).toBe(101);
  });

  it('ack는 읽은 뒤 다시 바뀐 대상을 지우지 않는다', async () => {
    const db = await getDb();
    await enqueue(db, 'sticker', 's', 100);
    const batch = await takeBatch(10);
    await enqueue(db, 'sticker', 's', 150); // 전송 중 재수정
    await ack(batch);
    const left = await takeBatch(10);
    expect(left.map((e) => [e.rowId, e.queuedAt])).toEqual([['s', 150]]);
  });

  it('보류 항목은 꺼내지 않고, 대상이 다시 바뀌면 풀린다', async () => {
    const db = await getDb();
    await enqueue(db, 'record', 'r', 100);
    const [e] = await takeBatch(10);
    await hold(e, 'invalid');
    expect(await takeBatch(10)).toHaveLength(0);
    expect(await pendingCount()).toEqual({ pending: 0, held: 1 });
    await enqueue(db, 'record', 'r', 200);
    expect(await pendingCount()).toEqual({ pending: 1, held: 0 });
  });

  it('queued_at 순으로 limit만큼 꺼낸다', async () => {
    const db = await getDb();
    await enqueue(db, 'goal', 'b', 200);
    await enqueue(db, 'goal', 'a', 100);
    await enqueue(db, 'goal', 'c', 300);
    expect((await takeBatch(2)).map((e) => e.rowId)).toEqual(['a', 'b']);
  });

  it('enqueueAll은 모든 행과 사진 있는 기록을 넣는다', async () => {
    const db = await getDb();
    await db.exec(`
      INSERT INTO goals (id, name, board_type, total_slots, created_at) VALUES ('g', '목표', 'tally', 3, 1);
      INSERT INTO stickers (id, goal_id, placed_at, slot_index) VALUES ('s1', 'g', 2, 0), ('s2', 'g', 3, 1);
      INSERT INTO records (id, sticker_id, photo_uri, created_at) VALUES ('r1', 's1', 'record-photo:a.jpg', 4);
      INSERT INTO records (id, sticker_id, memo, created_at) VALUES ('r2', 's2', '메모', 5);
    `);
    await enqueueAll(10);
    const keys = (await takeBatch(100)).map((e) => `${e.entity}:${e.rowId}`).sort();
    expect(keys).toEqual(['goal:g', 'photo:r1', 'record:r1', 'record:r2', 'sticker:s1', 'sticker:s2']);
  });

  it('비어 있으면 pendingCount는 0이다', async () => {
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('넣을 때 변경 알림을 보낸다', async () => {
    const db = await getDb();
    const fn = jest.fn();
    const off = subscribeLocalChange(fn);
    await enqueue(db, 'goal', 'g', 1);
    off();
    await enqueue(db, 'goal', 'h', 2);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
