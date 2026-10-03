import type { RpcClient } from './supabaseServer';

export type FunctionsClient = { functions: { invoke(name: string): PromiseLike<{ error: { message: string } | null }> } };

/** 서버의 계정·사진·기록을 지운다 (계정·백업 설계 ③). 실패하면 던진다 — 기기에서는 아무것도 지우지 않는다. */
export async function deleteAccountOnServer(client: FunctionsClient): Promise<void> {
  const { error } = await client.functions.invoke('delete-account');
  if (error) throw new Error(error.message);
}

/** 동의 이력 (약관 설계). 만 14세 이상 확인도 같은 시각으로 남긴다. */
export async function recordConsent(client: RpcClient, termsVersion: number, privacyVersion: number): Promise<void> {
  const { error } = await client.rpc('record_consent', { p_terms_version: termsVersion, p_privacy_version: privacyVersion });
  if (error) throw new Error(error.message);
}

export type SignOutClient = { auth: { signOut(options: { scope: 'local' }): PromiseLike<{ error: { message: string } | null }> } };

/**
 * 이 기기 세션만 지운다. 로그아웃 결과와 상관없이 저장된 세션을 직접 지운다 — supabase는 만료된 토큰을
 * 갱신하지 못하면(오프라인, 이미 지운 계정) 세션을 남긴 채 오류만 돌려준다. 그대로 두면 기기는 비웠는데
 * 로그인이 남아 다시 연결되고 기록이 그 계정으로 올라간다 (2026-10-02 리뷰).
 */
export async function signOutLocal(client: SignOutClient, clearStoredSession: () => void): Promise<void> {
  try {
    await client.auth.signOut({ scope: 'local' });
  } catch {
    // 아래에서 저장된 세션을 지운다
  }
  clearStoredSession();
}
