import { isSyncPaused, kickSync, notifySyncStatus, pauseSync, resumeSync, subscribeResume, subscribeSyncStatus } from '../src/sync/syncGate';

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

  it('다시 열면 재개 구독자에게 알린다 (잠긴 동안 미룬 전송을 바로 보내게)', () => {
    let resumed = 0;
    const off = subscribeResume(() => { resumed += 1; });
    pauseSync(); resumeSync();
    expect(resumed).toBe(1);
    off(); pauseSync(); resumeSync();
    expect(resumed).toBe(1);
  });

  it('잠금은 그대로 두고 재개 구독자만 깨운다 (다른 흐름의 잠금을 풀지 않게)', () => {
    let kicked = 0;
    const off = subscribeResume(() => { kicked += 1; });
    pauseSync();
    kickSync();
    expect(kicked).toBe(1);
    expect(isSyncPaused()).toBe(true);
    off();
  });
});
