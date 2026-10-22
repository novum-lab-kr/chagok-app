import type { User } from '@supabase/supabase-js';

// Google 로그인 (상위 계획 3단계): 계정 고르기 창 → Supabase ID 토큰 로그인.
// 무료 라이브러리는 nonce를 넣을 수 없어서 Supabase Google 공급자의 nonce 확인을 껐다 (자료 조사 3.3).
// Google 토큰은 서버에 맡기지 않는다. 계정 삭제 때는 앱이 revokeAccess로 연결을 끊는다.

export type GoogleSignInDeps = {
  /** 계정 고르기 창. 사용자가 닫으면 'canceled'를 돌려준다. */
  requestGoogle(): Promise<{ idToken: string | null } | 'canceled'>;
  signInWithIdToken(idToken: string): Promise<{ user: User | null; error: { message: string } | null }>;
};

/** 로그인한 사용자. 사용자가 창을 닫으면 'canceled'. */
export async function signInWithGoogle(deps: GoogleSignInDeps): Promise<{ user: User } | 'canceled'> {
  const result = await deps.requestGoogle();
  if (result === 'canceled') return 'canceled';
  // webClientId를 넘기지 않으면 ID 토큰이 오지 않는다
  if (!result.idToken) throw new Error('google: no id token');
  const { user, error } = await deps.signInWithIdToken(result.idToken);
  if (error || !user) throw new Error(error?.message ?? 'no user');
  return { user };
}
