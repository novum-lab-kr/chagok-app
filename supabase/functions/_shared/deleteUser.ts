// 사용자와 그 데이터를 지운다 (delete-account, kakao-unlink). 순서: 외부 연결 해제(Apple 토큰 폐기, 카카오 연결 끊기) → 사진 폴더 → 데이터 행 → 인증 계정
// → 인증 감사 기록의 개인 항목. 단계마다 이미 끝났으면 넘어가므로 다시 불러도 남은 단계부터 이어진다(멱등).
// 부를 때마다 결과(성공, 실패)를 파기 기록(private.account_deletions)에 한 줄 남긴다.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { appleConfigFrom, revokeToken } from './apple.ts';
import { kakaoIdFrom, unlinkKakaoUser } from './kakao.ts';

export type DeleteStep = 'apple' | 'kakao' | 'photos' | 'rows' | 'auth' | 'audit' | 'record';

/** 삭제를 요청한 경로. 파기 기록에 남는다. email은 운영자가 메일 요청을 처리할 때 쓴다(지금 코드에서는 부르지 않는다). */
export type DeleteRoute = 'app' | 'kakao_unlink' | 'email';

/** unlinkKakao: 카카오 연결도 끊을지. 카카오가 이미 끊었다고 알려 온 경우(kakao-unlink)는 false.
 *  requestedAt: 삭제 요청을 받은 시각. 다시 시도해도 처음 받은 시각을 넘긴다. */
export async function deleteUserData(
  admin: SupabaseClient,
  uid: string,
  opts: { unlinkKakao: boolean; route: DeleteRoute; requestedAt: Date },
): Promise<{ ok: true } | { error: string; step: DeleteStep }> {
  const result = await removeUser(admin, uid, opts.unlinkKakao);
  const recorded = await admin.rpc('admin_record_account_deletion', {
    p_user: uid,
    p_requested_at: opts.requestedAt.toISOString(),
    p_route: opts.route,
    p_result: 'ok' in result ? 'success' : 'failed',
  });
  if (recorded.error) {
    console.error('delete-user: deletion record failed', recorded.error.message);
    // 지우기는 끝났어도 기록을 못 남겼으면 실패로 돌려 다시 부르게 한다(다시 불러도 남은 단계만 돈다)
    if ('ok' in result) return { error: recorded.error.message, step: 'record' };
  }
  return result;
}

async function removeUser(
  admin: SupabaseClient,
  uid: string,
  unlinkKakao: boolean,
): Promise<{ ok: true } | { error: string; step: DeleteStep }> {
  // 1. 외부 연결 해제 — Apple 토큰 폐기. 폐기한 뒤 토큰 행을 지워, 다시 부르면 이 단계를 건너뛴다.
  //    폐기하지 못하면(설정 누락, Apple 오류) 멈춘다 — 데이터를 지운 뒤에는 되돌릴 수 없다.
  const apple = await admin.rpc('admin_get_apple_token', { p_user: uid });
  if (apple.error) return { error: apple.error.message, step: 'apple' };
  if (typeof apple.data === 'string') {
    try {
      await revokeToken(appleConfigFrom((name) => Deno.env.get(name)), apple.data);
    } catch (e) {
      // 설정 이름과 Apple 원문 오류는 서버 로그에만 남기고, 응답에는 단계와 일반 사유만 담는다
      console.error('delete-user: apple revoke failed', String(e));
      return { error: 'revoke_failed', step: 'apple' };
    }
    const cleared = await admin.rpc('admin_delete_apple_token', { p_user: uid });
    if (cleared.error) return { error: cleared.error.message, step: 'apple' };
  }

  //    카카오 연결 끊기 — 저장한 토큰 없이 어드민 키와 회원번호로 끊는다. 이미 끊겼으면(-101) 넘어가므로 다시 불러도 된다.
  //    인증 계정이 이미 없으면(지난 시도에서 4단계까지 끝남) identity도 없어 건너뛴다.
  if (unlinkKakao) {
    const found = await admin.auth.admin.getUserById(uid);
    if (found.error && found.error.status !== 404) return { error: found.error.message, step: 'kakao' };
    const kakaoId = kakaoIdFrom(found.data.user?.identities);
    if (kakaoId) {
      const adminKey = Deno.env.get('KAKAO_ADMIN_KEY');
      // Apple 단계와 같이 원문 오류는 서버 로그에만 남긴다
      if (!adminKey) {
        console.error('delete-user: KAKAO_ADMIN_KEY not set');
        return { error: 'unlink_failed', step: 'kakao' };
      }
      try {
        await unlinkKakaoUser(adminKey, kakaoId);
      } catch (e) {
        console.error('delete-user: kakao unlink failed', String(e));
        return { error: 'unlink_failed', step: 'kakao' };
      }
    }
  }

  // 2. 사진 폴더
  const bucket = admin.storage.from('record-photos');
  for (;;) {
    const listed = await bucket.list(uid, { limit: 100 });
    if (listed.error) return { error: listed.error.message, step: 'photos' };
    if (!listed.data.length) break;
    const removed = await bucket.remove(listed.data.map((f) => `${uid}/${f.name}`));
    if (removed.error) return { error: removed.error.message, step: 'photos' };
    // 지운 것이 없는데 목록이 남아 있으면(예: 하위 폴더) 끝없이 돌지 않고 멈춘다.
    if (!removed.data?.length) return { error: 'photo folder could not be emptied', step: 'photos' };
  }

  // 3. 데이터 행
  const rows = await admin.rpc('admin_delete_user_rows', { p_user: uid });
  if (rows.error) return { error: rows.error.message, step: 'rows' };

  // 4. 인증 계정 (이미 없으면 끝난 것)
  const deleted = await admin.auth.admin.deleteUser(uid);
  if (deleted.error && deleted.error.status !== 404) return { error: deleted.error.message, step: 'auth' };

  // 5. 인증 감사 기록의 개인 항목(이메일, 전화, 이름). 4단계가 남긴 계정 삭제 기록까지 고치도록 맨 뒤에 둔다.
  const scrubbed = await admin.rpc('admin_scrub_user_audit_log', { p_user: uid });
  if (scrubbed.error) return { error: scrubbed.error.message, step: 'audit' };

  return { ok: true };
}
