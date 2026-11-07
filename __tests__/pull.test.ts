import { randomUUID } from 'node:crypto';
import { getDb } from '../src/db/client';
import { createGoal, getGoal, listGoals, reorderGoals, updateGoal } from '../src/repositories/goalRepository';
import { listMembers } from '../src/repositories/memberRepository';
import { getRecord, upsertRecord } from '../src/repositories/recordRepository';
import { listBoardStickers, listStickers, placeSticker } from '../src/repositories/stickerRepository';
import { getSetting } from '../src/repositories/appSettingsRepository';
import { pendingCount } from '../src/sync/outbox';
import { AccountChanged, pullOnce, refetchGoal } from '../src/sync/pull';
import { pushOnce } from '../src/sync/push';
import { FakePhotos, FakeServer } from './support/fakeServer';
import { goal } from './support/syncServerContract';
import { withFreshDb } from './support/setup';

withFreshDb();

const FRIEND = 'friend-id';
const depsOf = (server: FakeServer) => ({ server, userId: server.userId });
const push = (server: FakeServer, photos = new FakePhotos()) => pushOnce({ server, photos, deviceId: 'phone' });

/** 친구가 만든 함께 목표에 내가 들어간다 */
function joinShared(server: FakeServer, mode: 'each' | 'one') {
  const friend = server.as(FRIEND);
  const { goalId, inviteCode } = friend.createSharedGoal({ mode, displayName: '은주', stickerId: 'basic.clover' });
  server.join(inviteCode, '지우', 'basic.star');
  return { friend, goalId };
}

const friendCell = (goalId: string, slot = 0) => ({
  entity: 'sticker' as const, op: 'upsert' as const, row: {
    id: randomUUID(), goal_id: goalId, placed_at: 1, slot_index: slot, sticker_type: 'basic.clover', updated_at: 1,
    date_key: '2026-11-05', tz_offset_min: 540,
  },
});

describe('pullOnce', () => {
  it('다른 기기에서 고친 이름과 새 기록을 받고, 사진은 받을 목록에 둔다', async () => {
    const server = new FakeServer();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 10 });
    const s = await placeSticker(g.id, 0);
    await push(server);
    const later = Date.now() + 1000;
    const recordId = randomUUID();
    await server.push('tablet', [
      { entity: 'goal', op: 'upsert', row: { ...goal(g.id, later, '걷기'), default_sticker_id: g.defaultStickerId } },
      { entity: 'record', op: 'upsert', row: { id: recordId, sticker_id: s.id, memo: '공원', photo_remote_path: 'u/x.jpg', created_at: 1, updated_at: later } },
    ]);
    const result = await pullOnce(depsOf(server));
    expect(result.applied).toBeGreaterThan(0);
    expect((await getGoal(g.id))?.name).toBe('걷기');
    expect((await getRecord(s.id))?.memo).toBe('공원');
    expect(JSON.parse((await getSetting('pendingPhotoDownloads'))!)).toEqual([{ recordId, remotePath: 'u/x.jpg' }]);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 }); // 받아 오기는 outbox를 만들지 않는다
  });

  it('로그인 전에 만든 목표를 올리고 받아도 한 줄이고, 기기 안의 나는 me다', async () => {
    const server = new FakeServer();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 10 });
    await placeSticker(g.id, 0);
    await push(server);
    await pullOnce(depsOf(server));
    await pullOnce(depsOf(server));
    const db = await getDb();
    expect((await listGoals()).map((x) => x.id)).toEqual([g.id]);
    expect(await db.all('SELECT owner_id FROM goals')).toEqual([{ owner_id: 'me' }]);
    expect(await db.all('SELECT user_id FROM goal_members')).toEqual([{ user_id: 'me' }]);
    expect(await db.all('SELECT board_user_id, placed_by FROM stickers')).toEqual([{ board_user_id: 'me', placed_by: 'me' }]);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('함께 목표에 들어가면 pull_goal로 목표, 멤버, 친구 칸까지 받는다', async () => {
    const server = new FakeServer();
    const { friend, goalId } = joinShared(server, 'each');
    await friend.push('d', [friendCell(goalId)]);
    const result = await pullOnce(depsOf(server));
    expect(result.refetched).toEqual([goalId]);
    expect(await getGoal(goalId)).toMatchObject({ mode: 'each', role: 'member', name: '같이 걷기' });
    expect((await listMembers(goalId)).map((m) => [m.userId, m.displayName, m.isMe])).toEqual([
      [FRIEND, '은주', false], ['me', '지우', true],
    ]);
    expect((await listBoardStickers(goalId, FRIEND)).map((s) => [s.boardUserId, s.placedBy])).toEqual([[FRIEND, FRIEND]]);
    expect(await listStickers(goalId)).toEqual([]); // 친구 판은 내 판 목록에 섞이지 않는다
    expect(await getSetting('pendingGoalSync')).toBeNull();
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('사라진 사람(gone)은 그 사람 멤버 행과 판만 지우고 내 판은 남긴다', async () => {
    const server = new FakeServer();
    const { friend, goalId } = joinShared(server, 'each');
    await friend.push('d', [friendCell(goalId)]);
    await pullOnce(depsOf(server));
    const mine = await placeSticker(goalId, 0);
    await push(server);
    friend.leave(goalId);
    await pullOnce(depsOf(server));
    expect((await listMembers(goalId)).map((m) => m.userId)).toEqual(['me']);
    expect(await listBoardStickers(goalId, FRIEND)).toEqual([]);
    expect((await listStickers(goalId)).map((s) => s.id)).toEqual([mine.id]);
    expect((await getGoal(goalId))?.role).toBe('owner'); // 만든 사람이 나가 내가 이어받았다
  });

  it('한 판에서 내보내지면 그 목표를 기기에서 지우고 지운 사진 경로를 돌려준다', async () => {
    const server = new FakeServer();
    const { friend, goalId } = joinShared(server, 'one');
    await pullOnce(depsOf(server));
    const s = await placeSticker(goalId, 0);
    await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: null });
    await push(server);
    friend.kick(goalId, server.userId);
    const result = await pullOnce(depsOf(server));
    expect(await getGoal(goalId)).toBeNull();
    expect(result.removedPhotoUris).toEqual(['record-photo:a.jpg']);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('같은 계정의 다른 기기에서 마지막으로 나가 서버가 목표를 지우면, 이 기기도 내 멤버 행의 나감 표시를 받아 목표를 지운다', async () => {
    const server = new FakeServer();
    const { goalId, inviteCode } = server.createSharedGoal({ mode: 'one', displayName: '은주', stickerId: 'basic.clover' });
    server.as(FRIEND).join(inviteCode, '지우', 'basic.star');
    await pullOnce(depsOf(server));
    expect(await getGoal(goalId)).not.toBeNull();
    server.as(FRIEND).leave(goalId);
    server.leave(goalId); // 다른 기기. 마지막 사람이라 서버가 목표를 지운다
    expect(server.goalRow(goalId)).toBeUndefined();
    await pullOnce(depsOf(server));
    expect(await getGoal(goalId)).toBeNull();
  });

  it('각자 판에서 내보내지면 새 혼자 목표가 들어오고 내 칸과 기록 사진이 그대로 옮겨 간다', async () => {
    const server = new FakeServer();
    const { friend, goalId } = joinShared(server, 'each');
    await pullOnce(depsOf(server));
    const s = await placeSticker(goalId, 0);
    await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: '메모' });
    await push(server);
    friend.kick(goalId, server.userId);
    const result = await pullOnce(depsOf(server));
    expect(await getGoal(goalId)).toBeNull();
    const goals = await listGoals();
    expect(goals.map((x) => [x.mode, x.name])).toEqual([['solo', '같이 걷기']]);
    expect((await listStickers(goals[0].id)).map((x) => x.id)).toEqual([s.id]);
    expect(await getRecord(s.id)).toMatchObject({ photoUri: 'record-photo:a.jpg', memo: '메모' });
    expect(result.removedPhotoUris).toEqual([]);
    expect(await getSetting('pendingPhotoDownloads')).toBeNull(); // 이미 기기에 있는 사진은 다시 받지 않는다
  });

  it('새 혼자 목표를 먼저 다시 받은 뒤 나간 목표를 지워도 기록 사진이 남는다', async () => {
    const server = new FakeServer();
    const { goalId } = joinShared(server, 'each');
    await pullOnce(depsOf(server));
    const s = await placeSticker(goalId, 0);
    await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: null });
    await push(server);
    const solo = server.leave(goalId)!;
    await refetchGoal(depsOf(server), solo); // 나가기 화면이 바로 받는 경우
    const result = await pullOnce(depsOf(server));
    expect((await listGoals()).map((x) => x.id)).toEqual([solo]);
    expect((await getRecord(s.id))?.photoUri).toBe('record-photo:a.jpg');
    expect(result.removedPhotoUris).toEqual([]);
  });

  it('outbox에 남은 내 변경은 덮지 않는다', async () => {
    const server = new FakeServer();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 10 });
    await push(server);
    await updateGoal(g.id, { name: '기기' });
    await server.push('tablet', [{ entity: 'goal', op: 'upsert', row: { ...goal(g.id, Date.now() + 1000, '서버'), default_sticker_id: g.defaultStickerId } }]);
    await pullOnce(depsOf(server));
    expect((await getGoal(g.id))?.name).toBe('기기');
    expect((await pendingCount()).pending).toBe(1);
  });

  it('받는 도중 끊기면 커서는 반영한 쪽까지만 가고, 다시 받으면 같은 결과다', async () => {
    const server = new FakeServer();
    const ids = [randomUUID(), randomUUID(), randomUUID()];
    await server.push('tablet', ids.map((id, i) => ({ entity: 'goal' as const, op: 'upsert' as const, row: goal(id, 1, `목표${i}`) })));
    const firstCursor = (await server.pull(0, 2)).cursor;
    const real = server.pull.bind(server);
    let calls = 0;
    server.pull = async (since, limit) => { if (++calls === 2) throw new Error('network'); return real(since, limit); };
    await expect(pullOnce({ ...depsOf(server), pageSize: 2 })).rejects.toThrow('network');
    expect(await getSetting('syncCursor')).toBe(String(firstCursor));
    await pullOnce({ ...depsOf(server), pageSize: 2 });
    await (await getDb()).run("DELETE FROM app_settings WHERE key = 'syncCursor'");
    await pullOnce({ ...depsOf(server), pageSize: 2 }); // 처음부터 다시 받아도 같다
    expect((await listGoals()).map((x) => x.name).sort()).toEqual(['목표0', '목표1', '목표2']);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });
  it('내가 차단하면 그 사람과 판이 사라지고, 풀면 다시 받는다', async () => {
    const server = new FakeServer();
    const { friend, goalId } = joinShared(server, 'each');
    await friend.push('d', [friendCell(goalId)]);
    await pullOnce(depsOf(server));
    server.block(FRIEND);
    expect((await pullOnce(depsOf(server))).refetched).toEqual([goalId]);
    expect((await listMembers(goalId)).map((m) => m.userId)).toEqual(['me']);
    expect(await listBoardStickers(goalId, FRIEND)).toEqual([]);
    server.unblock(FRIEND);
    await pullOnce(depsOf(server));
    expect((await listMembers(goalId)).map((m) => m.userId)).toEqual([FRIEND, 'me']);
    expect(await listBoardStickers(goalId, FRIEND)).toHaveLength(1);
  });
  it('내보내진 뒤 붙여 보류된 칸과 멤버 항목은 그 목표를 지울 때 outbox에서도 사라진다', async () => {
    const server = new FakeServer();
    const { friend, goalId } = joinShared(server, 'one');
    await pullOnce(depsOf(server));
    await placeSticker(goalId, 1);
    friend.kick(goalId, server.userId); // 올리기 전에 내보내졌다
    expect((await push(server)).held).toBe(2); // 칸과 내 멤버 행이 not_allowed
    await pullOnce(depsOf(server));
    expect(await getGoal(goalId)).toBeNull();
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('각자 판에서 나갈 때 아직 올리지 않은 내 칸도 새 혼자 목표로 따라가 기록 사진이 남는다', async () => {
    const server = new FakeServer();
    const { friend, goalId } = joinShared(server, 'each');
    await pullOnce(depsOf(server));
    const s = await placeSticker(goalId, 0);
    await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: null });
    await push(server);
    // 서버에는 있지만 다시 올릴 칸(연결 직후 enqueueAll, ack를 받기 전에 끊김 등)
    await (await getDb()).run("INSERT INTO outbox (entity, row_id, queued_at) VALUES ('sticker', ?, 1)", s.id);
    friend.kick(goalId, server.userId);
    const result = await pullOnce(depsOf(server));
    const [solo] = await listGoals();
    expect(solo.mode).toBe('solo');
    expect((await listStickers(solo.id)).map((x) => x.id)).toEqual([s.id]);
    expect((await getRecord(s.id))?.photoUri).toBe('record-photo:a.jpg');
    expect(result.removedPhotoUris).toEqual([]);
    await push(server);
    expect(server.live('sticker')).toEqual([s.id]); // 올려도 서버 칸이 지워지지 않는다
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('다른 사람이 만든 목표의 만든 사람 id는 기기에 남기지 않는다(내가 만든 목표만 me)', async () => {
    const server = new FakeServer();
    const { goalId } = joinShared(server, 'each');
    await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    await push(server);
    await pullOnce(depsOf(server));
    const db = await getDb();
    expect(await db.first('SELECT owner_id FROM goals WHERE id = ?', goalId)).toEqual({ owner_id: null });
    expect(JSON.stringify(await db.all('SELECT * FROM goals'))).not.toContain(FRIEND);
    expect((await getGoal(goalId))?.role).toBe('member'); // 만든 사람인지는 멤버 행의 role로 안다
  });

  it('함께 목표에 목표 항목이 outbox에 남아 있어도 내보내지면 기기에서 지운다', async () => {
    const server = new FakeServer();
    const { friend, goalId } = joinShared(server, 'one');
    await pullOnce(depsOf(server));
    await (await getDb()).run("INSERT INTO outbox (entity, row_id, queued_at) VALUES ('goal', ?, 1)", goalId);
    friend.kick(goalId, server.userId);
    await pullOnce(depsOf(server));
    expect(await getGoal(goalId)).toBeNull();
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('도는 사이 로그인한 계정이 바뀌면 받은 행을 쓰지 않고 커서도 그대로 둔다', async () => {
    const server = new FakeServer();
    await server.push('tablet', [{ entity: 'goal', op: 'upsert', row: goal(randomUUID(), 1, '다른 계정 목표') }]);
    let current: string | null = server.userId;
    const real = server.pull.bind(server);
    server.pull = async (since, limit) => { const page = await real(since, limit); current = 'user-b'; return page; };
    await expect(pullOnce({ ...depsOf(server), currentUserId: async () => current })).rejects.toBeInstanceOf(AccountChanged);
    expect(await listGoals()).toEqual([]);
    expect(await getSetting('syncCursor')).toBeNull();
  });

  it('계정이 그대로면 확인을 거쳐도 평소처럼 받는다', async () => {
    const server = new FakeServer();
    await server.push('tablet', [{ entity: 'goal', op: 'upsert', row: goal(randomUUID(), 1, '독서') }]);
    await pullOnce({ ...depsOf(server), currentUserId: async () => server.userId });
    expect((await listGoals()).map((g) => g.name)).toEqual(['독서']);
  });

  it('outbox에 남은 내 멤버 행 변경(순서)은 다른 기기 값으로 덮지 않는다', async () => {
    const server = new FakeServer();
    const a = await createGoal({ name: 'a', boardType: 'tally', totalSlots: 3 });
    const b = await createGoal({ name: 'b', boardType: 'tally', totalSlots: 3 });
    await push(server);
    await reorderGoals([a.id, b.id]); // a 0, b 1 — 아직 올리지 않았다
    await server.push('tablet', [{ entity: 'member', op: 'upsert', row: {
      goal_id: b.id, sort_order: 9, completed_at: null, completion_seen: 0, last_placed_at: null, updated_at: Date.now() + 1000,
    } }]);
    await pullOnce(depsOf(server));
    expect((await getGoal(b.id))?.sortOrder).toBe(1);
    expect((await pendingCount()).pending).toBe(1);
  });
});

describe('refetchGoal', () => {
  it('목표를 받는 사이 계정이 바뀌면 기기에 쓰지 않는다', async () => {
    const server = new FakeServer();
    const { goalId } = joinShared(server, 'each');
    let current: string | null = server.userId;
    const real = server.pullGoal.bind(server);
    server.pullGoal = async (id) => { const snap = await real(id); current = 'user-b'; return snap; };
    await expect(refetchGoal({ ...depsOf(server), currentUserId: async () => current }, goalId)).rejects.toBeInstanceOf(AccountChanged);
    expect(await getGoal(goalId)).toBeNull();
  });

  it('멤버가 아니면(not_member) 그 목표를 기기에서 지운다', async () => {
    const server = new FakeServer();
    const { friend, goalId } = joinShared(server, 'one');
    await pullOnce(depsOf(server));
    friend.kick(goalId, server.userId);
    await refetchGoal(depsOf(server), goalId);
    expect(await getGoal(goalId)).toBeNull();
    expect(await listMembers(goalId)).toEqual([]);
  });

  it('스냅숏에 없는 칸은 지우되 아직 올리지 않은 내 칸은 남긴다', async () => {
    const server = new FakeServer();
    const { friend, goalId } = joinShared(server, 'one');
    const cell = friendCell(goalId, 3);
    await friend.push('d', [cell]);
    await pullOnce(depsOf(server));
    const mine = await placeSticker(goalId, 0); // 아직 올리지 않았다
    await friend.push('d', [{ entity: 'sticker', op: 'delete', id: cell.row.id, deletedAt: 9 }]);
    await refetchGoal(depsOf(server), goalId);
    const db = await getDb();
    expect(await db.all('SELECT id FROM stickers WHERE goal_id = ?', goalId)).toEqual([{ id: mine.id }]);
  });
});
