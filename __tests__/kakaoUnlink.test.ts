import { decideUnlink, retryUnlink, sameSecret } from '../supabase/functions/_shared/kakaoUnlink';

const p = (o: Record<string, string>) => new URLSearchParams(o);
const ok = { app_id: '1618098', user_id: '4501234567', referrer_type: 'UNLINK_FROM_APPS' };

describe('decideUnlink', () => {
  it('어드민 키와 앱 ID가 맞으면 회원번호를 지운다', () => {
    expect(decideUnlink({ authorization: 'KakaoAK key', params: p(ok) }, 'key'))
      .toEqual({ kind: 'delete', kakaoId: '4501234567', referrer: 'UNLINK_FROM_APPS' });
  });

  it.each(['ACCOUNT_DELETE', 'FORCED_ACCOUNT_DELETE', 'UNLINK_FROM_ADMIN', 'SOMETHING_NEW'])('%s도 지운다', (r) => {
    expect(decideUnlink({ authorization: 'KakaoAK key', params: p({ ...ok, referrer_type: r }) }, 'key').kind).toBe('delete');
  });

  it('가입 미완료는 지우지 않는다', () => {
    expect(decideUnlink({ authorization: 'KakaoAK key', params: p({ ...ok, referrer_type: 'INCOMPLETE_SIGN_UP' }) }, 'key'))
      .toEqual({ kind: 'ignore', kakaoId: '4501234567', referrer: 'INCOMPLETE_SIGN_UP' });
  });

  it.each([null, '', 'KakaoAK wrong', 'Bearer key', 'key'])('키가 틀리면(%s) 거부한다', (a) => {
    expect(decideUnlink({ authorization: a, params: p(ok) }, 'key')).toEqual({ kind: 'reject' });
  });

  it('다른 앱의 알림은 거부한다', () => {
    expect(decideUnlink({ authorization: 'KakaoAK key', params: p({ ...ok, app_id: '999' }) }, 'key')).toEqual({ kind: 'reject' });
  });

  it('서버에 어드민 키가 없으면 모두 거부한다', () => {
    expect(decideUnlink({ authorization: 'KakaoAK ', params: p(ok) }, '')).toEqual({ kind: 'reject' });
  });

  it('회원번호가 없거나 숫자가 아니면 잘못된 요청', () => {
    expect(decideUnlink({ authorization: 'KakaoAK key', params: p({ ...ok, user_id: '' }) }, 'key')).toEqual({ kind: 'bad_request' });
    expect(decideUnlink({ authorization: 'KakaoAK key', params: p({ ...ok, user_id: '12a' }) }, 'key')).toEqual({ kind: 'bad_request' });
  });
});

describe('sameSecret', () => {
  it('길이가 달라도 false, 빈 값은 false', () => {
    expect(sameSecret('abc', 'abc')).toBe(true);
    expect(sameSecret('abc', 'abd')).toBe(false);
    expect(sameSecret('abc', 'abcd')).toBe(false);
    expect(sameSecret('', '')).toBe(false);
  });
});

describe('retryUnlink', () => {
  const run = async (results: (string | Error)[]) => {
    const waits: number[] = [];
    let i = 0;
    const out = await retryUnlink(async () => {
      const r = results[i++];
      if (r instanceof Error) throw r;
      return r;
    }, [2000, 8000], async (ms) => { waits.push(ms); });
    return { out, waits, tries: i };
  };

  it('처음에 지우면 기다리지 않는다', async () => {
    expect(await run(['deleted'])).toEqual({ out: { done: 'deleted' }, waits: [], tries: 1 });
  });

  it('찾을 사용자가 없으면 다시 하지 않는다', async () => {
    expect(await run(['no_user'])).toEqual({ out: { done: 'no_user' }, waits: [], tries: 1 });
  });

  it('실패하면 2초, 8초 뒤에 다시 한다', async () => {
    expect(await run(['photos', 'rows', 'deleted'])).toEqual({ out: { done: 'deleted' }, waits: [2000, 8000], tries: 3 });
  });

  it('세 번 다 실패하면 마지막 단계를 돌려준다', async () => {
    expect(await run(['photos', 'photos', 'auth'])).toEqual({ out: { failed: 'auth' }, waits: [2000, 8000], tries: 3 });
  });

  it('예상하지 못한 오류도 실패로 세고 다시 한다', async () => {
    expect(await run([new Error('boom'), 'deleted'])).toEqual({ out: { done: 'deleted' }, waits: [2000], tries: 2 });
    expect((await run([new Error('a'), new Error('b'), new Error('c')])).out).toEqual({ failed: 'unexpected' });
  });
});
