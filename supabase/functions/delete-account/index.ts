// 계정 삭제 (계정·백업 설계 ③). 순서: Apple 토큰 폐기 → 사진 폴더 → 데이터 행 → 인증 계정.
// 단계마다 이미 끝났으면 넘어가므로 다시 불러도 남은 단계부터 이어진다(멱등).
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** JWT의 sub만 읽는다. 서명은 게이트웨이(verify_jwt)가 이미 확인했다. 인증 계정이 지워진 뒤의 재시도도 받기 위해서다. */
function userIdFrom(req: Request): string | null {
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role === 'authenticated' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const uid = userIdFrom(req);
  if (!uid) return json({ error: 'unauthorized' }, 401);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Apple 토큰 폐기 — Apple 로그인(apple-link)을 붙일 때 구현한다. 그전에 토큰이 생기면 조용히 건너뛰지 않고 멈춘다.
  const apple = await admin.rpc('admin_has_apple_token', { p_user: uid });
  if (apple.error) return json({ error: apple.error.message, step: 'apple' }, 500);
  if (apple.data === true) return json({ error: 'apple revoke not configured', step: 'apple' }, 500);

  // 2. 사진 폴더
  const bucket = admin.storage.from('record-photos');
  for (;;) {
    const listed = await bucket.list(uid, { limit: 100 });
    if (listed.error) return json({ error: listed.error.message, step: 'photos' }, 500);
    if (!listed.data.length) break;
    const removed = await bucket.remove(listed.data.map((f) => `${uid}/${f.name}`));
    if (removed.error) return json({ error: removed.error.message, step: 'photos' }, 500);
  }

  // 3. 데이터 행
  const rows = await admin.rpc('admin_delete_user_rows', { p_user: uid });
  if (rows.error) return json({ error: rows.error.message, step: 'rows' }, 500);

  // 4. 인증 계정 (이미 없으면 끝난 것)
  const deleted = await admin.auth.admin.deleteUser(uid);
  if (deleted.error && deleted.error.status !== 404) return json({ error: deleted.error.message, step: 'auth' }, 500);

  return json({ ok: true });
});
