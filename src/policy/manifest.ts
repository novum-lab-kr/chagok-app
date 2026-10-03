import type { DateKey } from '../domain/dates';
import { POLICY_MANIFEST_URL } from './urls';
import { effectiveVersion, type PolicyManifest } from './versions';

/** 동의 기록에 남길 판을 정하려고 받는다. 실패하면 던진다 — 어느 판에 동의했는지 모른 채 연결하지 않는다. */
export async function fetchPolicyManifest(fetchFn: typeof fetch = fetch): Promise<PolicyManifest> {
  const res = await fetchFn(POLICY_MANIFEST_URL, { cache: 'no-store' } as RequestInit);
  if (!res.ok) throw new Error(`versions.json ${res.status}`);
  return (await res.json()) as PolicyManifest;
}

/** 오늘 시행 중인 약관·처리방침 판 번호. 시행 중인 판이 없으면 던진다. */
export function currentVersions(m: PolicyManifest, today: DateKey): { terms: number; privacy: number } {
  const terms = effectiveVersion(m.terms, today);
  const privacy = effectiveVersion(m.privacy, today);
  if (!terms || !privacy) throw new Error('시행 중인 약관이 없어요');
  return { terms: terms.version, privacy: privacy.version };
}
