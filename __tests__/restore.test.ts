import { randomUUID } from 'node:crypto';
import { getDb } from '../src/db/client';
import { createGoal, getGoal, listGoals, reorderGoals } from '../src/repositories/goalRepository';
import { orderGoals } from '../src/domain/board';
import type { GoalSnapshot } from '../src/sync/contract';
import { listBoardStickers, listStickers, placeSticker, removeSticker } from '../src/repositories/stickerRepository';
import { listMembers } from '../src/repositories/memberRepository';
import { getRecord, upsertRecord } from '../src/repositories/recordRepository';
import { getSetting, setSetting } from '../src/repositories/appSettingsRepository';
import { subscribeLocalChange } from '../src/sync/changes';
import { enqueueAll, pendingCount, takeBatch } from '../src/sync/outbox';
import { pullOnce } from '../src/sync/pull';
import { pushOnce } from '../src/sync/push';
import { applyRestore, downloadRestoredPhotos, hasLocalData, pullAll, replaceServerWithDevice, resetForNewAccount, restoreAll, summarizeDevice, summarizeSnapshot } from '../src/sync/restore';
import { wipeDevice } from '../src/sync/wipe';
import { FakePhotos, FakeServer } from './support/fakeServer';
import { withFreshDb } from './support/setup';

withFreshDb();

const FRIEND = 'friend-id';
const depsOf = (server: FakeServer, pageSize?: number) => ({ server, userId: server.userId, pageSize });

/** 다른 기기에서 올린 백업을 흉내 낸다: 이 DB에서 만들어 올린 뒤 로컬을 비운다. */
async function seedServer() {
  const server = new FakeServer();
  const photos = new FakePhotos();
  const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
  const s = await placeSticker(g.id, 0);
  const r = await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: '메모' });
  const gone = await placeSticker(g.id, 1);
  await pushOnce({ server, photos, deviceId: 'old' });
  await removeSticker(gone.id);
  await pushOnce({ server, photos, deviceId: 'old' });
  const db = await getDb();
  await db.exec('DELETE FROM records; DELETE FROM stickers; DELETE FROM goals; DELETE FROM outbox;');
  return { server, photos, g, s, r };
}

/** 친구가 만든 각자 판 함께 목표에 내가 들어가 있고, 친구가 한 칸 붙였다 */
async function seedShared(server: FakeServer) {
  const friend = server.as(FRIEND);
  const { goalId, inviteCode } = friend.createSharedGoal({ mode: 'each', displayName: '은주', stickerId: 'basic.clover' });
  server.join(inviteCode, '지우', 'basic.star');
  await friend.push('d', [{
    entity: 'sticker', op: 'upsert', row: {
      id: randomUUID(), goal_id: goalId, placed_at: 1, slot_index: 0, sticker_type: 'basic.clover', updated_at: 1,
      date_key: '2026-11-05', tz_offset_min: 540,
    },
  }]);
  return goalId;
}

describe('복원', () => {
  it('서버 행을 모두 받아 채우고, 삭제 표식은 되살리지 않는다', async () => {
    const { server, g, s } = await seedServer();
    const { photos } = await restoreAll(depsOf(server, 2)); // 여러 페이지
    expect((await listGoals()).map((x) => x.id)).toEqual([g.id]);
    expect((await listStickers(g.id)).map((x) => x.id)).toEqual([s.id]);
    expect(photos).toHaveLength(1);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 }); // 복원은 outbox를 만들지 않는다
    expect(await getSetting('syncCursor')).not.toBeNull();
  });

  it('받는 중 실패하면 기기는 그대로다', async () => {
    const { server } = await seedServer();
    await createGoal({ name: '기기 목표', boardType: 'tally', totalSlots: 1 });
    let calls = 0;
    const real = server.pull.bind(server);
    server.pull = async (since, limit) => { if (++calls === 2) throw new Error('network'); return real(since, limit); };
    await expect(restoreAll(depsOf(server, 1))).rejects.toThrow('network');
    expect((await listGoals()).map((x) => x.name)).toEqual(['기기 목표']);
  });

  it('사진을 받아 기록에 연결하고, 실패한 것은 남겨 둔다', async () => {
    const { server, photos, s, r } = await seedServer();
    const restored = await restoreAll(depsOf(server));
    photos.failDownload.add(r.id);
    expect(await downloadRestoredPhotos(photos, restored.photos)).toEqual({ failed: [r.id] });
    expect(JSON.parse((await getSetting('pendingPhotoDownloads'))!)).toEqual(restored.photos);
    photos.failDownload.clear();
    expect(await downloadRestoredPhotos(photos, restored.photos)).toEqual({ failed: [] });
    expect((await getRecord(s.id))?.photoUri).toBe(`record-photo:${r.id}-restored.jpg`);
    expect(await getSetting('pendingPhotoDownloads')).toBeNull();
  });

  it('이 기기 기록 유지: 서버를 기기 행으로 바꾸고 사진은 outbox로 올린다', async () => {
    const { server } = await seedServer();
    const g = await createGoal({ name: '기기 목표', boardType: 'tally', totalSlots: 2 });
    const s = await placeSticker(g.id, 0);
    const r = await upsertRecord(s.id, { photoUri: 'record-photo:b.jpg', memo: null });
    await replaceServerWithDevice(depsOf(server), 'd1');
    expect(server.live('goal')).toEqual([g.id]);
    expect((await takeBatch(10)).map((e) => `${e.entity}:${e.rowId}`)).toEqual([`photo:${r.id}`]);
  });

  it('이 기기 기록 유지 중 실패하면 서버와 기기 outbox가 그대로다', async () => {
    const { server, g } = await seedServer();
    const mine = await createGoal({ name: '기기 목표', boardType: 'tally', totalSlots: 2 });
    server.failNext = 1;
    await expect(replaceServerWithDevice(depsOf(server), 'd1')).rejects.toThrow();
    expect(server.live('goal')).toEqual([g.id]);
    expect((await takeBatch(10)).map((e) => e.rowId)).toEqual([mine.id, mine.id]); // 목표와 내 멤버 행
  });

  it('기기에 기록이 있는지: 내 혼자 목표만 센다', async () => {
    expect(await hasLocalData()).toBe(false);
    const server = new FakeServer();
    await seedShared(server);
    await restoreAll(depsOf(server)); // 함께 목표만 있다
    expect(await hasLocalData()).toBe(false);
    await createGoal({ name: 'x', boardType: 'tally', totalSlots: 1 });
    expect(await hasLocalData()).toBe(true);
  });

  it('받기만 하면 기기를 바꾸지 않고, 요약은 목표 이름, 수, 최근 수정 시각을 담는다', async () => {
    const { server } = await seedServer();
    const mine = await createGoal({ name: '물 마시기', boardType: 'tally', totalSlots: 5 });
    const snap = await pullAll(depsOf(server, 2));
    expect((await listGoals()).map((x) => x.id)).toEqual([mine.id]); // 기기 그대로
    const s = summarizeSnapshot(snap);
    expect(s).toMatchObject({ goals: 1, stickers: 1, goalNames: ['산책'] });
    const rows = snap.solo.flatMap((g) => [g.goal, ...g.members, ...g.stickers, ...g.records]);
    expect(s.updatedAt).toBe(Math.max(...rows.map((r) => r.updated_at)));
    expect(await summarizeDevice()).toMatchObject({ goals: 1, stickers: 0, goalNames: ['물 마시기'] });
    expect(summarizeSnapshot({ userId: 'u', solo: [], shared: [], cursor: 0 })).toEqual({ goals: 0, stickers: 0, goalNames: [], updatedAt: null });
  });

  it('적용하면 바꾸기 전 기기 사진 경로를 돌려준다', async () => {
    const { server } = await seedServer();
    const mine = await createGoal({ name: '물 마시기', boardType: 'tally', totalSlots: 5 });
    const st = await placeSticker(mine.id, 0);
    await upsertRecord(st.id, { photoUri: 'record-photo:old.jpg', memo: null });
    const { oldPhotoUris } = await applyRestore(await pullAll(depsOf(server)));
    expect(oldPhotoUris).toEqual(['record-photo:old.jpg']);
  });

  it('끝나면 로컬 변경 신호를 보낸다 (위젯 갱신)', async () => {
    const { server } = await seedServer();
    const snap = await pullAll(depsOf(server));
    let n = 0;
    const off = subscribeLocalChange(() => { n += 1; });
    await applyRestore(snap);
    off();
    expect(n).toBe(1);
  });
});

describe('함께 목표 복원', () => {
  it('혼자 목표와 함께 목표(친구 칸까지)가 모두 들어오고 커서를 저장한다', async () => {
    const { server, g } = await seedServer();
    const goalId = await seedShared(server);
    await restoreAll(depsOf(server));
    expect((await listGoals()).map((x) => x.id).sort()).toEqual([g.id, goalId].sort());
    expect(await getGoal(goalId)).toMatchObject({ mode: 'each', role: 'member' });
    expect((await listMembers(goalId)).map((m) => [m.userId, m.isMe])).toEqual([[FRIEND, false], ['me', true]]);
    expect(await listBoardStickers(goalId, FRIEND)).toHaveLength(1);
    expect(Number(await getSetting('syncCursor'))).toBeGreaterThan(0);
    // 커서가 끝까지 왔다: 다음 회차는 받을 것이 없다
    expect(await pullOnce(depsOf(server))).toEqual({ applied: 0, refetched: [], removedPhotoUris: [] });
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('충돌 요약은 양쪽 모두 내 혼자 목표만 센다', async () => {
    const { server } = await seedServer();
    await seedShared(server);
    const snap = await pullAll(depsOf(server));
    expect(snap.shared).toHaveLength(1);
    expect(summarizeSnapshot(snap)).toMatchObject({ goals: 1, stickers: 1, goalNames: ['산책'] });
    await restoreAll(depsOf(server)); // 기기에도 함께 목표가 있다. 세지 않는다
    await createGoal({ name: '물 마시기', boardType: 'tally', totalSlots: 5 });
    expect(await summarizeDevice()).toMatchObject({ goals: 2, stickers: 1, goalNames: ['산책', '물 마시기'] });
  });

  it('이 기기 기록 유지: 기기의 함께 목표는 지우고 서버에서 다시 받는다', async () => {
    const other = new FakeServer('other-user');
    const staleId = await seedShared(other); // 지난 계정의 함께 목표가 기기에 남아 있다
    await restoreAll(depsOf(other));
    const stale = await placeSticker(staleId, 1);
    await upsertRecord(stale.id, { photoUri: 'record-photo:stale.jpg', memo: null });

    const server = new FakeServer();
    const goalId = await seedShared(server);
    const mine = await createGoal({ name: '기기 목표', boardType: 'tally', totalSlots: 2 });
    const { removedPhotoUris } = await replaceServerWithDevice(depsOf(server), 'd1');
    expect(removedPhotoUris).toEqual(['record-photo:stale.jpg']);
    expect((await listGoals()).map((x) => x.id).sort()).toEqual([goalId, mine.id].sort());
    expect(await listBoardStickers(goalId, FRIEND)).toHaveLength(1);
    expect(server.live('goal')).toEqual([goalId, mine.id].sort()); // replace_all은 혼자 목표만 바꾸고 함께 목표는 그대로 둔다
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('이 기기 기록 유지 중 받아 오기가 실패해도 다시 하면 같은 결과다', async () => {
    const server = new FakeServer();
    const goalId = await seedShared(server);
    const mine = await createGoal({ name: '기기 목표', boardType: 'tally', totalSlots: 2 });
    const st = await placeSticker(mine.id, 0);
    const r = await upsertRecord(st.id, { photoUri: 'record-photo:b.jpg', memo: null });
    const real = server.pull.bind(server);
    let fail = true;
    server.pull = async (since, limit) => { if (fail) { fail = false; throw new Error('network'); } return real(since, limit); };
    await expect(replaceServerWithDevice(depsOf(server), 'd1')).rejects.toThrow('network');
    expect(await getSetting('syncCursor')).toBe('0');
    await replaceServerWithDevice(depsOf(server), 'd1');
    expect((await listGoals()).map((x) => x.id).sort()).toEqual([goalId, mine.id].sort());
    expect((await takeBatch(10)).map((e) => `${e.entity}:${e.rowId}`)).toEqual([`photo:${r.id}`]);
  });

  describe('다른 계정으로 연결만 하거나 첫 백업할 때', () => {
    /** 지난 계정(A)의 함께 목표와 커서가 남은 기기. 이 기기 혼자 목표도 하나 있다 */
    async function leftover() {
      const a = new FakeServer('user-a');
      const staleId = await seedShared(a);
      await restoreAll(depsOf(a));
      const stale = await placeSticker(staleId, 1);
      await upsertRecord(stale.id, { photoUri: 'record-photo:stale.jpg', memo: null });
      return { staleId, cursor: await getSetting('syncCursor') };
    }

    it('첫 백업: 지난 계정의 함께 목표와 친구 칸은 지우고 올리지 않는다. 커서는 0이다', async () => {
      const { staleId, cursor } = await leftover();
      expect(Number(cursor)).toBeGreaterThan(0);
      await setSetting('pendingPhotoDownloads', JSON.stringify([{ recordId: 'old', remotePath: 'a/x.jpg' }]));
      const mine = await createGoal({ name: '기기 목표', boardType: 'tally', totalSlots: 2 });
      const { removedPhotoUris } = await resetForNewAccount();
      await enqueueAll();
      expect(removedPhotoUris).toEqual(['record-photo:stale.jpg']);
      expect(await getSetting('syncCursor')).toBe('0');
      expect(await getSetting('pendingGoalSync')).toBeNull();
      expect(await getSetting('pendingPhotoDownloads')).toBeNull();
      expect((await listGoals()).map((x) => x.id)).toEqual([mine.id]);
      const queued = (await takeBatch(100)).map((e) => e.rowId);
      expect(queued).not.toContain(staleId);
      expect(new Set(queued)).toEqual(new Set([mine.id]));
      // B로 올리고 받으면 B 것만 남고 보류가 없다
      const b = new FakeServer('user-b');
      const sharedB = await seedShared(b);
      await pushOnce({ server: b, photos: new FakePhotos(), deviceId: 'phone' });
      await pullOnce(depsOf(b));
      expect((await listGoals()).map((x) => x.id).sort()).toEqual([mine.id, sharedB].sort());
      expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
    });

    it('연결만: 지난 계정의 함께 목표가 지워지고 이 계정 것을 처음부터 받는다', async () => {
      const { staleId } = await leftover();
      expect(await hasLocalData()).toBe(false); // 그래서 연결만(linkOnly)으로 간다
      await resetForNewAccount();
      expect(await getGoal(staleId)).toBeNull();
      const b = new FakeServer('user-b');
      const sharedB = await seedShared(b);
      await pullOnce(depsOf(b));
      expect((await listGoals()).map((x) => x.id)).toEqual([sharedB]);
      expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
    });
  });

  it('로그아웃(wipe) 뒤에는 다른 사람 멤버 행과 칸이 남지 않는다', async () => {
    const server = new FakeServer();
    await seedShared(server);
    await restoreAll(depsOf(server));
    await wipeDevice(() => {});
    const db = await getDb();
    expect(await db.all('SELECT * FROM goal_members')).toEqual([]);
    expect(await db.all('SELECT * FROM stickers')).toEqual([]);
    expect(await db.all('SELECT * FROM goals')).toEqual([]);
  });
});

describe('누른 날 기록 (placed_days)', () => {
  it('복원한 스티커의 날짜로 채운다', async () => {
    const { server } = await seedServer();
    const db = await getDb();
    await db.exec('DELETE FROM placed_days;');
    await restoreAll(depsOf(server));
    const days = (await db.all<{ date_key: string }>('SELECT date_key FROM placed_days')).map((r) => r.date_key);
    const { localDateKey } = await import('../src/domain/dates');
    expect(days).toEqual([localDateKey(Date.now())]);
  });
});

describe('내 목표 순서 복원 (PRD 4.1, 2026-10-30)', () => {
  const ME_ID = 'u';
  /** 서버 혼자 목표 하나(목표 행과 내 멤버 행) */
  const solo = (id: string, over: { created_at?: number; last_placed_at?: number; sort_order?: number | null } = {}): GoalSnapshot => ({
    goal: {
      id, client_id: null, mode: 'solo', owner_id: ME_ID, name: id, board_type: 'tally', total_slots: 5, initial_slots: 5,
      end_date: null, max_members: 1, created_at: over.created_at ?? 1, updated_at: 9,
    },
    members: [{
      goal_id: id, user_id: ME_ID, role: 'owner', display_name: null, sticker_id: 'basic.sprout', joined_at: 1, left_at: null,
      updated_at: 9, sort_order: over.sort_order, completed_at: null, completion_seen: 0, last_placed_at: over.last_placed_at ?? null,
    }],
    stickers: [], records: [],
  });
  const snapshot = (goals: GoalSnapshot[]) => ({ userId: ME_ID, solo: goals, shared: [], cursor: 3 });
  const shown = async () => orderGoals(await listGoals()).active.map((goal) => goal.id);

  it('옮긴 순서를 백업하고 다른 기기에서 복원해도 그대로다', async () => {
    const server = new FakeServer();
    const photos = new FakePhotos();
    const a = await createGoal({ name: 'a', boardType: 'tally', totalSlots: 3 });
    const b = await createGoal({ name: 'b', boardType: 'tally', totalSlots: 3 });
    const c = await createGoal({ name: 'c', boardType: 'tally', totalSlots: 3 });
    await reorderGoals([b.id, c.id, a.id]);
    await pushOnce({ server, photos, deviceId: 'old' });
    const db = await getDb();
    await db.exec('DELETE FROM records; DELETE FROM stickers; DELETE FROM goals; DELETE FROM outbox;');
    await restoreAll(depsOf(server));
    expect(await shown()).toEqual([b.id, c.id, a.id]);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('순서가 없는 옛 백업은 최근순으로 채우고, 채운 목표를 서버에 다시 올린다', async () => {
    await applyRestore(snapshot([
      solo('old', { created_at: 1 }),
      solo('placed', { created_at: 2, last_placed_at: 50 }),
      solo('fresh', { created_at: 40, sort_order: null }),
    ]));
    expect(await shown()).toEqual(['placed', 'fresh', 'old']);
    const db = await getDb();
    expect((await db.all<{ id: string; sort_order: number; updated_at: number }>(
      `SELECT goal_id AS id, sort_order, updated_at FROM goal_members ORDER BY sort_order`,
    ))).toEqual([
      { id: 'placed', sort_order: 0, updated_at: 9 },
      { id: 'fresh', sort_order: 1, updated_at: 9 },
      { id: 'old', sort_order: 2, updated_at: 9 },
    ]);
    expect((await takeBatch(10)).map((entry) => entry.rowId).sort()).toEqual(['fresh', 'old', 'placed']);
  });

  it('순서가 있는 목표는 그대로 두고, 없는 목표는 그 아래에 붙인다', async () => {
    await applyRestore(snapshot([
      solo('second', { sort_order: 4 }),
      solo('legacy', { last_placed_at: 99 }),
      solo('first', { sort_order: -1 }),
    ]));
    expect(await shown()).toEqual(['first', 'second', 'legacy']);
    expect((await takeBatch(10)).map((entry) => entry.rowId)).toEqual(['legacy']);
  });

  it('이 기기 기록 유지: 서버에 순서도 올린다', async () => {
    const server = new FakeServer();
    const a = await createGoal({ name: 'a', boardType: 'tally', totalSlots: 3 });
    const b = await createGoal({ name: 'b', boardType: 'tally', totalSlots: 3 });
    await reorderGoals([a.id, b.id]);
    await replaceServerWithDevice(depsOf(server), 'd1');
    const pulled = await pullAll(depsOf(server));
    expect(Object.fromEntries(pulled.solo.map(({ goal, members: [me] }) => [goal.id, me.sort_order]))).toEqual({ [a.id]: 0, [b.id]: 1 });
  });
});
