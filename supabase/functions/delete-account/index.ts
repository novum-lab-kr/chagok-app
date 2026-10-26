// 계정 삭제 (계정과 백업 설계 ③). 지우는 순서와 멱등성은 _shared/deleteUser.ts.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { json, userIdFrom } from '../_shared/auth.ts';
import { deleteUserData } from '../_shared/deleteUser.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

Deno.serve(async (req) => {
  const uid = await userIdFrom(req);
  if (!uid) return json({ error: 'unauthorized' }, 401);
  const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await deleteUserData(admin, uid, { unlinkKakao: true });
  if ('error' in result) return json(result, 500);
  return json({ ok: true });
});
