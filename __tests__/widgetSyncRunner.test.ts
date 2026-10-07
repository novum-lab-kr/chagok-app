import { createSyncRunner } from '../src/widgets/syncRunner';
import { subscribeWidgetApplied } from '../src/widgets/applied';

/** 끝내는 시점을 테스트가 정하는 가짜 동기화 */
function fakeSync() {
  const pending: { resolve(r: { changed: boolean }): void; reject(e: unknown): void }[] = [];
  let calls = 0;
  return {
    get calls() { return calls; },
    once: () => { calls += 1; return new Promise<{ changed: boolean }>((resolve, reject) => { pending.push({ resolve, reject }); }); },
    finish: (changed = false) => pending.shift()!.resolve({ changed }),
    fail: (e: unknown) => pending.shift()!.reject(e),
  };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('createSyncRunner', () => {
  it('도는 것이 없으면 바로 한 번 돌고, 끝나면 now가 풀린다', async () => {
    const sync = fakeSync();
    const runner = createSyncRunner(sync.once, () => {});
    let done = false;
    void runner.now().then(() => { done = true; });
    await tick();
    expect(sync.calls).toBe(1);
    expect(done).toBe(false);
    sync.finish();
    await tick();
    expect(done).toBe(true);
  });

  it('도는 중에 부르면 지금 것이 끝난 뒤 한 번 더 돌고 그것까지 기다린다 — 여러 번 불러도 한 번만 더', async () => {
    const sync = fakeSync();
    const runner = createSyncRunner(sync.once, () => {});
    runner.run();
    let done = 0;
    void runner.now().then(() => { done += 1; });
    void runner.now().then(() => { done += 1; });
    runner.run();
    await tick();
    expect(sync.calls).toBe(1);
    sync.finish();
    await tick();
    expect(sync.calls).toBe(2);
    expect(done).toBe(0);
    sync.finish();
    await tick();
    expect(done).toBe(2);
    expect(sync.calls).toBe(2);
  });

  it('기록을 바꾼 동기화가 끝나면 알린다. 바꾸지 않았으면 알리지 않는다', async () => {
    const sync = fakeSync();
    const runner = createSyncRunner(sync.once, () => {});
    const heard = jest.fn();
    const off = subscribeWidgetApplied(heard);
    try {
      const a = runner.now();
      sync.finish(false);
      await a;
      expect(heard).not.toHaveBeenCalled();
      const b = runner.now();
      sync.finish(true);
      await b;
      expect(heard).toHaveBeenCalledTimes(1);
    } finally {
      off();
    }
  });

  it('실패해도 now는 풀리고 다음 동기화는 돈다', async () => {
    const sync = fakeSync();
    const errors: unknown[] = [];
    const runner = createSyncRunner(sync.once, (e) => { errors.push(e); });
    const a = runner.now();
    sync.fail(new Error('x'));
    await a;
    expect(errors).toHaveLength(1);
    const b = runner.now();
    await tick();
    expect(sync.calls).toBe(2);
    sync.finish();
    await b;
  });
});
