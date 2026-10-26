import { adminClient, describeIfServer, newUser } from './support';

// 카카오 연결 해제 웹훅. 카카오처럼 Supabase 토큰과 apikey 없이 보낸다.
// 진짜 카카오 identity는 테스트에서 만들 수 없어 실제 삭제는 손 시험으로 본다(계획 Task 7).
const endpoint = () => `${process.env.SUPABASE_TEST_URL}/functions/v1/kakao-unlink`;
const adminKey = process.env.KAKAO_ADMIN_KEY;
const itWithKey = adminKey ? it : it.skip;
const form = (o: Record<string, string>) => new URLSearchParams({ app_id: '1618098', user_id: '1', referrer_type: 'UNLINK_FROM_APPS', ...o });

const post = (authorization: string | null, body: URLSearchParams) => fetch(endpoint(), {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(authorization ? { Authorization: authorization } : {}) },
  body: body.toString(),
});

describeIfServer('kakao-unlink', () => {
  it('어드민 키가 없으면 401', async () => {
    const res = await post(null, form({}));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });

  it('어드민 키가 틀리면 401', async () => {
    expect((await post('KakaoAK wrong-key', form({}))).status).toBe(401);
  });

  itWithKey('가입 미완료 알림은 200으로 받고 지우지 않는다', async () => {
    expect((await post(`KakaoAK ${adminKey}`, form({ referrer_type: 'INCOMPLETE_SIGN_UP' }))).status).toBe(200);
  });

  itWithKey('모르는 회원번호는 200으로 받고 다른 사용자를 건드리지 않는다', async () => {
    const a = await newUser();
    expect((await post(`KakaoAK ${adminKey}`, form({}))).status).toBe(200);
    await new Promise((r) => setTimeout(r, 1500)); // 삭제는 응답 뒤에 돈다
    expect((await adminClient().auth.admin.getUserById(a.userId)).data.user?.id).toBe(a.userId);
  });

  itWithKey('GET 쿼리스트링 형식도 받는다', async () => {
    const res = await fetch(`${endpoint()}?${form({}).toString()}`, { headers: { Authorization: `KakaoAK ${adminKey}` } });
    expect(res.status).toBe(200);
  });

  itWithKey('회원번호가 없으면 400', async () => {
    expect((await post(`KakaoAK ${adminKey}`, form({ user_id: '' }))).status).toBe(400);
  });
});
