import { randomUUID } from 'node:crypto';
import { createGoal, listGoals } from '../src/repositories/goalRepository';
import { placeSticker } from '../src/repositories/stickerRepository';
import { upsertRecord } from '../src/repositories/recordRepository';
import { connectSync, syncRound } from '../src/sync/connect';
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

  function polled(paused = { value: false }) {
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
});
