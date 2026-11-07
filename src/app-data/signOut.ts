/**
 * 로그아웃과 계정 삭제가 기기를 정리하는 순서 (계정·백업 설계 ①, 보안 검토 2026-11-02 L1).
 * 순서가 중요해서 한곳에만 둔다(AGENTS.md 「코드를 쓰기 전에 찾는 곳」). 실제 모듈은 signOutDeps.ts가 넣는다.
 * 한 단계가 실패하면 뒤 단계를 부르지 않고 그대로 던진다 — 화면이 실패 안내와 [다시 시도]를 맡는다.
 */
export type SignOutDeps = {
  /** 이 기기의 서버 세션만 지운다. 로그아웃이 실패해도 저장된 세션을 지운다 (signOutLocal) */
  clearSession: () => Promise<void>;
  signOutKakao: () => Promise<void>;
  signOutGoogle: () => Promise<void>;
  /** 결제 계정을 익명으로 돌린다 */
  signOutPurchases: () => Promise<void>;
  wipeDevice: () => Promise<void>;
};

/** 로그인 세션만 지운다. 계정 연결을 취소할 때처럼 기기 기록은 남길 때 쓴다. */
export async function clearSignInSessions(deps: Pick<SignOutDeps, 'clearSession' | 'signOutKakao' | 'signOutGoogle'>): Promise<void> {
  await deps.clearSession();
  // 카카오와 Google SDK 토큰도 지운다 — 다음에 다른 계정을 고를 수 있게(그 방법으로 들어온 적이 없으면 아무 일도 없다)
  await deps.signOutKakao();
  await deps.signOutGoogle();
}

/** 로그인 세션을 지우고 기기를 비운다. 결제 계정을 먼저 익명으로 돌린다 — 비운 기기에 앞 계정의 구독이 다시 적히지 않게. */
export async function signOutAndWipe(deps: SignOutDeps): Promise<void> {
  await clearSignInSessions(deps);
  await deps.signOutPurchases();
  await deps.wipeDevice();
}
