import type { User } from '@supabase/supabase-js';
import { signInWithGoogle, type GoogleSignInDeps } from '../src/sync/signIn/google';

const user = { id: 'u1', app_metadata: { provider: 'google' } } as unknown as User;

function deps(over: Partial<GoogleSignInDeps> = {}) {
  const seen: Record<string, string> = {};
  const d: GoogleSignInDeps = {
    requestGoogle: async () => ({ idToken: 'id-token' }),
    signInWithIdToken: async (token) => { seen.token = token; return { user, error: null }; },
    ...over,
  };
  return { d, seen };
}

describe('signInWithGoogle', () => {
  it('받은 ID 토큰으로 Supabase에 로그인한다', async () => {
    const { d, seen } = deps();
    await expect(signInWithGoogle(d)).resolves.toEqual({ user });
    expect(seen).toEqual({ token: 'id-token' });
  });
  it('사용자가 계정 고르기 창을 닫으면 canceled — Supabase를 부르지 않는다', async () => {
    const { d, seen } = deps({ requestGoogle: async () => 'canceled' });
    await expect(signInWithGoogle(d)).resolves.toBe('canceled');
    expect(seen.token).toBeUndefined();
  });
  it('그 밖의 Google 오류는 던진다', async () => {
    const { d } = deps({ requestGoogle: async () => { throw Object.assign(new Error('DEVELOPER_ERROR'), { code: '10' }); } });
    await expect(signInWithGoogle(d)).rejects.toThrow('DEVELOPER_ERROR');
  });
  it('ID 토큰이 없으면(webClientId 누락) Supabase에 보내지 않고 던진다', async () => {
    const { d, seen } = deps({ requestGoogle: async () => ({ idToken: null }) });
    await expect(signInWithGoogle(d)).rejects.toThrow('google: no id token');
    expect(seen.token).toBeUndefined();
  });
  it('Supabase가 거절하면 그 메시지로 던진다', async () => {
    const { d } = deps({ signInWithIdToken: async () => ({ user: null, error: { message: 'Unacceptable audience in id_token' } }) });
    await expect(signInWithGoogle(d)).rejects.toThrow('Unacceptable audience');
  });
});
