import { getSetting } from '../repositories/appSettingsRepository';
import { pullOnce } from './pull';
import { pushOnce, type PushDeps } from './push';
import { downloadRestoredPhotos, type PhotoToFetch } from './restore';
import { createSyncScheduler } from './scheduler';

export type ConnectDeps = {
  /** 로그인한 사용자 id(없으면 null)를 알려준다. 구독 해제 함수를 돌려준다. */
  onAuthChange(fn: (userId: string | null) => void): () => void;
  onAppActive(fn: (active: boolean) => void): () => void;
  /** 지금 앞에 있는지. 뒤에서 켜졌으면 앞으로 올 때까지 주기를 걸지 않는다. 없으면 앞에 있다고 본다 */
  isAppActive?: () => boolean;
  onLocalChange(fn: () => void): () => void;
  /** 이 사용자로 도는 한 회차(syncRound)를 만든다. */
  makeRun(userId: string): () => Promise<void>;
  /** 로그인한 사용자 id를 기억한다. 세션이 없을 때는 부르지 않는다. */
  rememberUser(userId: string): Promise<void>;
  /** 참이면 이번 회차를 건너뛴다(연결·로그아웃·삭제 중). 풀리면 다음 기록·앞으로 오기에 보낸다. */
  isPaused?: () => boolean;
  /** 잠금이 풀렸거나 화면이 회차를 청했다(syncGate kickSync, requestSync). 바로 돈다. */
  onResume?: (fn: () => void) => () => void;
  debounceMs?: number;
  /** 앱이 앞에 있는 동안 이 간격으로 받아 온다. 기본 30초 */
  pollMs?: number;
};

/**
 * 로그인해 있는 동안만 동기화 스케줄러를 돌린다 (계정·백업 설계 ② 트리거).
 * 로그인 직후와 앱이 앞으로 올 때 바로, 기록이 바뀌면 모아서, 앞에 있는 동안은 30초마다 돈다. 뒤로 가면 주기를 멈춘다.
 */
export function connectSync(deps: ConnectDeps): () => void {
  let scheduler: ReturnType<typeof createSyncScheduler> | null = null;
  let current: string | null = null;
  let poll: ReturnType<typeof setInterval> | null = null;
  const stopPoll = () => { if (poll) clearInterval(poll); poll = null; };
  const startPoll = () => { stopPoll(); poll = setInterval(() => scheduler?.poll(), deps.pollMs ?? 30_000); };

  const offAuth = deps.onAuthChange((userId) => {
    if (userId === current) return;
    scheduler?.stop();
    scheduler = null;
    current = userId;
    // 세션이 없어도 accountUserId는 남긴다 — 로그인이 풀렸는지 판단하는 근거다 (2026-10-01)
    if (!userId) return;
    void deps.rememberUser(userId);
    const run = deps.makeRun(userId);
    scheduler = createSyncScheduler(async () => { if (!deps.isPaused?.()) await run(); }, { debounceMs: deps.debounceMs });
    scheduler.foreground();
  });
  const offApp = deps.onAppActive((active) => {
    if (!active) { stopPoll(); return; }
    scheduler?.foreground();
    startPoll();
  });
  const offLocal = deps.onLocalChange(() => scheduler?.poke());
  const offResume = deps.onResume?.(() => scheduler?.foreground()) ?? (() => {});
  if (deps.isAppActive?.() ?? true) startPoll();

  return () => { offAuth(); offApp(); offLocal(); offResume(); stopPoll(); scheduler?.stop(); };
}

/**
 * 한 회차: 올리기 → 받아 오기 (api_v2.sql 머리 주석 「동기화 규칙」). 올리기가 실패하면 던져서 받아 오기도 하지 않는다.
 * 받아 오기가 기기에서 지운 기록의 사진 파일은 그 뒤에 지운다.
 */
export async function syncRound(deps: PushDeps, userId: string, removePhoto: (uri: string) => void): Promise<void> {
  await pushOnce(deps);
  const { removedPhotoUris } = await pullOnce({ server: deps.server, userId });
  for (const uri of removedPhotoUris) {
    try { removePhoto(uri); } catch { /* 고아 파일로 남는다. 기록은 이미 지워졌다 */ }
  }
  // 다른 기기와 친구가 올린 기록 사진을 받는다. 못 받은 것은 목록에 남아 다음 회차가 다시 받는다(회차는 실패가 아니다)
  const pending = await getSetting('pendingPhotoDownloads');
  if (!pending) return;
  try {
    await downloadRestoredPhotos(deps.photos, JSON.parse(pending) as PhotoToFetch[]);
  } catch { /* 다음 회차 */ }
}
