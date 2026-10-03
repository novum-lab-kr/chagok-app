/**
 * 연결·로그아웃·계정 삭제 동안 자동 전송을 멈춘다 (계정·백업 설계 「서버 단계 뒤에 남은 것」).
 * 로그인 직후 바로 보내면 복원 충돌을 고르기 전에 기기 기록이 서버에 섞인다.
 * 앱 설정의 계정 칸은 subscribeSyncStatus로 전송 결과·연결 변화를 받아 다시 읽는다.
 */
let paused = false;
const listeners = new Set<() => void>();
const resumeListeners = new Set<() => void>();

export function pauseSync(): void { paused = true; }
/** 다시 연다. 잠긴 동안 건너뛴 전송(로그인 직후, 첫 백업)을 바로 보내도록 재개 구독자에게 알린다. */
export function resumeSync(): void {
  paused = false;
  for (const fn of [...resumeListeners]) fn();
  notifySyncStatus();
}
/** 잠금은 그대로 두고 지금 보낼 수 있으면 보내게 깨운다 (되돌리기를 다시 해서 성공했을 때). */
export function kickSync(): void {
  for (const fn of [...resumeListeners]) fn();
}
export function subscribeResume(fn: () => void): () => void {
  resumeListeners.add(fn);
  return () => { resumeListeners.delete(fn); };
}
export function isSyncPaused(): boolean { return paused; }
export function subscribeSyncStatus(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
export function notifySyncStatus(): void { for (const fn of [...listeners]) fn(); }
