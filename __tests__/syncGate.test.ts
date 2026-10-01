import { isSyncPaused, notifySyncStatus, pauseSync, resumeSync, subscribeSyncStatus } from '../src/sync/syncGate';

describe('syncGate', () => {
  afterEach(() => resumeSync());
  it('멈추면 멈춘 상태를 알려 주고, 다시 열면 상태 구독자에게 알린다', () => {
    const seen: number[] = [];
    const off = subscribeSyncStatus(() => seen.push(1));
    pauseSync();
    expect(isSyncPaused()).toBe(true);
    resumeSync();
    expect(isSyncPaused()).toBe(false);
    expect(seen).toHaveLength(1);
    off();
    notifySyncStatus();
    expect(seen).toHaveLength(1);
  });
});
