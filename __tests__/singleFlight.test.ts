import { createSingleFlight } from '../src/app-data/singleFlight';

function deferred() {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('createSingleFlight', () => {
  it('진행 중인 작업이 있으면 새 호출을 무시한다 (두 번 탭 방지)', async () => {
    const run = createSingleFlight();
    const d = deferred();
    const first = jest.fn(() => d.promise);
    const second = jest.fn(async () => {});
    const p = run(first);
    await run(second);
    expect(second).not.toHaveBeenCalled();
    d.resolve();
    await p;
    expect(first).toHaveBeenCalledTimes(1);
  });

  it('작업이 끝나면 다음 호출을 받는다', async () => {
    const run = createSingleFlight();
    const task = jest.fn(async () => {});
    await run(task);
    await run(task);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('작업이 실패해도 잠금이 풀리고 오류는 호출자에게 전달된다', async () => {
    const run = createSingleFlight();
    await expect(run(async () => { throw new Error('db'); })).rejects.toThrow('db');
    const task = jest.fn(async () => {});
    await run(task);
    expect(task).toHaveBeenCalledTimes(1);
  });
});
