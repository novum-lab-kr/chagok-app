// 카카오 연결 해제 웹훅 요청 확인 (kakao-unlink).
// Deno(Edge Function)와 Node(jest) 둘 다에서 돈다 — import가 없다.
// 진짜 카카오 요청인지는 대표 어드민 키(Authorization: KakaoAK ...)와 앱 ID로 본다.

export const KAKAO_APP_ID = '1618098';

export type UnlinkDecision =
  | { kind: 'reject' }
  | { kind: 'bad_request' }
  | { kind: 'ignore'; kakaoId: string; referrer: string }
  | { kind: 'delete'; kakaoId: string; referrer: string };

/** 비밀값 비교. 길이가 달라도 긴 쪽 끝까지 돈다. 빈 값은 항상 false. */
export function sameSecret(a: string, b: string): boolean {
  if (!a || !b) return false;
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** 웹훅 요청을 어떻게 할지. params는 쿼리스트링과 form 본문을 합친 것. */
export function decideUnlink(input: { authorization: string | null; params: URLSearchParams }, adminKey: string): UnlinkDecision {
  const auth = input.authorization ?? '';
  const key = auth.startsWith('KakaoAK ') ? auth.slice('KakaoAK '.length) : '';
  if (!sameSecret(key, adminKey)) return { kind: 'reject' };
  if (input.params.get('app_id') !== KAKAO_APP_ID) return { kind: 'reject' };
  const kakaoId = input.params.get('user_id') ?? '';
  if (!/^\d+$/.test(kakaoId)) return { kind: 'bad_request' };
  const referrer = input.params.get('referrer_type') ?? '';
  // 가입 미완료로 끊긴 것은 지우지 않는다 — 우리 흐름에서는 생기지 않아야 하고, 생기면 로그로 알아챈다
  if (referrer === 'INCOMPLETE_SIGN_UP') return { kind: 'ignore', kakaoId, referrer };
  return { kind: 'delete', kakaoId, referrer };
}

/** 한 번 지우기 시도의 결과. 'deleted', 'no_user'(찾을 사용자 없음), 그 밖은 실패한 단계 이름. */
export type UnlinkAttempt = 'deleted' | 'no_user' | (string & {});

/** 실패하면 delaysMs만큼 기다렸다 다시 한다(시도 횟수 = 기다림 수 + 1). 카카오는 다시 보내 주지 않아서다. */
export async function retryUnlink(
  attempt: () => Promise<UnlinkAttempt>,
  delaysMs: number[],
  sleep: (ms: number) => Promise<void>,
): Promise<{ done: 'deleted' | 'no_user' } | { failed: string }> {
  let failed = '';
  for (let i = 0; i <= delaysMs.length; i++) {
    if (i > 0) await sleep(delaysMs[i - 1]);
    const result: string = await attempt().catch(() => 'unexpected');
    if (result === 'deleted') return { done: 'deleted' };
    if (result === 'no_user') return { done: 'no_user' };
    failed = result;
  }
  return { failed };
}
