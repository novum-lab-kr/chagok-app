import type { User } from '@supabase/supabase-js';
import { signInWithKakao, type KakaoSignInDeps } from '../src/sync/signIn/kakao';

const user = { id: 'u1', app_metadata: { provider: 'kakao' } } as unknown as User;

function deps(over: Partial<KakaoSignInDeps> = {}) {
  const seen: Record<string, string> = {};
  const d: KakaoSignInDeps = {
    makeNonce: async () => ({ raw: 'raw-nonce', hashed: 'sha(raw-nonce)' }),
    requestKakao: async (hashed) => { seen.kakao = hashed; return { idToken: 'id-token' }; },
    signInWithIdToken: async (token, nonce) => { seen.token = token; seen.nonce = nonce; return { user, error: null }; },
    ...over,
  };
  return { d, seen };
}

describe('signInWithKakao', () => {
  it('카카오에는 해시한 nonce를, Supabase에는 원래 nonce를 준다', async () => {
    const { d, seen } = deps();
    await expect(signInWithKakao(d)).resolves.toEqual({ user });
    expect(seen).toEqual({ kakao: 'sha(raw-nonce)', token: 'id-token', nonce: 'raw-nonce' });
  });
  it('사용자가 카카오 창을 닫으면 canceled — Supabase를 부르지 않는다', async () => {
    const { d, seen } = deps({ requestKakao: async () => 'canceled' });
    await expect(signInWithKakao(d)).resolves.toBe('canceled');
    expect(seen.token).toBeUndefined();
  });
  it('그 밖의 카카오 오류는 던진다', async () => {
    const { d } = deps({ requestKakao: async () => { throw Object.assign(new Error('KOE101'), { code: 'InvalidClient' }); } });
    await expect(signInWithKakao(d)).rejects.toThrow('KOE101');
  });
  it('ID 토큰이 없으면(OpenID Connect 꺼짐) Supabase에 보내지 않고 던진다', async () => {
    const { d, seen } = deps({ requestKakao: async () => ({ idToken: null }) });
    await expect(signInWithKakao(d)).rejects.toThrow('kakao: no id token');
    expect(seen.token).toBeUndefined();
  });
  it('Supabase가 거절하면 그 메시지로 던진다', async () => {
    const { d } = deps({ signInWithIdToken: async () => ({ user: null, error: { message: 'Nonces mismatch' } }) });
    await expect(signInWithKakao(d)).rejects.toThrow('Nonces mismatch');
  });
});
