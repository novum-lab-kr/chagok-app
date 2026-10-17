// Edge Function 공용: JSON 응답과 로그인 사용자 확인.
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5';

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const jwks = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

/**
 * 토큰의 서명을 서버 공개 키로 직접 검증하고 사용자 id를 돌려준다. 게이트웨이 설정(verify_jwt)에 기대지 않는다 —
 * 배포 옵션이나 셀프 호스팅 기본값에 따라 꺼져 있을 수 있다. `auth.getUser()`를 쓰지 않는 이유는
 * 인증 계정이 이미 지워진 뒤의 재시도(남은 단계 이어 하기)도 받아야 해서다.
 * 대칭 키(HS256)만 쓰는 서버에서는 공개 키가 없어 모두 거부된다(안전한 쪽으로 실패).
 */
export async function userIdFrom(req: Request): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${SUPABASE_URL}/auth/v1`, audience: 'authenticated', algorithms: ['ES256', 'RS256'],
    });
    return payload.role === 'authenticated' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
