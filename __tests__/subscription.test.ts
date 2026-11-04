import { FREE_GOAL_LIMIT, UNVERIFIED_GRACE_MS, canCreateGoal, isSubscribed, nextStoredSubscription, planPeriod, subscriptionEnd, yearlySaving, type StoredSubscription } from '../src/domain/subscription';
import { packStatus, type PackAccess } from '../src/domain/packs';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date(2026, 10, 2, 12, 0).getTime();
const sub = (over: Partial<StoredSubscription> = {}): StoredSubscription => ({ plan: 'month', expiresAt: now + 10 * DAY, willRenew: true, verifiedAt: now, ...over });

describe('구독 상태', () => {
  it('끝나는 시각 전에는 구독 중', () => {
    expect(isSubscribed(sub(), now)).toBe(true);
    expect(isSubscribed(null, now)).toBe(false);
  });
  it('끝난 뒤 확인하지 못했으면 3일 더 쓴다 (D6)', () => {
    const s = sub({ expiresAt: now - DAY, verifiedAt: now - 2 * DAY });
    expect(subscriptionEnd(s)).toBe(now - DAY + UNVERIFIED_GRACE_MS);
    expect(isSubscribed(s, now)).toBe(true);
    expect(isSubscribed(s, now + 3 * DAY)).toBe(false);
  });
  it('끝난 뒤 확인했으면 바로 끝', () => {
    expect(isSubscribed(sub({ expiresAt: now - DAY, verifiedAt: now }), now)).toBe(false);
  });
});

describe('스토어 결과를 기기 값으로', () => {
  it('확인하지 못하면 전 값을 그대로 둔다', () => {
    const prev = sub();
    expect(nextStoredSubscription(prev, null, now + DAY)).toBe(prev);
  });
  it('켜져 있으면 새 값으로 바꾼다', () => {
    expect(nextStoredSubscription(null, { active: true, plan: 'year', expiresAt: now + 365 * DAY, willRenew: false }, now))
      .toEqual({ plan: 'year', expiresAt: now + 365 * DAY, willRenew: false, verifiedAt: now });
  });
  it('꺼졌으면 끝난 기록으로 남기고, 미래의 끝나는 시각은 지금으로 당긴다(환불)', () => {
    const ended = nextStoredSubscription(sub(), { active: false }, now + DAY)!;
    expect(ended.expiresAt).toBe(now + DAY);
    expect(isSubscribed(ended, now + DAY)).toBe(false);
  });
  it('구독한 적 없으면 아무것도 두지 않는다', () => {
    expect(nextStoredSubscription(null, { active: false }, now)).toBeNull();
  });
});

describe('목표 한도 (D9, D10)', () => {
  it('구독이 아니면 5개까지, 구독 중이면 제한 없음', () => {
    expect(FREE_GOAL_LIMIT).toBe(5);
    expect(canCreateGoal(4, false)).toBe(true);
    expect(canCreateGoal(5, false)).toBe(false);
    expect(canCreateGoal(9, false)).toBe(false);
    expect(canCreateGoal(9, true)).toBe(true);
  });
});

describe('연 구독 할인', () => {
  it('4,900원 월과 24,900원 연: 57%, 1년에 33,900원', () => {
    expect(yearlySaving({ amount: 4900, currency: 'KRW' }, { amount: 24900, currency: 'KRW' })).toEqual({ percent: 57, amount: 33900 });
  });
  it('통화가 다르거나 싸지 않으면 보이지 않는다', () => {
    expect(yearlySaving({ amount: 4900, currency: 'KRW' }, { amount: 19.99, currency: 'USD' })).toBeNull();
    expect(yearlySaving({ amount: 1, currency: 'USD' }, { amount: 12, currency: 'USD' })).toBeNull();
  });
});

describe('이번 기간과 다음 결제일', () => {
  it('월: 11월 2일 시작이면 12월 1일까지, 다음 결제일 12월 2일', () => {
    const p = planPeriod('month', new Date(2026, 10, 2, 9));
    expect([p.start.getMonth(), p.start.getDate(), p.end.getMonth(), p.end.getDate(), p.next.getMonth(), p.next.getDate()]).toEqual([10, 2, 11, 1, 11, 2]);
  });
  it('연: 2027년 11월 1일까지', () => {
    const p = planPeriod('year', new Date(2026, 10, 2));
    expect([p.end.getFullYear(), p.end.getMonth(), p.end.getDate()]).toEqual([2027, 10, 1]);
  });
  it('1월 31일 + 1개월은 2월 마지막 날', () => {
    const p = planPeriod('month', new Date(2027, 0, 31));
    expect([p.next.getMonth(), p.next.getDate(), p.end.getMonth(), p.end.getDate()]).toEqual([1, 28, 1, 27]);
  });
});

describe('묶음 권한에 구독 (판단 순서: 무료 → 산 것 → 구독 중 → 체험 → 잠김)', () => {
  const subRow = (expiresAt: number): PackAccess => ({ packId: 'snack_normal', source: 'sub', grantedAt: now, expiresAt });
  it('구독 중이면 체험보다 앞선다', () => {
    const trial: PackAccess = { packId: 'snack_normal', source: 'ad', grantedAt: now, expiresAt: now + DAY };
    expect(packStatus('snack_normal', [trial, subRow(now + 10 * DAY)], now).state).toBe('subscribed');
  });
  it('산 묶음은 구독보다 앞선다', () => {
    const bought: PackAccess = { packId: 'snack_normal', source: 'purchase', grantedAt: now, expiresAt: null };
    expect(packStatus('snack_normal', [bought, subRow(now + 10 * DAY)], now).state).toBe('owned');
  });
  it('구독이 끝나면 남은 체험이 살아난다', () => {
    const trial: PackAccess = { packId: 'snack_normal', source: 'days', grantedAt: now, expiresAt: now + 3 * DAY };
    expect(packStatus('snack_normal', [trial, subRow(now - DAY)], now)).toMatchObject({ state: 'trial', trialKind: '3일' });
  });
  it('구독이 가장 늦게 끝났으면 잠김 안내는 구독', () => {
    const oldTrial: PackAccess = { packId: 'snack_normal', source: 'ad', grantedAt: now - 9 * DAY, expiresAt: now - 8 * DAY };
    expect(packStatus('snack_normal', [oldTrial, subRow(now - DAY)], now)).toEqual({ state: 'locked', endedKind: '구독' });
  });
});
