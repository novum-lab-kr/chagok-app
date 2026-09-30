import { createSyncScheduler, retryDelay } from '../src/sync/scheduler';

jest.useFakeTimers();
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

describe('재시도 간격', () => {
  it('5초 → 30초 → 2분 → 10분 → 최대 30분', () => {
    expect([1, 2, 3, 4, 5, 9].map(retryDelay)).toEqual([5_000, 30_000, 120_000, 600_000, 1_800_000, 1_800_000]);
  });
});

describe('스케줄러', () => {
  it('변경을 2초 모아 한 번 보낸다', async () => {
    const run = jest.fn().mockResolvedValue(undefined);
    const s = createSyncScheduler(run);
    s.poke(); s.poke(); s.poke();
    jest.advanceTimersByTime(1_999); await flush();
    expect(run).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1); await flush();
    expect(run).toHaveBeenCalledTimes(1);
    s.stop();
  });

  it('실패하면 간격을 늘려 다시 시도하고, 새 변경이 오면 처음 간격으로 돌아간다', async () => {
    const run = jest.fn().mockRejectedValue(new Error('network'));
    const s = createSyncScheduler(run);
    s.foreground(); await flush();
    expect(run).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(5_000); await flush();
    expect(run).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(29_999); await flush();
    expect(run).toHaveBeenCalledTimes(2);
    s.poke();
    jest.advanceTimersByTime(2_000); await flush();
    expect(run).toHaveBeenCalledTimes(3);
    jest.advanceTimersByTime(5_000); await flush();
    expect(run).toHaveBeenCalledTimes(4);
    s.stop();
  });

  it('앞으로 오면 바로 보낸다', async () => {
    const run = jest.fn().mockResolvedValue(undefined);
    const s = createSyncScheduler(run);
    s.foreground(); await flush();
    expect(run).toHaveBeenCalledTimes(1);
    s.stop();
  });

  it('멈춘 뒤에는 보내지 않는다', async () => {
    const run = jest.fn().mockResolvedValue(undefined);
    const s = createSyncScheduler(run);
    s.poke(); s.stop();
    jest.advanceTimersByTime(10_000); await flush();
    expect(run).not.toHaveBeenCalled();
  });
});
