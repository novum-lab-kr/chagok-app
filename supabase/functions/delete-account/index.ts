// 계정 삭제 (계정·백업 설계 ③). 순서: 외부 연결 해제(Apple 토큰 폐기) → 사진 폴더 → 데이터 행 → 인증 계정.
// 단계마다 이미 끝났으면 넘어가므로 다시 불러도 남은 단계부터 이어진다(멱등).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { appleConfigFrom, revokeToken } from '../_shared/apple.ts';
import { json, userIdFrom } from '../_shared/auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

Deno.serve(async (req) => {
  const uid = await userIdFrom(req);
  if (!uid) return json({ error: 'unauthorized' }, 401);
  const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. 외부 연결 해제 — Apple 토큰 폐기. 폐기한 뒤 토큰 행을 지워, 다시 부르면 이 단계를 건너뛴다.
  //    폐기하지 못하면(설정 누락·Apple 오류) 멈춘다 — 데이터를 지운 뒤에는 되돌릴 수 없다.
  const apple = await admin.rpc('admin_get_apple_token', { p_user: uid });
  if (apple.error) return json({ error: apple.error.message, step: 'apple' }, 500);
  if (typeof apple.data === 'string') {
    try {
      await revokeToken(appleConfigFrom((name) => Deno.env.get(name)), apple.data);
    } catch (e) {
      return json({ error: String(e), step: 'apple' }, 500);
    }
    const cleared = await admin.rpc('admin_delete_apple_token', { p_user: uid });
    if (cleared.error) return json({ error: cleared.error.message, step: 'apple' }, 500);
  }

  // 2. 사진 폴더
  const bucket = admin.storage.from('record-photos');
  for (;;) {
    const listed = await bucket.list(uid, { limit: 100 });
    if (listed.error) return json({ error: listed.error.message, step: 'photos' }, 500);
    if (!listed.data.length) break;
    const removed = await bucket.remove(listed.data.map((f) => `${uid}/${f.name}`));
    if (removed.error) return json({ error: removed.error.message, step: 'photos' }, 500);
    // 지운 것이 없는데 목록이 남아 있으면(예: 하위 폴더) 끝없이 돌지 않고 멈춘다.
    if (!removed.data?.length) return json({ error: 'photo folder could not be emptied', step: 'photos' }, 500);
  }

  // 3. 데이터 행
  const rows = await admin.rpc('admin_delete_user_rows', { p_user: uid });
  if (rows.error) return json({ error: rows.error.message, step: 'rows' }, 500);

  // 4. 인증 계정 (이미 없으면 끝난 것)
  const deleted = await admin.auth.admin.deleteUser(uid);
  if (deleted.error && deleted.error.status !== 404) return json({ error: deleted.error.message, step: 'auth' }, 500);

  return json({ ok: true });
});
