// 카카오 연결 해제 웹훅. 사용자가 카카오에서 연결을 끊거나 카카오계정을 탈퇴하면 카카오가 부른다.
// 3초 안에 200을 줘야 하고 다시 보내 주지 않는다. 확인을 통과하면 바로 200을 주고 삭제는 응답 뒤에 한다.
// 실패하면 2초, 8초 뒤에 다시 하고, 그래도 안 되면 private.kakao_unlink_failures에 남긴다(운영자가 다시 보낸다).
// 로그에는 회원번호를 남기지 않는다. 삭제는 멱등이라 같은 요청을 다시 보내면 남은 단계부터 이어진다.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { json } from '../_shared/auth.ts';
import { deleteUserData } from '../_shared/deleteUser.ts';
import { decideUnlink, retryUnlink, type UnlinkAttempt } from '../_shared/kakaoUnlink.ts';

// Supabase Edge Runtime 전역. 응답을 보낸 뒤에도 이 작업이 끝날 때까지 함수를 살려 둔다.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const RETRY_DELAYS_MS = [2000, 8000];

async function remove(kakaoId: string, referrer: string) {
  const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const attempt = async (): Promise<UnlinkAttempt> => {
    const found = await admin.rpc('admin_find_user_by_identity', { p_provider: 'kakao', p_provider_id: kakaoId });
    if (found.error) return 'find';
    if (typeof found.data !== 'string') return 'no_user';
    // 카카오 연결은 이미 끊겼으니 다시 끊지 않는다
    const result = await deleteUserData(admin, found.data, { unlinkKakao: false });
    return 'error' in result ? result.step : 'deleted';
  };
  const outcome = await retryUnlink(attempt, RETRY_DELAYS_MS, (ms) => new Promise((r) => setTimeout(r, ms)));
  if ('failed' in outcome) {
    const saved = await admin.rpc('admin_record_kakao_unlink_failure', { p_kakao_id: kakaoId, p_referrer: referrer, p_step: outcome.failed });
    return console.error('kakao-unlink: failed', referrer, outcome.failed, saved.error ? 'not recorded' : 'recorded');
  }
  // 지난번에 실패해 남은 기록이 있으면 지운다
  await admin.rpc('admin_clear_kakao_unlink_failure', { p_kakao_id: kakaoId });
  console.log('kakao-unlink:', outcome.done, referrer);
}

Deno.serve(async (req) => {
  const params = new URL(req.url).searchParams;
  if (req.method === 'POST') {
    const body = await req.text().catch(() => '');
    for (const [k, v] of new URLSearchParams(body)) if (!params.has(k)) params.set(k, v);
  }
  const decision = decideUnlink({ authorization: req.headers.get('Authorization'), params }, Deno.env.get('KAKAO_ADMIN_KEY') ?? '');
  if (decision.kind === 'reject') return json({ error: 'unauthorized' }, 401);
  if (decision.kind === 'bad_request') return json({ error: 'bad_request' }, 400);
  if (decision.kind === 'ignore') {
    console.log('kakao-unlink: ignored', decision.referrer);
    return json({ ok: true });
  }
  EdgeRuntime.waitUntil(remove(decision.kakaoId, decision.referrer).catch((e) => {
    console.error('kakao-unlink: failed', decision.referrer, 'unexpected', String(e));
  }));
  return json({ ok: true });
});
