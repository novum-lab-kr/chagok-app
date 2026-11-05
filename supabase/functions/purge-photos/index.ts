// 서버가 지운 기록의 사진 파일 지우기 (20261105000006_together_fixes.sql 3번, 처리방침 파기 약속).
// 나가기나 내보내기로 기록 행이 지워지면 서버가 사진 경로를 private.photo_trash에 모은다. 저장소 파일은 SQL로 지울 수 없어
// 여기서 저장소 API로 지우고 줄을 지운다. 앱이 나가기, 내보내기, 차단 뒤에 부른다(로그인한 사람 누구나, 모인 경로 전체를 지운다).
// 모은 경로는 기록 주인 폴더의 경로뿐이다(트리거가 거른다). 이미 없는 파일은 지운 것으로 본다.
import { adminClient, json, userIdFrom } from '../_shared/auth.ts';

const BATCH = 100;
const MAX_ROUNDS = 10; // 한 번에 1000개까지. 남으면 다음 호출이 지운다

Deno.serve(async (req) => {
  if (!(await userIdFrom(req))) return json({ error: 'unauthorized' }, 401);
  const admin = adminClient();
  const bucket = admin.storage.from('record-photos');
  let removed = 0;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const taken = await admin.rpc('admin_take_photo_trash', { p_limit: BATCH });
    if (taken.error) {
      console.error('purge-photos: take failed', taken.error.message);
      return json({ error: 'take_failed' }, 500);
    }
    const paths = (taken.data ?? []) as string[];
    if (!paths.length) break;
    const res = await bucket.remove(paths);
    if (res.error) {
      console.error('purge-photos: remove failed', res.error.message);
      return json({ error: 'remove_failed' }, 500);
    }
    const cleared = await admin.rpc('admin_clear_photo_trash', { p_paths: paths });
    if (cleared.error) {
      console.error('purge-photos: clear failed', cleared.error.message);
      return json({ error: 'clear_failed' }, 500);
    }
    removed += paths.length;
    if (paths.length < BATCH) break;
  }
  return json({ ok: true, removed });
});
