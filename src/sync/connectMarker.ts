import { getSetting, setSetting } from '../repositories/appSettingsRepository';

/**
 * 연결 흐름이 진행 중이라는 표시. 전송 잠금(syncGate)은 메모리에만 있어, 충돌 화면에서 앱이 꺼지면
 * 다음 실행 때 새 계정으로 기기 outbox를 보낸다. 표시가 남아 있으면 그 연결을 취소한 것으로 되돌린다.
 */
export async function beginConnect(previousUserId: string | null): Promise<void> {
  await setSetting('connecting', JSON.stringify({ previous: previousUserId }));
}

/**
 * 복원을 적용했다 — 기기 기록은 이제 이 계정 것이다. 이 뒤에 꺼지면 이전 계정이 아니라 이 계정으로 되돌린다.
 * 그러지 않으면 다시 로그인한 이전 계정으로 이 기록이 올라간다 (2026-10-02 리뷰).
 */
export async function markRestored(userId: string): Promise<void> {
  await beginConnect(userId);
}

export async function endConnect(): Promise<void> {
  await setSetting('connecting', null);
}

/**
 * 로그인 이벤트가 연결 계정을 기억한다(connectSync). 연결 흐름 중에는 기록하지 않는다 — 연결 화면이 끝날 때 기록한다.
 * 그러지 않으면 복원 충돌을 고르기 전에 앱 설정이 이미 연결된 것으로 보인다 (2026-10-02 테스트).
 */
export async function rememberAccount(userId: string): Promise<void> {
  if (await hasInterruptedConnect()) return;
  await setSetting('accountUserId', userId);
}

export async function hasInterruptedConnect(): Promise<boolean> {
  return (await getSetting('connecting')) !== null;
}

/**
 * 앱 시작 때 전송을 켜기 전에 부른다. 되돌리지 못하면(저장소 오류) 표시를 남긴 채 던진다 — 호출자(_layout)는
 * 전송을 잠근 채 앱이 앞으로 올 때 다시 부른다. 끝나지 않은 연결이 있었으면 로그아웃하고 이전 계정 표시로 되돌린다.
 */
export async function recoverInterruptedConnect(signOut: () => Promise<void>): Promise<boolean> {
  const raw = await getSetting('connecting');
  if (!raw) return false;
  const { previous } = JSON.parse(raw) as { previous: string | null };
  await signOut();
  await setSetting('accountUserId', previous);
  await endConnect();
  return true;
}
