import type { SubscriptionPlanView, SubscriptionSummary } from '../design-system';
import { planPeriod, isSubscribed, yearlySaving, type StoredSubscription, type SubscriptionPlan } from '../domain/subscription';
import { getLanguage, t } from '../i18n';
import { priceLabel, wonLabel, type StorePrice } from '../purchases/price';

const pad = (n: number) => String(n).padStart(2, '0');
/** 기간 칸: 한국어 「2026.11.02」, 영어 「Nov 2, 2026」 */
const shortDate = (d: Date) => (getLanguage() === 'ko' ? `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}` : t('date.yearMonthDay', d.getFullYear(), d.getMonth() + 1, d.getDate()));
/** 결제일: 「2026년 12월 2일」, 「Dec 2, 2026」 */
const longDate = (d: Date) => t('date.yearMonthDay', d.getFullYear(), d.getMonth() + 1, d.getDate());

/** 아끼는 금액 글자. 원화는 「33,900원」, 다른 통화는 기기 언어의 통화 형식 */
function moneyLabel(amount: number, currency: string): string {
  if (currency === 'KRW') return wonLabel(amount);
  try {
    return new Intl.NumberFormat(getLanguage() === 'ko' ? 'ko-KR' : 'en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/**
 * 구독 화면의 요금 카드 두 장. 가격은 스토어에서 받아 온 값이고, 둘 중 하나라도 없으면 null — 화면은 다시 시도를 보인다.
 * 연 구독은 할인율과 1년에 아끼는 금액만 보인다. 한 달로 나눈 금액은 보이지 않는다 (2026-11-02 사용자).
 */
export function planViews(prices: Partial<Record<SubscriptionPlan, StorePrice>>, now: Date): Record<SubscriptionPlan, SubscriptionPlanView> | null {
  const { month, year } = prices;
  if (!month || !year) return null;
  const view = (plan: SubscriptionPlan, p: StorePrice): SubscriptionPlanView => {
    const period = planPeriod(plan, now);
    return { price: priceLabel(p), range: t('sub.range', shortDate(period.start), shortDate(period.end)), next: longDate(period.next) };
  };
  const saving = yearlySaving(month, year);
  return {
    month: view('month', month),
    year: { ...view('year', year), ...(saving ? { savePercent: saving.percent, saveAmount: moneyLabel(saving.amount, year.currency) } : {}) },
  };
}

/** 앱 설정 「구매」의 구독 칸. 끝난 구독은 구독 전과 같이 보인다. */
export function subscriptionSummary(s: StoredSubscription | null, now: number): SubscriptionSummary {
  if (!s || !isSubscribed(s, now)) return { state: 'none' };
  return { state: s.willRenew ? 'active' : 'cancelling', plan: s.plan, date: longDate(new Date(s.expiresAt)) };
}
