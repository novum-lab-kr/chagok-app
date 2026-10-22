import { kakaoIdFrom, unlinkKakaoUser, type Fetch } from '../supabase/functions/_shared/kakao';

function fakeFetch(status: number, body: string) {
  const calls: { url: string; headers: Record<string, string>; form: URLSearchParams }[] = [];
  const f: Fetch = async (url, init) => {
    calls.push({ url, headers: init.headers, form: new URLSearchParams(init.body) });
    return { ok: status >= 200 && status < 300, status, text: async () => body };
  };
  return { f, calls };
}

describe('unlinkKakaoUser', () => {
  it('어드민 키로 회원번호의 연결 끊기를 요청한다', async () => {
    const { f, calls } = fakeFetch(200, '{"id":4501234567}');
    await expect(unlinkKakaoUser('admin-key', '4501234567', f)).resolves.toBe('unlinked');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://kapi.kakao.com/v1/user/unlink');
    expect(calls[0].headers.Authorization).toBe('KakaoAK admin-key');
    expect(calls[0].headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(Object.fromEntries(calls[0].form)).toEqual({ target_id_type: 'user_id', target_id: '4501234567' });
  });
  it('이미 끊긴 사용자(-101)는 끝난 것으로 본다 — 카카오 설정에서 먼저 끊었거나, 지난 시도에서 끊은 뒤 다시 누른 경우', async () => {
    const { f } = fakeFetch(400, '{"msg":"NotRegisteredUserException","code":-101}');
    await expect(unlinkKakaoUser('admin-key', '4501234567', f)).resolves.toBe('already');
  });
  it('어드민 키가 틀리면(401) 멈춘다', async () => {
    const { f } = fakeFetch(401, '{"msg":"wrong appKey","code":-401}');
    await expect(unlinkKakaoUser('bad', '4501234567', f)).rejects.toThrow('kakao unlink 401');
  });
  it('카카오 서버 오류는 멈춘다', async () => {
    const { f } = fakeFetch(500, 'internal');
    await expect(unlinkKakaoUser('admin-key', '4501234567', f)).rejects.toThrow('kakao unlink 500');
  });
});

describe('kakaoIdFrom', () => {
  it('카카오 identity의 sub(회원번호)를 읽는다', () => {
    expect(kakaoIdFrom([{ provider: 'apple', id: 'a' }, { provider: 'kakao', id: 'x', identity_data: { sub: '4501234567' } }])).toBe('4501234567');
  });
  it('sub가 없으면 identity id를 쓴다', () => {
    expect(kakaoIdFrom([{ provider: 'kakao', id: '4501234567', identity_data: {} }])).toBe('4501234567');
  });
  it('카카오 identity가 없으면 null', () => {
    expect(kakaoIdFrom([{ provider: 'apple', id: 'a' }])).toBeNull();
    expect(kakaoIdFrom(undefined)).toBeNull();
  });
});
