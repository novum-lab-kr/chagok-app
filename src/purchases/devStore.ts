import type { BuyResult, Store, SubscriptionStatus } from './index';
import { getSubscription, listPackAccess, loadPackState } from '../repositories/packRepository';
import { isSubscribed, planPeriod } from '../domain/subscription';
import { colorStickerPacks } from '../stickers/color/catalog';

const note = (what: string) => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.info(`개발용 결제: ${what} — 실제 결제 없이 결과를 고른다`);
};

/**
 * 개발용 대역 (2026-10-08 계획 A). 결제는 고르는 창에서 고른 결과, 광고는 바로 성공한다.
 * 복원은 이 기기에서 산 것을 그대로 돌려준다. 실제 RevenueCat·AdMob은 다음 계획에서 같은 Store로 끼운다.
 */
/**
 * 결제 결과를 고르는 창 (2026-11-02 사용자 요청). RevenueCat 테스트 스토어처럼 성공, 실패, 취소를 고른다.
 * 앱이 켜질 때 app/_layout.tsx가 넣는다. 없으면(테스트) 바로 성공 — 키 없는 빌드에서 몰래 공짜로 열리지 않게 창을 띄운다.
 */
export type DevPurchaseChoice = 'success' | 'failed' | 'cancelled' | 'pending';
let choose: ((what: string) => Promise<DevPurchaseChoice>) | null = null;
export function setDevPurchaseChooser(fn: (what: string) => Promise<DevPurchaseChoice>): void { choose = fn; }
async function decide(what: string): Promise<BuyResult> {
  note(what);
  const c = choose ? await choose(what) : 'success';
  return c === 'success' ? { ok: true } : { ok: false, reason: c };
}

/** 개발용 구독: 앱을 켜 둔 동안 이 값, 껐다 켜면 기기에 저장한 값으로 이어 간다 */
let devSubscription: SubscriptionStatus | null = null;

export const devStore: Store = {
  buyPack: (packId) => decide(`${packId} 묶음`),
  buyAdFree: () => decide('광고 제거'),
  async restore() {
    const packs = (await listPackAccess()).filter((a) => a.expiresAt === null).map((a) => a.packId);
    return { packs, adFree: (await loadPackState()).adFreePurchased, subscription: await devStore.subscriptionStatus() };
  },
  async subscribe(plan) {
    const r = await decide(`${plan === 'month' ? '월' : '연'} 구독`);
    if (r.ok) devSubscription = { active: true, plan, expiresAt: planPeriod(plan, new Date()).next.getTime(), willRenew: true };
    return r;
  },
  async subscriptionStatus() {
    if (devSubscription) return devSubscription;
    const s = await getSubscription();
    return s && isSubscribed(s, Date.now()) ? { active: true, plan: s.plan, expiresAt: s.expiresAt, willRenew: s.willRenew } : { active: false };
  },
  async manageSubscriptionUrl() { return null; },
  /** RELEASE-DECISIONS의 가격: 묶음 2,200원, 광고 제거 5,500원, 구독 월 4,900원과 연 24,900원 */
  async prices() {
    const won = (amount: number) => ({ amount, currency: 'KRW', text: `₩${amount.toLocaleString('en-US')}` });
    return { ...Object.fromEntries(colorStickerPacks.filter((p) => !p.free).map((p) => [p.id, won(2200)])), adFree: won(5500), month: won(4900), year: won(24900) };
  },
  async showRewardedAd() { note('보상형 광고'); return { ok: true }; },
};

/**
 * 시험용: 개발용 구독을 해지 예약하거나 끝낸다 (2026-11-02 사용자 결정). 시험 결제로는 해지와 만료를 만들 수 없어서 둔다.
 * 설정의 개발 칸에서만 부른다. 부른 뒤 refreshSubscription이 기기 값에 반영한다.
 */
export async function devChangeSubscription(change: 'cancel' | 'expire'): Promise<void> {
  const cur = await devStore.subscriptionStatus();
  devSubscription = change === 'cancel' && cur?.active ? { ...cur, willRenew: false } : { active: false };
}
