/**
 * 구독 (2026-11-02 구독 흐름 시안 확정, Athena 구독 설계 D1~D10). UI 없는 순수 함수다.
 * 구독은 스토어(RevenueCat 권한 `all_access`)가 원본이다. 기기에는 마지막으로 확인한 상태만 둔다(app_settings `subscription`).
 * 구독 중에는 유료 묶음 모두를 쓰고, 목표를 개수 제한 없이 만들고, 광고가 없다. 산 묶음과 광고 제거는 구독과 따로 영구다.
 */
export type SubscriptionPlan = 'month' | 'year';

/** 마지막으로 확인한 상태. expiresAt은 스토어가 알려 준 끝나는 시각(결제 유예 중이면 유예가 끝나는 시각). */
export type StoredSubscription = { plan: SubscriptionPlan; expiresAt: number; willRenew: boolean; verifiedAt: number };

const DAY = 24 * 60 * 60 * 1000;
/** 끝나는 시각이 지났는데 아직 스토어에 확인하지 못했으면(오프라인, 위젯만 쓰는 사람) 3일 더 쓴다 (설계 D6). */
export const UNVERIFIED_GRACE_MS = 3 * DAY;
/** 구독이 아니면 만들 수 있는 목표 수. 완성한 목표도 센다 (설계 D9). */
export const FREE_GOAL_LIMIT = 5;

/** 구독으로 쓸 수 있는 마지막 시각. 끝난 뒤에 확인했으면 그 시각 그대로, 확인 전이면 3일 더. */
export function subscriptionEnd(s: StoredSubscription): number {
  return s.verifiedAt >= s.expiresAt ? s.expiresAt : s.expiresAt + UNVERIFIED_GRACE_MS;
}

export function isSubscribed(s: StoredSubscription | null, now: number): boolean {
  return s !== null && now < subscriptionEnd(s);
}

/**
 * 스토어에서 받은 상태를 기기 값으로 바꾼다. status가 null이면 확인하지 못한 것이라 전 값을 그대로 둔다.
 * 꺼졌다고 하면 끝난 기록으로 남긴다 — 끝나는 시각이 아직 미래면(환불 등) 지금으로 당긴다. 구독한 적이 없으면 아무것도 두지 않는다.
 */
export function nextStoredSubscription(
  prev: StoredSubscription | null,
  status: { active: true; plan: SubscriptionPlan; expiresAt: number; willRenew: boolean } | { active: false } | null,
  now: number,
): StoredSubscription | null {
  if (status === null) return prev;
  if (status.active) return { plan: status.plan, expiresAt: status.expiresAt, willRenew: status.willRenew, verifiedAt: now };
  if (!prev) return null;
  return { ...prev, expiresAt: Math.min(prev.expiresAt, now), willRenew: false, verifiedAt: now };
}

/** 새 목표를 만들 수 있는가. 이미 한도를 넘었어도 있는 목표는 그대로 쓴다 — 새로 만들기만 막는다 (설계 D10). */
export function canCreateGoal(goalCount: number, subscribed: boolean): boolean {
  return subscribed || goalCount < FREE_GOAL_LIMIT;
}

/** 연 구독이 월 구독 12번보다 얼마나 싼가. 통화가 다르거나 싸지 않으면 null. 할인율은 내림 (57.65% → 57%). */
export function yearlySaving(month: { amount: number; currency: string }, year: { amount: number; currency: string }): { percent: number; amount: number } | null {
  if (month.currency !== year.currency || month.amount <= 0) return null;
  const twelve = month.amount * 12;
  const saved = Math.round((twelve - year.amount) * 100) / 100;
  if (saved <= 0) return null;
  return { percent: Math.floor((saved / twelve) * 100), amount: saved };
}

/** 지금 구독하면 이번 기간(시작일, 끝나는 날)과 다음 결제일. 끝나는 날은 다음 결제일 전날 (설계 4.2). */
export function planPeriod(plan: SubscriptionPlan, now: Date): { start: Date; end: Date; next: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const next = new Date(start);
  if (plan === 'month') next.setMonth(next.getMonth() + 1);
  else next.setFullYear(next.getFullYear() + 1);
  // 1월 31일 + 1개월처럼 그 달에 없는 날이면 그 달 마지막 날로 맞춘다
  if (next.getDate() !== start.getDate()) next.setDate(0);
  const end = new Date(next);
  end.setDate(end.getDate() - 1);
  return { start, end, next };
}
