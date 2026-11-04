import { randomUUID } from 'node:crypto';
import { getDb } from '../src/db/client';
import { createGoal, getGoal, listGoals, updateGoal } from '../src/repositories/goalRepository';
import { listMembers } from '../src/repositories/memberRepository';
import { getRecord, upsertRecord } from '../src/repositories/recordRepository';
import { listBoardStickers, listStickers, placeSticker } from '../src/repositories/stickerRepository';
import { getSetting } from '../src/repositories/appSettingsRepository';
import { pendingCount } from '../src/sync/outbox';
import { pullOnce, refetchGoal } from '../src/sync/pull';
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
});

describe('refetchGoal', () => {
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
