/**
 * 연결·로그아웃·계정 삭제 동안 자동 전송을 멈춘다 (계정·백업 설계 「서버 단계 뒤에 남은 것」).
 * 로그인 직후 바로 보내면 복원 충돌을 고르기 전에 기기 기록이 서버에 섞인다.
 * 앱 설정의 계정 칸은 subscribeSyncStatus로 전송 결과·연결 변화를 받아 다시 읽는다.
 */
let paused = false;
const listeners = new Set<() => void>();

export function pauseSync(): void { paused = true; }
export function resumeSync(): void { paused = false; notifySyncStatus(); }
export function isSyncPaused(): boolean { return paused; }
export function subscribeSyncStatus(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
export function notifySyncStatus(): void { for (const fn of [...listeners]) fn(); }
