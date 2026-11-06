import { settleOnReturn, type AppStateSource } from '../src/sync/signIn/returnWatch';

function fakeApp(initial = 'active') {
  let state = initial;
  const listeners = new Set<(s: string) => void>();
  const app: AppStateSource = {
    current: () => state,
    subscribe: (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
  };
  const go = (next: string) => { state = next; listeners.forEach((cb) => cb(next)); };
  return { app, go, listeners };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('settleOnReturn', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('결과가 오면 그대로 돌려주고 구독을 푼다', async () => {
    const { app, listeners } = fakeApp();
    const work = deferred<string>();
    const watched = settleOnReturn(work.promise, app, 10_000);
    work.resolve('token');
    await expect(watched).resolves.toBe('token');
    expect(listeners.size).toBe(0);
  });

  it('오류도 그대로 던진다', async () => {
    const { app } = fakeApp();
    const work = deferred<string>();
    const watched = settleOnReturn(work.promise, app, 10_000);
    work.reject(new Error('KOE101'));
    await expect(watched).rejects.toThrow('KOE101');
  });

  it('다른 앱에 갔다가 돌아와 기다려도 결과가 없으면 returned', async () => {
    const { app, go, listeners } = fakeApp();
    const work = deferred<string>();
    const watched = settleOnReturn(work.promise, app, 10_000);
    go('background');
    go('active');
    jest.advanceTimersByTime(10_000);
    await expect(watched).resolves.toBe('returned');
    expect(listeners.size).toBe(0);
  });

  it('돌아온 뒤 기다리는 동안 결과가 오면 결과를 쓴다', async () => {
    const { app, go } = fakeApp();
    const work = deferred<string>();
    const watched = settleOnReturn(work.promise, app, 10_000);
    go('inactive');
    go('active');
    jest.advanceTimersByTime(5_000);
    work.resolve('token');
    await expect(watched).resolves.toBe('token');
  });

  it('앱을 떠나지 않았으면 오래 걸려도 기다린다', async () => {
    const { app } = fakeApp();
    const work = deferred<string>();
    const watched = settleOnReturn(work.promise, app, 10_000);
    jest.advanceTimersByTime(60_000);
    work.resolve('token');
    await expect(watched).resolves.toBe('token');
  });

  it('돌아왔다 다시 나가면 기다리기를 멈춘다', async () => {
    const { app, go } = fakeApp();
    const work = deferred<string>();
    const watched = settleOnReturn(work.promise, app, 10_000);
    go('background');
    go('active');
    jest.advanceTimersByTime(5_000);
    go('background');
    jest.advanceTimersByTime(20_000);
    work.resolve('token');
    await expect(watched).resolves.toBe('token');
  });
});
