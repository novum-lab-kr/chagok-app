import { notifyWidgetApplied } from './applied';

export type SyncRunner = {
  /** 동기화를 한 번 부탁한다. 도는 중이면 끝난 뒤 한 번 더 돈다. */
  run(): void;
  /** run과 같고, 부탁한 동기화(도는 중이었다면 그 뒤에 한 번 더 도는 것)가 끝나면 풀린다. 실패해도 풀린다. */
  now(): Promise<void>;
};

/**
 * 위젯 동기화를 한 번에 하나만 돌린다. 도는 중에 몇 번을 부탁해도 끝난 뒤 한 번만 더 돈다.
 * 기록을 바꾼 동기화가 끝나면 notifyWidgetApplied로 알린다.
 */
export function createSyncRunner(once: () => Promise<{ changed: boolean }>, onError: (e: unknown) => void): SyncRunner {
  let running: Promise<void> | null = null;
  let queued: Promise<void> | null = null;

  const start = (): Promise<void> => {
    const current = once()
      .then((r) => { if (r.changed) notifyWidgetApplied(); }, onError)
      .finally(() => { running = null; });
    running = current;
    return current;
  };

  const request = (): Promise<void> => {
    if (!running) return start();
    // 지금 도는 것은 부탁하기 전에 요청을 읽었을 수 있다 — 끝난 뒤 한 번 더 돈다.
    queued ??= running.then(() => { queued = null; return start(); });
    return queued;
  };

  return { run: () => { void request(); }, now: request };
}
