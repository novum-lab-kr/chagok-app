// 계정 삭제 (계정과 백업 설계 ③). 지우는 순서와 멱등성은 _shared/deleteUser.ts.
import { adminClient, json, userIdFrom } from '../_shared/auth.ts';
import { deleteUserData } from '../_shared/deleteUser.ts';

Deno.serve(async (req) => {
  const requestedAt = new Date();
  const uid = await userIdFrom(req);
  if (!uid) return json({ error: 'unauthorized' }, 401);
  const admin = adminClient();
  const result = await deleteUserData(admin, uid, { unlinkKakao: true, route: 'app', requestedAt });
  if ('error' in result) return json(result, 500);
  return json({ ok: true });
});
