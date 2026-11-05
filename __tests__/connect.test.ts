import { randomUUID } from 'node:crypto';
import { createGoal, listGoals } from '../src/repositories/goalRepository';
import { placeSticker } from '../src/repositories/stickerRepository';
import { getRecord, upsertRecord } from '../src/repositories/recordRepository';
import { getSetting, setSetting } from '../src/repositories/appSettingsRepository';
import { connectSync, syncRound } from '../src/sync/connect';
import { AccountChanged } from '../src/sync/pull';
import { pushOnce } from '../src/sync/push';
import { requestSync, subscribeResume } from '../src/sync/syncGate';
import { FakePhotos, FakeServer } from './support/fakeServer';
import { goal } from './support/syncServerContract';
import { withFreshDb } from './support/setup';

withFreshDb();

function harness(paused = { value: false }) {
  let resumeFn: () => void = () => {};
  let authFn: (userId: string | null) => void = () => {};
  let appFn: (active: boolean) => void = () => {};
  let localFn: () => void = () => {};
  const runs: string[] = [];
  const remembered: string[] = [];
  const stop = connectSync({
    onAuthChange: (fn) => { authFn = fn; return () => { authFn = () => {}; }; },
    onAppActive: (fn) => { appFn = fn; return () => { appFn = () => {}; }; },
    onLocalChange: (fn) => { localFn = fn; return () => { localFn = () => {}; }; },
    makeRun: (userId) => async () => { runs.push(userId); },
    rememberUser: async (u) => { remembered.push(u); },
    isPaused: () => paused.value,
    onResume: (fn) => { resumeFn = fn; return () => { resumeFn = () => {}; }; },
    debounceMs: 0,
  });
  return { stop, runs, remembered, resume: () => resumeFn(), signIn: (u: string | null) => authFn(u), active: () => appFn(true), local: () => localFn() };
}
const flush = () => new Promise((r) => setTimeout(r, 5));

describe('connectSync', () => {
  it('로그인 전에는 보내지 않는다', async () => {
    const h = harness();
    h.local(); h.active(); await flush();
    expect(h.runs).toEqual([]);
    h.stop();
  });

  it('로그인하면 바로 보내고, 기록이 바뀌거나 앱이 앞으로 오면 다시 보낸다', async () => {
    const h = harness();
    h.signIn('u1'); await flush();
    h.local(); await flush();
    h.active(); await flush();
    expect(h.runs).toEqual(['u1', 'u1', 'u1']);
    h.stop();
  });

  it('로그아웃하면 멈춘다', async () => {
    const h = harness();
    h.signIn('u1'); await flush();
    h.signIn(null); h.local(); h.active(); await flush();
    expect(h.runs).toEqual(['u1']);
    h.stop();
  });

  it('잠겨 있으면 로그인해도 보내지 않고, 풀린 뒤 기록이 바뀌면 보낸다', async () => {
    const paused = { value: true };
    const h = harness(paused);
    h.signIn('u1'); h.local(); await flush();
    expect(h.runs).toEqual([]);
    paused.value = false;
    h.local(); await flush();
    expect(h.runs).toEqual(['u1']);
    h.stop();
  });

  it('세션이 없으면 연결한 계정 기록을 지우지 않는다 (로그인 풀림을 알아야 한다)', async () => {
    const h = harness();
    h.signIn(null); h.signIn('u1'); h.signIn(null); await flush();
    expect(h.remembered).toEqual(['u1']);
    h.stop();
  });

  it('잠금이 풀리면 미뤄 둔 전송을 바로 보낸다 (첫 백업이 기록을 기다리지 않게)', async () => {
    const paused = { value: true };
    const h = harness(paused);
    h.signIn('u1'); await flush();
    expect(h.runs).toEqual([]);
    paused.value = false;
    h.resume(); await flush();
    expect(h.runs).toEqual(['u1']);
    h.stop();
  });
});

describe('30초 주기와 회차 요청', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });
  const tick = async (ms: number) => { jest.advanceTimersByTime(ms); for (let i = 0; i < 5; i++) await Promise.resolve(); };

  function polled(paused = { value: false }, startActive = true) {
    let appFn: (active: boolean) => void = () => {};
    let resumeFn: () => void = () => {};
    const runs: number[] = [];
    const stop = connectSync({
      onAuthChange: (fn) => { fn('u1'); return () => {}; },
      onAppActive: (fn) => { appFn = fn; return () => {}; },
      onLocalChange: () => () => {},
      makeRun: () => async () => { runs.push(Date.now()); },
      rememberUser: async () => {},
      isPaused: () => paused.value,
      onResume: (fn) => { resumeFn = fn; return () => {}; },
      pollMs: 30_000,
      isAppActive: () => startActive,
    });
    return { stop, runs, app: (active: boolean) => appFn(active), resume: () => resumeFn() };
  }

  it('앞에 있는 동안 30초마다 돌고, 뒤로 가면 멈추고, 앞으로 오면 바로 돈다', async () => {
    const h = polled();
    await tick(0);
    expect(h.runs).toHaveLength(1); // 로그인 직후
    await tick(30_000);
    expect(h.runs).toHaveLength(2);
    await tick(30_000);
    expect(h.runs).toHaveLength(3);
    h.app(false);
    await tick(90_000);
    expect(h.runs).toHaveLength(3);
    h.app(true);
    await tick(0);
    expect(h.runs).toHaveLength(4);
    h.stop();
    await tick(60_000);
    expect(h.runs).toHaveLength(4);
  });

  it('뒤에서 켜졌으면 앞으로 올 때까지 주기를 걸지 않는다', async () => {
    const h = polled({ value: false }, false);
    await tick(0);
    expect(h.runs).toHaveLength(1); // 로그인 직후 한 번(원래 동작)
    await tick(90_000);
    expect(h.runs).toHaveLength(1);
    h.app(true);
    await tick(0);
    expect(h.runs).toHaveLength(2); // 앞으로 와서 바로
    await tick(30_000);
    expect(h.runs).toHaveLength(3); // 30초 뒤 주기
    h.stop();
  });

  it('잠금 중에는 주기가 와도 돌지 않는다', async () => {
    const paused = { value: true };
    const h = polled(paused);
    await tick(90_000);
    expect(h.runs).toHaveLength(0);
    h.stop();
  });

  it('requestSync()가 회차를 바로 부른다', async () => {
    const runs: string[] = [];
    const stop = connectSync({
      onAuthChange: (fn) => { fn('u1'); return () => {}; },
      onAppActive: () => () => {},
      onLocalChange: () => () => {},
      makeRun: (u) => async () => { runs.push(u); },
      rememberUser: async () => {},
      onResume: subscribeResume,
    });
    await tick(0);
    requestSync();
    await tick(0);
    expect(runs).toEqual(['u1', 'u1']);
    stop();
  });

  it('실패해 다시 시도를 기다리는 동안은 주기가 앞당기지 않는다', async () => {
    let calls = 0;
    const stop = connectSync({
      onAuthChange: (fn) => { fn('u1'); return () => {}; },
      onAppActive: () => () => {},
      onLocalChange: () => () => {},
      makeRun: () => async () => { calls += 1; throw new Error('network'); },
      rememberUser: async () => {},
      pollMs: 1_000,
    });
    await tick(0);
    expect(calls).toBe(1);
    await tick(4_999); // 첫 다시 시도는 5초 뒤. 1초 주기는 건너뛴다
    expect(calls).toBe(1);
    await tick(1);
    expect(calls).toBe(2);
    stop();
  });
});

describe('한 회차 (syncRound)', () => {
  const deps = (server: FakeServer, photos = new FakePhotos()) => ({ server, photos, deviceId: 'phone' });

  it('올린 다음 받아 온다', async () => {
    const server = new FakeServer();
    const calls: string[] = [];
    const push = server.push.bind(server);
    const pull = server.pull.bind(server);
    server.push = async (d, c) => { calls.push('push'); return push(d, c); };
    server.pull = async (s, l) => { calls.push('pull'); return pull(s, l); };
    const mine = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const theirs = randomUUID();
    await push('tablet', [{ entity: 'goal', op: 'upsert', row: goal(theirs, 5, '독서') }]);
    await syncRound(deps(server), server.userId, () => {});
    expect(calls).toEqual(['push', 'pull']);
    expect(server.live('goal')).toEqual([mine.id, theirs].sort());
    expect((await listGoals()).map((g) => g.name).sort()).toEqual(['독서', '산책']);
  });

  it('올리기가 실패하면 받아 오지 않는다', async () => {
    const server = new FakeServer();
    let pulled = 0;
    const pull = server.pull.bind(server);
    server.pull = async (s, l) => { pulled += 1; return pull(s, l); };
    await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    server.failNext = 1;
    await expect(syncRound(deps(server), server.userId, () => {})).rejects.toThrow('network');
    expect(pulled).toBe(0);
  });

  it('받아 오기가 지운 기록의 사진 파일을 지운다', async () => {
    const server = new FakeServer();
    const photos = new FakePhotos();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: null });
    await pushOnce(deps(server, photos));
    await server.push('tablet', [{ entity: 'sticker', op: 'delete', id: s.id, deletedAt: Date.now() + 1000 }]);
    const removed: string[] = [];
    await syncRound(deps(server, photos), server.userId, (uri) => { removed.push(uri); });
    expect(removed).toEqual(['record-photo:a.jpg']);
  });

  it('다른 기기가 올린 기록 사진을 받고, 못 받으면 남겨 두었다가 다음 회차에 받는다', async () => {
    const server = new FakeServer();
    const photos = new FakePhotos();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    await pushOnce(deps(server, photos));
    const recordId = randomUUID();
    const later = Date.now() + 1000;
    await server.push('tablet', [{ entity: 'record', op: 'upsert', row: { id: recordId, sticker_id: s.id, memo: null, photo_remote_path: 'u/x.jpg', created_at: 1, updated_at: later } }]);
    photos.failDownload.add(recordId);
    await syncRound(deps(server, photos), server.userId, () => {}); // 받기 실패는 회차 실패가 아니다
    expect((await getRecord(s.id))?.photoUri).toBeNull();
    expect(JSON.parse((await getSetting('pendingPhotoDownloads'))!)).toEqual([{ recordId, remotePath: 'u/x.jpg' }]);
    photos.failDownload.clear();
    await syncRound(deps(server, photos), server.userId, () => {});
    expect((await getRecord(s.id))?.photoUri).toBe(`record-photo:${recordId}-restored.jpg`);
    expect(await getSetting('pendingPhotoDownloads')).toBeNull();
  });

  it('받는 사이 계정이 바뀌면 기기에 쓰지 않고 AccountChanged로 멈춘다', async () => {
    const server = new FakeServer();
    const photos = new FakePhotos();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    await pushOnce(deps(server, photos));
    const recordId = randomUUID();
    await server.push('tablet', [{ entity: 'record', op: 'upsert', row: { id: recordId, sticker_id: s.id, memo: null, photo_remote_path: 'u/x.jpg', created_at: 1, updated_at: Date.now() + 1000 } }]);
    const cursor = await getSetting('syncCursor');
    let current: string | null = server.userId;
    const pull = server.pull.bind(server);
    server.pull = async (since, limit) => { const page = await pull(since, limit); current = 'user-b'; return page; }; // 받는 사이 연결 화면이 계정을 바꿨다
    await expect(syncRound({ ...deps(server, photos), currentUserId: async () => current }, server.userId, () => {}))
      .rejects.toBeInstanceOf(AccountChanged);
    expect(await getRecord(s.id)).toBeNull();
    expect(await getSetting('syncCursor')).toBe(cursor);
  });

  it('올리기에도 currentUserId를 넘긴다: 보내기 전에 계정이 바뀌면 서버를 부르지 않는다', async () => {
    const server = new FakeServer();
    await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    await expect(syncRound({ ...deps(server), currentUserId: async () => 'user-b' }, server.userId, () => {}))
      .rejects.toBeInstanceOf(AccountChanged);
    expect(server.pushes).toBe(0);
  });

  it('받아 오기 뒤 계정이 바뀌면 사진을 받지 않는다', async () => {
    const server = new FakeServer();
    const photos = new FakePhotos();
    await setSetting('pendingPhotoDownloads', JSON.stringify([{ recordId: 'r1', remotePath: 'u/r1.jpg' }]));
    let downloads = 0;
    photos.download = async () => { downloads += 1; return 'record-photo:x.jpg'; };
    let calls = 0;
    // 받아 오기의 확인은 지나고(첫 확인), 사진 받기 직전 확인에서 바뀌었다
    const currentUserId = async () => (++calls > 1 ? 'user-b' : server.userId);
    await expect(syncRound({ ...deps(server, photos), currentUserId }, server.userId, () => {})).rejects.toBeInstanceOf(AccountChanged);
    expect(downloads).toBe(0);
    expect(await getSetting('pendingPhotoDownloads')).not.toBeNull();
  });
});
