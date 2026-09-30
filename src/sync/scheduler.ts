import { createSingleFlight } from '../app-data/singleFlight';

/** 계정·백업 설계 ② 전송기. 성공하거나, 앱이 앞으로 오거나, 새로 기록하면 처음 간격으로 돌아간다. */
export const RETRY_DELAYS_MS = [5_000, 30_000, 120_000, 600_000, 1_800_000];

export function retryDelay(failures: number): number {
  return RETRY_DELAYS_MS[Math.min(Math.max(failures, 1), RETRY_DELAYS_MS.length) - 1];
}

/**
 * 언제 보낼지만 정한다. 무엇을 보낼지는 run(pushOnce)이 한다.
 * 백그라운드 실패로 팝업을 띄우지 않는다 — 상태는 앱 설정에서 본다.
 * 실행 중에 들어온 poke는 singleFlight가 버리지만 debounce 타이머가 다시 걸려 놓치지 않는다.
 */
export function createSyncScheduler(run: () => Promise<void>, options: { debounceMs?: number } = {}) {
  const debounceMs = options.debounceMs ?? 2_000;
  const once = createSingleFlight();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let failures = 0;
  let stopped = false;

  const clear = () => { if (timer) clearTimeout(timer); timer = null; };
  const schedule = (ms: number) => {
    if (stopped) return;
    clear();
    timer = setTimeout(() => { timer = null; void attempt(); }, ms);
  };
  const attempt = () => once(async () => {
    if (stopped) return;
    try {
      await run();
      failures = 0;
    } catch {
      failures += 1;
      schedule(retryDelay(failures));
    }
  });

  return {
    /** 기록이 바뀌었다. */
    poke() { failures = 0; schedule(debounceMs); },
    /** 앱이 앞으로 왔다. */
    foreground() { if (stopped) return; failures = 0; clear(); void attempt(); },
    stop() { stopped = true; clear(); },
  };
}
