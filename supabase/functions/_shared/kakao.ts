// 카카오 연결 끊기 (상위 계획 2단계, delete-account).
// Deno(Edge Function)와 Node(jest) 둘 다에서 돈다 — 표준 Web API(fetch)만 쓰고 import가 없다.
// 카카오 토큰은 저장하지 않는다. 어드민 키와 회원번호만으로 끊는다.

export type Fetch = (
  url: string,
  init: { method: 'POST'; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

type Identity = { provider: string; id?: string; identity_data?: Record<string, unknown> };

/** Supabase 사용자의 카카오 회원번호(ID 토큰 sub). 카카오로 로그인한 적이 없으면 null. */
export function kakaoIdFrom(identities: Identity[] | undefined): string | null {
  const kakao = identities?.find((i) => i.provider === 'kakao');
  if (!kakao) return null;
  const sub = kakao.identity_data?.sub;
  if (typeof sub === 'string' && sub) return sub;
  return kakao.id ?? null;
}

/** 이 앱과 사용자의 연결을 끊는다(동의 철회와 카카오 토큰 폐기). 이미 끊긴 사용자(-101)는 끊긴 것과 같다. */
export async function unlinkKakaoUser(adminKey: string, kakaoId: string, f: Fetch = fetch): Promise<'unlinked' | 'already'> {
  const res = await f('https://kapi.kakao.com/v1/user/unlink', {
    method: 'POST',
    headers: { Authorization: `KakaoAK ${adminKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ target_id_type: 'user_id', target_id: kakaoId }).toString(),
  });
  if (res.ok) return 'unlinked';
  const text = await res.text();
  if (res.status === 400 && /"code"\s*:\s*-101\b/.test(text)) return 'already';
  throw new Error(`kakao unlink ${res.status}: ${text}`);
}
