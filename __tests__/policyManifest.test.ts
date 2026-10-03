import { currentVersions, fetchPolicyManifest } from '../src/policy/manifest';

const v = (version: number, effectiveAt: string) => ({ version, postedAt: effectiveAt, effectiveAt, summary: '', requiresConsent: true });
it('시행 중인 판 번호', () => {
  const m = { terms: [v(1, '2026-09-30'), v(2, '2026-10-15')], privacy: [v(1, '2026-09-30')] };
  expect(currentVersions(m, '2026-10-01')).toEqual({ terms: 1, privacy: 1 });
  expect(currentVersions(m, '2026-10-15')).toEqual({ terms: 2, privacy: 1 });
  expect(() => currentVersions(m, '2026-09-01')).toThrow();
});
it('받기에 실패하면 던진다', async () => {
  const bad = (async () => ({ ok: false, status: 404, json: async () => ({}) })) as unknown as typeof fetch;
  await expect(fetchPolicyManifest(bad)).rejects.toThrow();
});
