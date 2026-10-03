export type ConnectionPlan = 'same' | 'linkOnly' | 'firstBackup' | 'restore' | 'conflict';

/**
 * 로그인 직후 무엇을 할지 (계정·백업 설계 ① 연결 분기표).
 * 같은 계정으로 다시 로그인했으면 outbox를 이어 보낸다. 다른 계정이면 새 연결로 본다.
 */
export function decideConnection(p: { previousUserId: string | null; userId: string; deviceHasData: boolean; serverHasData: boolean }): ConnectionPlan {
  if (p.previousUserId === p.userId) return 'same';
  if (p.deviceHasData && p.serverHasData) return 'conflict';
  if (p.serverHasData) return 'restore';
  if (p.deviceHasData) return 'firstBackup';
  return 'linkOnly';
}
