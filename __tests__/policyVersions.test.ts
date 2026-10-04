import { effectiveVersion, monthDayLabel, needsReconsent, upcomingChange } from '../src/policy/versions';
import type { PolicyManifest, PolicyVersion } from '../src/policy/versions';
import { policyUrl } from '../src/policy/urls';

const v = (version: number, effectiveAt: string, requiresConsent = true): PolicyVersion =>
  ({ version, postedAt: '2026-10-01', effectiveAt, summary: '', requiresConsent });

describe('시행 중인 판', () => {
  const list = [v(1, '2026-10-01'), v(2, '2026-11-08')];
  it('시행일 전날은 이전 판이다', () => expect(effectiveVersion(list, '2026-11-07')?.version).toBe(1));
  it('시행일 당일부터 새 판이다', () => expect(effectiveVersion(list, '2026-11-08')?.version).toBe(2));
  it('순서가 섞여 있어도 판 번호가 큰 것을 고른다', () =>
    expect(effectiveVersion([list[1], list[0]], '2026-12-01')?.version).toBe(2));
  it('시행된 판이 없으면 null', () => expect(effectiveVersion(list, '2026-09-30')).toBeNull());
});

describe('재동의 판단', () => {
  const manifest: PolicyManifest = {
    terms: [v(1, '2026-10-01'), v(2, '2026-11-08')],
    privacy: [v(1, '2026-10-01', false), v(2, '2026-11-08', false)],
  };
  it('동의한 판보다 높은 판이 시행되고 동의가 필요하면 참', () =>
    expect(needsReconsent(manifest, { terms: 1, privacy: 1 }, '2026-11-08')).toBe(true));
  it('시행 전이면 거짓', () =>
    expect(needsReconsent(manifest, { terms: 1, privacy: 1 }, '2026-11-07')).toBe(false));
  it('requiresConsent가 거짓인 개정은 묻지 않는다', () =>
    expect(needsReconsent(manifest, { terms: 2, privacy: 1 }, '2026-12-01')).toBe(false));
  it('목록을 받지 못하면 묻지 않는다', () =>
    expect(needsReconsent(null, { terms: 1, privacy: 1 }, '2026-12-01')).toBe(false));
});

describe('개정 안내', () => {
  const posted = (version: number, postedAt: string, effectiveAt: string): PolicyVersion =>
    ({ version, postedAt, effectiveAt, summary: '', requiresConsent: true });
  const list = [posted(1, '2026-09-30', '2026-09-30'), posted(2, '2026-10-08', '2026-10-15')];
  it('게시일부터 시행일 전날까지 새 판을 알린다', () => {
    expect(upcomingChange(list, '2026-10-08', 0)?.version).toBe(2);
    expect(upcomingChange(list, '2026-10-14', 0)?.version).toBe(2);
  });
  it('게시 전과 시행일부터는 알리지 않는다', () => {
    expect(upcomingChange(list, '2026-10-07', 0)).toBeNull();
    expect(upcomingChange(list, '2026-10-15', 0)).toBeNull();
  });
  it('이미 알린 판은 다시 알리지 않는다', () => expect(upcomingChange(list, '2026-10-10', 2)).toBeNull());
  it('시행 중인 판이 없으면(처음 게시) 바뀐 것이 아니라 알리지 않는다', () =>
    expect(upcomingChange([posted(1, '2026-09-30', '2026-10-07')], '2026-10-01', 0)).toBeNull());
  it('예고된 판이 둘이면 번호가 큰 판을 알린다', () =>
    expect(upcomingChange([...list, posted(3, '2026-10-09', '2026-11-09')], '2026-10-10', 0)?.version).toBe(3));
  it('시행일을 「M월 D일」로 쓴다', () => expect(monthDayLabel('2026-10-05')).toBe('10월 5일'));
});

describe('정책 URL', () => {
  it('종류별 최신본 주소', () => {
    expect(policyUrl('terms')).toBe('https://chagok-app-terms.netlify.app/terms/');
    expect(policyUrl('privacy')).toBe('https://chagok-app-terms.netlify.app/privacy/');
  });
});
