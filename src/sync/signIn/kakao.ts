import type { User } from '@supabase/supabase-js';

// 카카오 로그인 (상위 계획 2단계): 카카오 창 → Supabase ID 토큰 로그인. 받는 것은 회원번호(ID 토큰 sub)뿐이다 (PRD 4.8).
// nonce는 Apple과 같다 — 카카오에 SHA-256 값을, Supabase에 원래 값을 준다.
// 카카오 토큰은 서버에 맡기지 않는다. 계정 삭제 때 서버가 어드민 키와 회원번호로 연결을 끊는다.

export type KakaoSignInDeps = {
  makeNonce(): Promise<{ raw: string; hashed: string }>;
  /** 카카오 창. 사용자가 닫으면 'canceled'를 돌려준다(어댑터가 SDK 오류를 바꾼다). */
  requestKakao(hashedNonce: string): Promise<{ idToken: string | null } | 'canceled'>;
  signInWithIdToken(idToken: string, rawNonce: string): Promise<{ user: User | null; error: { message: string } | null }>;
};

/** 로그인한 사용자. 사용자가 창을 닫으면 'canceled'. */
export async function signInWithKakao(deps: KakaoSignInDeps): Promise<{ user: User } | 'canceled'> {
  const nonce = await deps.makeNonce();
  const result = await deps.requestKakao(nonce.hashed);
  if (result === 'canceled') return 'canceled';
  // OpenID Connect가 꺼져 있으면 ID 토큰이 오지 않는다
  if (!result.idToken) throw new Error('kakao: no id token');
  const { user, error } = await deps.signInWithIdToken(result.idToken, nonce.raw);
  if (error || !user) throw new Error(error?.message ?? 'no user');
  return { user };
}
