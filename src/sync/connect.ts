import { createSyncScheduler } from './scheduler';

export type ConnectDeps = {
  /** 로그인한 사용자 id(없으면 null)를 알려준다. 구독 해제 함수를 돌려준다. */
  onAuthChange(fn: (userId: string | null) => void): () => void;
  onAppActive(fn: (active: boolean) => void): () => void;
  onLocalChange(fn: () => void): () => void;
  /** 이 사용자로 보내는 한 번(pushOnce)을 만든다. */
  makeRun(userId: string): () => Promise<void>;
  rememberUser(userId: string | null): Promise<void>;
  debounceMs?: number;
};

/**
 * 로그인해 있는 동안만 전송 스케줄러를 돌린다 (계정·백업 설계 ② 트리거).
 * 로그인 직후·앱이 앞으로 올 때 바로, 기록이 바뀌면 모아서 보낸다.
 */
export function connectSync(deps: ConnectDeps): () => void {
  let scheduler: ReturnType<typeof createSyncScheduler> | null = null;
  let current: string | null = null;

  const offAuth = deps.onAuthChange((userId) => {
    if (userId === current) return;
    scheduler?.stop();
    scheduler = null;
    current = userId;
    void deps.rememberUser(userId);
    if (!userId) return;
    scheduler = createSyncScheduler(deps.makeRun(userId), { debounceMs: deps.debounceMs });
    scheduler.foreground();
  });
  const offApp = deps.onAppActive((active) => { if (active) scheduler?.foreground(); });
  const offLocal = deps.onLocalChange(() => scheduler?.poke());

  return () => { offAuth(); offApp(); offLocal(); scheduler?.stop(); };
}
