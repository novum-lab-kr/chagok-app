import { scrubBreadcrumb, scrubEvent, scrubUrl } from '../scrub';

describe('scrubUrl', () => {
  it('앞 두 칸만 남기고 뒷부분과 쿼리를 지운다', () => {
    expect(scrubUrl('https://api.example.com/rest/v1/goals?id=eq.abc')).toBe('https://api.example.com/rest/v1');
    expect(scrubUrl('https://api.example.com/v1/subscribers/user-1')).toBe('https://api.example.com/v1/subscribers');
  });

  it('경로가 없으면 주소 앞부분만 남긴다', () => {
    expect(scrubUrl('https://api.example.com?token=abc')).toBe('https://api.example.com');
  });

  it('초대 코드는 남기지 않는다(웹 주소와 앱 주소)', () => {
    expect(scrubUrl('https://chagok.novum-lab.com/invite/ABCD2345EFGH')).toBe('https://chagok.novum-lab.com/invite');
    expect(scrubUrl('chagok://invite/ABCD2345EFGH')).toBe('chagok://invite');
    expect(scrubUrl('chagok-dev://invite/ABCD2345?x=1')).toBe('chagok-dev://invite');
  });

  it('주소가 아니면 아무것도 남기지 않는다', () => {
    expect(scrubUrl('/local/path/photo.jpg')).toBe('');
  });
});

describe('scrubBreadcrumb', () => {
  it('요청 주소를 줄인다', () => {
    const crumb = scrubBreadcrumb({ category: 'fetch', data: { url: 'https://a.example.com/b/c/d?e=f', status_code: 200 } });
    expect(crumb).toEqual({ category: 'fetch', data: { url: 'https://a.example.com/b/c', status_code: 200 } });
  });

  it('주소가 없으면 그대로 둔다', () => {
    const crumb: { category: string; data?: Record<string, unknown> } = { category: 'ui' };
    expect(scrubBreadcrumb(crumb)).toBe(crumb);
  });
});

describe('scrubEvent', () => {
  it('기기 이름과 서버 이름을 지우고 모델은 남긴다', () => {
    const event = scrubEvent({
      server_name: '은주의 iPhone',
      contexts: { device: { name: '은주의 iPhone', model: 'iPhone17,1' }, os: { name: 'iOS' } },
    });
    expect(event).toEqual({ contexts: { device: { model: 'iPhone17,1' }, os: { name: 'iOS' } } });
  });

  it('기기 정보가 없어도 동작한다', () => {
    expect(scrubEvent({ server_name: 'x' })).toEqual({});
  });
});

describe('이벤트에 합쳐진 기록', () => {
  it('네이티브 쪽 기록의 주소도 앞 두 칸만 남긴다', () => {
    const event = scrubEvent({ breadcrumbs: [{ data: { url: 'https://example.test/a/b/user-id/photo.jpg?x=1' } }] });
    expect(event.breadcrumbs?.[0]?.data?.url).toBe('https://example.test/a/b');
  });
});
