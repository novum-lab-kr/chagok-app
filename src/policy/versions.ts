import type { DateKey } from '../domain/dates';

export type PolicyKind = 'terms' | 'privacy';

/** chagok-app-policy/versions.json의 한 판. 날짜는 로컬 'YYYY-MM-DD'. */
export type PolicyVersion = {
  version: number;
  postedAt: DateKey;
  effectiveAt: DateKey;
  summary: string;
  /** 문구만 다듬은 개정은 false — 재동의를 받지 않는다 */
  requiresConsent: boolean;
};

export type PolicyManifest = Record<PolicyKind, PolicyVersion[]>;

/** 오늘 시행 중인 판: 시행일이 지난 판 중 번호가 가장 큰 것. */
export function effectiveVersion(list: readonly PolicyVersion[], today: DateKey): PolicyVersion | null {
  let best: PolicyVersion | null = null;
  for (const v of list) if (v.effectiveAt <= today && (!best || v.version > best.version)) best = v;
  return best;
}

/**
 * 로그인한 사용자에게 동의 화면을 다시 띄울지. 목록을 받지 못하면 묻지 않는다 — 앱 사용을 막지 않는다.
 * 동의한 판 이후의 시행된 판 중 하나라도 동의가 필요하면 참이다.
 */
export function needsReconsent(
  manifest: PolicyManifest | null,
  agreed: Record<PolicyKind, number>,
  today: DateKey,
): boolean {
  if (!manifest) return false;
  return (['terms', 'privacy'] as const).some((kind) =>
    manifest[kind].some((v) => v.effectiveAt <= today && v.version > agreed[kind] && v.requiresConsent),
  );
}
