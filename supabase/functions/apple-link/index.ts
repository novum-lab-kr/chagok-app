// Apple 로그인 직후 authorizationCode를 refresh token으로 바꿔 저장한다 (계정·백업 설계 ③).
// 계정 삭제 때 delete-account가 이 토큰으로 Apple 연결을 폐기한다 (App Store 5.1.1(v)).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { appleConfigFrom, exchangeCode } from '../_shared/apple.ts';
import { json, userIdFrom } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const uid = await userIdFrom(req);
  if (!uid) return json({ error: 'unauthorized' }, 401);
  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  const code = body?.code;
  if (typeof code !== 'string' || !code) return json({ error: 'code required' }, 400);

  let token: { refreshToken: string; sub: string };
  try {
    token = await exchangeCode(appleConfigFrom((name) => Deno.env.get(name)), code);
  } catch (e) {
    return json({ error: String(e), step: 'exchange' }, 502);
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // 다른 Apple 계정의 코드로 이 계정에 토큰을 붙이지 못하게, 로그인한 Apple 계정과 같은지 본다.
  const user = await admin.auth.admin.getUserById(uid);
  if (user.error) return json({ error: user.error.message, step: 'user' }, 500);
  const identity = user.data.user?.identities?.find((i) => i.provider === 'apple');
  if (identity?.identity_data?.sub !== token.sub) return json({ error: 'apple account mismatch' }, 403);

  const saved = await admin.rpc('admin_save_apple_token', { p_user: uid, p_token: token.refreshToken });
  if (saved.error) return json({ error: saved.error.message, step: 'save' }, 500);
  return json({ ok: true });
});
