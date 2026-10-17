import type { User } from '@supabase/supabase-js';

// Apple 로그인 (계정·백업 설계 ①): Apple 창 → Supabase ID 토큰 로그인 → refresh token 맡기기(apple-link).
// nonce는 Apple에 SHA-256 값을, Supabase에 원래 값을 준다. Supabase가 둘을 맞춰 보고 가로챈 토큰의 재사용을 막는다.

export type AppleCredential = { identityToken: string | null; authorizationCode: string | null };

export type AppleSignInDeps = {
  makeNonce(): Promise<{ raw: string; hashed: string }>;
  /** Apple 창. 사용자가 닫으면 code 'ERR_REQUEST_CANCELED'로 던진다. */
  requestApple(hashedNonce: string): Promise<AppleCredential>;
  signInWithIdToken(idToken: string, rawNonce: string): Promise<{ user: User | null; error: { message: string } | null }>;
  /** 계정 삭제 때 Apple 연결을 폐기할 수 있게 authorizationCode를 서버에 맡긴다. 실패하면 던진다. */
  linkToken(authorizationCode: string): Promise<void>;
};

/**
 * 로그인한 사용자. 사용자가 창을 닫으면 'canceled'. 토큰을 맡기지 못하면 던진다 —
 * 폐기할 수 없는 계정으로 연결하지 않게, 연결 화면이 이 세션을 취소한다.
 */
export async function signInWithApple(deps: AppleSignInDeps): Promise<{ user: User } | 'canceled'> {
  const nonce = await deps.makeNonce();
  let credential: AppleCredential;
  try {
    credential = await deps.requestApple(nonce.hashed);
  } catch (e) {
    if ((e as { code?: unknown } | null)?.code === 'ERR_REQUEST_CANCELED') return 'canceled';
    throw e;
  }
  if (!credential.identityToken || !credential.authorizationCode) throw new Error('apple: missing identityToken or authorizationCode');
  const { user, error } = await deps.signInWithIdToken(credential.identityToken, nonce.raw);
  if (error || !user) throw new Error(error?.message ?? 'no user');
  await deps.linkToken(credential.authorizationCode);
  return { user };
}
