import { getDb } from '../src/db/client';
import { createGoal, deleteGoal, reorderGoals, updateGoal } from '../src/repositories/goalRepository';
import { getSticker, placeSticker, removeSticker } from '../src/repositories/stickerRepository';
import { upsertRecord } from '../src/repositories/recordRepository';
import { pendingCount, takeBatch } from '../src/sync/outbox';
import { pushOnce } from '../src/sync/push';
import { AccountChanged, refetchGoal } from '../src/sync/pull';
import { PhotoRejected } from '../src/sync/contract';
import type { V2Change } from '../src/sync/contract';
import { FakePhotos, FakeServer } from './support/fakeServer';
import { withFreshDb } from './support/setup';

withFreshDb();

const setup = () => ({ server: new FakeServer(), photos: new FakePhotos(), deviceId: 'd1' });

describe('pushOnce', () => {
  it('행을 올리고 outbox를 비운다', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    await pushOnce(deps);
    expect(deps.server.live('goal')).toEqual([g.id]);
    expect(deps.server.live('sticker')).toEqual([s.id]);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('네트워크 오류면 던지고 outbox를 그대로 둔다', async () => {
    const deps = setup();
    await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    deps.server.failNext = 1;
    await expect(pushOnce(deps)).rejects.toThrow('network');
    expect((await pendingCount()).pending).toBe(2); // 목표와 내 멤버 행
  });

  it('서버는 반영했는데 응답을 잃으면, 다시 보내도 결과가 같다', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    deps.server.applyThenFail = true;
    await expect(pushOnce(deps)).rejects.toThrow();
    await pushOnce(deps);
    expect(deps.server.live('goal')).toEqual([g.id]);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('사진을 올린 뒤 기록 행에 서버 경로를 남겨 올린다', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    const r = await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: null });
    await pushOnce(deps);
    expect(deps.server.recordRow(r.id)?.photo_remote_path).toBe(`u/${r.id}.jpg`);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('떼면 서버에서도 스티커와 기록이 사라지고 사진도 지워진다', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    const r = await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: '메모' });
    await pushOnce(deps);
    expect(deps.photos.remote.has(`u/${r.id}.jpg`)).toBe(true);
    await removeSticker(s.id);
    await pushOnce(deps);
    expect(deps.server.live('sticker')).toEqual([]);
    expect(deps.server.live('record')).toEqual([]);
    expect(deps.photos.remote.size).toBe(0);
  });

  it('기기 사진이 사라졌으면 사진 항목을 버리고 나머지는 올린다', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    await upsertRecord(s.id, { photoUri: 'record-photo:gone.jpg', memo: '메모' });
    deps.photos.missingLocal.add('record-photo:gone.jpg');
    await pushOnce(deps);
    expect(deps.photos.remote.size).toBe(0);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('거부된 항목만 보류하고 나머지는 올린다', async () => {
    const deps = setup();
    const a = await createGoal({ name: 'a', boardType: 'tally', totalSlots: 3 });
    const b = await createGoal({ name: 'b', boardType: 'tally', totalSlots: 3 });
    deps.server.reject.add(a.id);
    const result = await pushOnce(deps);
    expect(deps.server.live('goal')).toEqual([b.id]);
    expect(result.held).toBe(2); // 목표 행과 내 멤버 행 모두 그 목표 id라 둘 다 거부된다
    expect(await pendingCount()).toEqual({ pending: 0, held: 2 });
  });

  it('묶음 크기로 나눠 보낸다', async () => {
    const deps = setup();
    for (let i = 0; i < 5; i++) await createGoal({ name: `g${i}`, boardType: 'tally', totalSlots: 1 });
    await pushOnce({ ...deps, batchSize: 2 });
    expect(deps.server.pushes).toBe(5); // 목표 5개와 멤버 5개, 2개씩
    expect(deps.server.live('goal')).toHaveLength(5);
  });

  it('목표를 지우면 서버의 딸린 행이 모두 표식된다', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    await upsertRecord(s.id, { photoUri: null, memo: '메모' });
    await pushOnce(deps);
    await deleteGoal(g.id);
    await pushOnce(deps);
    expect([deps.server.live('goal'), deps.server.live('sticker'), deps.server.live('record')]).toEqual([[], [], []]);
  });

  it('보내는 동안 같은 목표가 다시 바뀌면 그 수정도 올라간다 (Review Focus 1)', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const realPush = deps.server.push.bind(deps.server);
    let once = true;
    deps.server.push = async (id, changes) => {
      const result = await realPush(id, changes);
      if (once) { once = false; await updateGoal(g.id, { name: '걷기' }); }
      return result;
    };
    await pushOnce(deps);
    expect(deps.server.goalRow(g.id)?.name).toBe('걷기');
    expect(await takeBatch(10)).toEqual([]);
  });
});

describe('기기 DB v2가 모든 목표를 다시 올릴 때 (PRD 4.1, 2026-10-30)', () => {
  it('다른 기기에서 지운 목표는 서버에서 되살아나지 않는다', async () => {
    const deps = setup();
    const kept = await createGoal({ name: '남길 목표', boardType: 'tally', totalSlots: 3 });
    const removed = await createGoal({ name: '지운 목표', boardType: 'tally', totalSlots: 3 });
    await pushOnce(deps);
    await deps.server.push('d2', [{ entity: 'goal', op: 'delete', id: removed.id, deletedAt: Date.now() }]);

    // v2 마이그레이션과 같은 동작: updated_at은 그대로 두고 outbox에만 넣는다
    await (await getDb()).run(`INSERT INTO outbox (entity, row_id, queued_at) SELECT 'goal', id, 1 FROM goals WHERE true`);
    await pushOnce(deps);

    expect(deps.server.live('goal')).toEqual([kept.id]);
  });
});

describe('사진 실패 격리 (리뷰 #1)', () => {
  it('사진 업로드가 네트워크 오류여도 행은 올라가고, 사진은 남아 다시 시도한다', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    const r = await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: '메모' });
    deps.photos.failUpload = new Error('network');
    await expect(pushOnce(deps)).rejects.toThrow('network');
    expect([deps.server.live('goal'), deps.server.live('sticker'), deps.server.live('record')]).toEqual([[g.id], [s.id], [r.id]]);
    expect(await pendingCount()).toEqual({ pending: 1, held: 0 });
    deps.photos.failUpload = null;
    await pushOnce(deps);
    expect(deps.photos.remote.has(`u/${r.id}.jpg`)).toBe(true);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('사진이 내용 때문에 거부되면 그 사진만 보류한다', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    await upsertRecord(s.id, { photoUri: 'record-photo:broken.jpg', memo: null });
    deps.photos.failUpload = new PhotoRejected('decode failed');
    const result = await pushOnce(deps);
    expect(result.held).toBe(1);
    expect(deps.server.live('sticker')).toEqual([s.id]);
    expect(await pendingCount()).toEqual({ pending: 0, held: 1 });
  });
});

describe('사진과 기록이 한 묶음일 때 (리뷰 #4)', () => {
  it('사진 경로를 기록한 뒤 행을 한 번만 보낸다', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: null });
    const result = await pushOnce(deps);
    expect(deps.server.pushes).toBe(1);
    expect(result.sent).toBe(4); // 목표, 멤버, 스티커, 기록
  });
});

describe('2판 행 (api_v2.sql sync_push)', () => {
  /** 보낸 변경을 모은다 */
  const spy = (server: FakeServer) => {
    const sent: V2Change[] = [];
    const real = server.push.bind(server);
    server.push = async (id, changes) => { sent.push(...changes); return real(id, changes); };
    return sent;
  };

  it('혼자 목표는 1.1.0 목표 행으로, 순서 변경은 내 멤버 행으로 보낸다', async () => {
    const deps = setup();
    const a = await createGoal({ name: 'a', boardType: 'tally', totalSlots: 3, defaultStickerId: 'basic.star' });
    const b = await createGoal({ name: 'b', boardType: 'tally', totalSlots: 3 });
    const sent = spy(deps.server);
    await pushOnce(deps);
    expect(sent.find((c) => c.entity === 'goal' && c.op === 'upsert' && c.row.id === a.id)).toMatchObject({
      row: { name: 'a', default_sticker_id: 'basic.star', board_type: 'tally', total_slots: 3 },
    });
    sent.length = 0;
    await reorderGoals([b.id, a.id]);
    await pushOnce(deps);
    expect(sent.map((c) => c.entity)).toEqual(['member', 'member']);
    expect(sent.find((c) => c.entity === 'member' && c.op === 'upsert' && c.row.goal_id === a.id)).toEqual({ entity: 'member', op: 'upsert', row: {
      goal_id: a.id, sort_order: 1, completed_at: null, completion_seen: 0, last_placed_at: null,
      updated_at: expect.any(Number), sticker_id: 'basic.star',
    } });
  });

  it('함께 목표의 목표 항목은 보내지 않고 지우고, 멤버 행에는 기본 스티커를 싣지 않는다', async () => {
    const deps = setup();
    const owner = deps.server.as('friend');
    const { goalId, inviteCode } = owner.createSharedGoal({ mode: 'each' });
    deps.server.join(inviteCode, '지우', 'basic.star');
    await refetchGoal({ server: deps.server, userId: deps.server.userId }, goalId);
    const db = await getDb();
    await db.run("INSERT INTO outbox (entity, row_id, queued_at) VALUES ('goal', ?, 1), ('member', ?, 1)", goalId, goalId);
    const sent = spy(deps.server);
    await pushOnce(deps);
    expect(sent).toEqual([{ entity: 'member', op: 'upsert', row: {
      goal_id: goalId, sort_order: null, completed_at: null, completion_seen: 0, last_placed_at: null, updated_at: expect.any(Number),
    } }]);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('한 판에서 이미 붙은 칸이면(slot_taken) 기기에서 칸과 기록을 지우고 다시 보내지 않는다', async () => {
    const deps = setup();
    const owner = deps.server.as('friend');
    const { goalId, inviteCode } = owner.createSharedGoal({ mode: 'one' });
    deps.server.join(inviteCode, '지우', 'basic.star');
    await refetchGoal({ server: deps.server, userId: deps.server.userId }, goalId);
    await owner.push('d2', [{ entity: 'sticker', op: 'upsert', row: {
      id: 'friend-cell', goal_id: goalId, placed_at: 1, slot_index: 0, sticker_type: 'basic.clover', updated_at: 1,
      date_key: '2026-11-05', tz_offset_min: 540,
    } }]);
    const mine = await placeSticker(goalId, 0); // 아직 친구 칸을 받지 못했다
    const r = await upsertRecord(mine.id, { photoUri: 'record-photo:a.jpg', memo: '메모' });
    const taken: [string, string | null][] = [];
    const result = await pushOnce({ ...deps, onSlotTaken: (id, uri) => taken.push([id, uri]) });
    expect(taken).toEqual([[mine.id, 'record-photo:a.jpg']]);
    expect(result.held).toBe(0);
    expect(await getSticker(mine.id)).toBeNull();
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
    expect(deps.server.live('sticker')).toEqual(['friend-cell']);
    expect(deps.server.recordRow(r.id)).toBeUndefined();
    expect(deps.photos.remote.size).toBe(0); // 먼저 올린 사진도 지운다
    const pushes = deps.server.pushes;
    await pushOnce(deps);
    expect(deps.server.pushes).toBe(pushes);
  });

  it('보내기 전에 계정이 바뀌었으면 서버를 부르지 않고 AccountChanged로 멈춘다', async () => {
    const deps = setup();
    await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const pending = (await pendingCount()).pending;
    await expect(pushOnce({ ...deps, userId: deps.server.userId, currentUserId: async () => 'user-b' }))
      .rejects.toBeInstanceOf(AccountChanged);
    expect(deps.server.pushes).toBe(0);
    expect((await pendingCount()).pending).toBe(pending);
  });

  it('보낸 뒤 거절을 반영하기 전에 계정이 바뀌면 기기 칸을 지우지 않는다', async () => {
    const deps = setup();
    const owner = deps.server.as('friend');
    const { goalId, inviteCode } = owner.createSharedGoal({ mode: 'one' });
    deps.server.join(inviteCode, '지우', 'basic.star');
    await refetchGoal({ server: deps.server, userId: deps.server.userId }, goalId);
    await owner.push('d2', [{ entity: 'sticker', op: 'upsert', row: {
      id: 'friend-cell', goal_id: goalId, placed_at: 1, slot_index: 0, sticker_type: 'basic.clover', updated_at: 1,
      date_key: '2026-11-05', tz_offset_min: 540,
    } }]);
    const mine = await placeSticker(goalId, 0);
    let calls = 0;
    const taken: string[] = [];
    // 보내기 직전 확인은 지나고, 거절을 반영하기 직전 확인에서 바뀌었다
    const currentUserId = async () => (++calls > 1 ? 'user-b' : deps.server.userId);
    await expect(pushOnce({ ...deps, userId: deps.server.userId, currentUserId, onSlotTaken: (id) => taken.push(id) }))
      .rejects.toBeInstanceOf(AccountChanged);
    expect(await getSticker(mine.id)).not.toBeNull();
    expect(taken).toEqual([]);
  });

  it('내 행이 아니면(not_allowed) 그 항목만 보류하고 나머지는 올린다', async () => {
    const deps = setup();
    const owner = deps.server.as('friend');
    const { goalId, inviteCode } = owner.createSharedGoal({ mode: 'one' });
    deps.server.join(inviteCode, '지우', 'basic.star');
    await refetchGoal({ server: deps.server, userId: deps.server.userId }, goalId);
    const cell = await placeSticker(goalId, 1);
    const solo = await createGoal({ name: '혼자', boardType: 'tally', totalSlots: 3 });
    owner.kick(goalId, deps.server.userId); // 올리기 전에 내보내졌다
    const result = await pushOnce(deps);
    expect(result.held).toBe(2); // 그 목표의 칸과 내 멤버 행
    expect((await takeBatch(10, {})).length).toBe(0);
    const db = await getDb();
    expect(await db.all('SELECT entity, row_id, last_error FROM outbox ORDER BY entity')).toEqual([
      { entity: 'member', row_id: goalId, last_error: 'not_allowed' },
      { entity: 'sticker', row_id: cell.id, last_error: 'not_allowed' },
    ]);
    expect(deps.server.live('goal')).toContain(solo.id);
  });
});
