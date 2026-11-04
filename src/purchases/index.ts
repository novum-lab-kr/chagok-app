import { track } from '../analytics';
import { colorStickerPacks, type ColorStickerPackId } from '../stickers/color/catalog';
import { t } from '../i18n';
import { packName } from '../i18n/stickerNames';
import { getSubscription, grantPurchase, saveSubscription, setAdFree, startAdTrial } from '../repositories/packRepository';
import { isSubscribed, nextStoredSubscription, type SubscriptionPlan, type SubscriptionStatus } from '../domain/subscription';
import { notifyLocalChange } from '../sync/changes';
import { devStore } from './devStore';
import { priceLabel, type PriceLabels, type ProductKey, type StorePrice } from './price';
import type { RewardedPreloader } from './rewardedAd';

/** 결제·광고 (PRD 4.12). 결제 팝업은 Apple·Google이 그린다. */
/** pending: 보호자 승인(구입 승인 요청·가족 결제)을 기다린다. 승인되면 [구매 복원]으로 연다. */
export type BuyResult = { ok: true; subscription?: SubscriptionStatus } | { ok: false; reason: 'cancelled' | 'failed' | 'pending' };
export type AdResult = { ok: true } | { ok: false; reason: 'closed' | 'unavailable' };
export type { SubscriptionStatus } from '../domain/subscription';
export interface Store {
  buyPack(packId: ColorStickerPackId): Promise<BuyResult>;
  buyAdFree(): Promise<BuyResult>;
  /** 이 스토어 계정으로 산 묶음과 광고 제거, 그리고 구독 상태(확인하지 못했으면 null) */
  restore(): Promise<{ packs: ColorStickerPackId[]; adFree: boolean; subscription: SubscriptionStatus | null }>;
  subscribe(plan: SubscriptionPlan): Promise<BuyResult>;
  /** 지금 구독 상태. 확인하지 못하면(오프라인 등) null */
  subscriptionStatus(): Promise<SubscriptionStatus | null>;
  /** 스토어 구독 관리 화면 주소. 모르면 null — 부르는 쪽이 스토어 기본 주소를 연다 */
  manageSubscriptionUrl(): Promise<string | null>;
  /** 스토어에 정한 가격. 못 받아 온 상품은 빠진다 */
  prices(): Promise<Partial<Record<ProductKey, StorePrice>>>;
  /** 보상형 광고. 끝까지 봤을 때만 ok */
  showRewardedAd(): Promise<AdResult>;
}

export type PurchaseStore = Omit<Store, 'showRewardedAd'>;
export type AdStore = Pick<Store, 'showRewardedAd'>;

let override: Store | null = null;
/** 키가 있으면 앱을 켤 때 RevenueCat으로 바뀐다(revenueCat.ts). 없으면 개발용 대역. */
let purchases: PurchaseStore = devStore;
/** 광고 모듈이 든 빌드면 앱을 켤 때 AdMob으로 바뀐다(admob.ts). 없으면 개발용 대역. */
let ads: AdStore = devStore;
export const store = (): Store => override ?? { ...purchases, showRewardedAd: ads.showRewardedAd };
export function setActiveStore(s: PurchaseStore): void { purchases = s; }
/** 결제 키 없이 개발용 대역으로 도는가. 설정 개발 칸의 시험 구독 버튼이 본다 */
export const usingDevStore = (): boolean => override === null && purchases === devStore;
export function setAdStore(s: AdStore): void { ads = s; }
export function setStoreForTest(s: Store | null): void { override = s; }

/**
 * 보상형 광고를 지금 띄울 수 있는가. 광고 모듈이 든 빌드면 admob.ts가 미리 불러오기(createRewardedPreloader)로 바꾼다.
 * 없으면 개발용 대역이라 늘 준비됨 — [광고 보고 하루]를 누르면 바로 성공한다.
 */
export type RewardedReadiness = Pick<RewardedPreloader, 'ready' | 'preload' | 'subscribe'>;
const alwaysReady: RewardedReadiness = { ready: () => true, preload: () => {}, subscribe: () => () => {} };
let rewarded: RewardedReadiness = alwaysReady;
export function setRewardedReadiness(r: RewardedReadiness): void { rewarded = r; }
export const rewardedReadiness = (): RewardedReadiness => (override ? alwaysReady : rewarded);

/** 결제 계정 전환(RevenueCat logIn/logOut). 결제 모듈이 있는 빌드에서 revenueCat.ts가 넣는다 — 화면이 SDK를 직접 부르지 않게 */
let linkAccount: (userId: string | null) => Promise<void> = async () => {};
export function setPurchaseAccountLinker(fn: (userId: string | null) => Promise<void>): void { linkAccount = fn; }
/**
 * 로그아웃과 계정 삭제에서 기기를 비우기 전에 부른다. 결제 계정을 익명으로 돌려,
 * 비운 기기에 앞 계정의 구독이 다시 적히지 않게 한다 (보안 검토 2026-11-02 L1).
 */
export function signOutPurchases(): Promise<void> { return linkAccount(null); }

/**
 * 결제는 한 번에 하나 (2026-10-13). 결제 창이 떠 있는 동안 화면을 나갔다 와서 같은 상품을 다시 누르면 그 결제를 같이 기다리고,
 * 다른 상품이면 아무것도 하지 않는다 — 스토어가 「이미 진행 중」으로 거절해 실패처럼 보이던 문제.
 */
let inFlight: { key: string; result: Promise<BuyResult> } | null = null;
function oneAtATime(key: string, run: () => Promise<BuyResult>): Promise<BuyResult> {
  if (inFlight) return inFlight.key === key ? inFlight.result : Promise.resolve({ ok: false, reason: 'cancelled' });
  const result = run().finally(() => { inFlight = null; });
  inFlight = { key, result };
  return result;
}

/** 이벤트 기록용 결과 낱말 (src/analytics) */
function purchaseResult(r: BuyResult): 'success' | 'cancel' | 'fail' | 'pending' {
  if (r.ok) return 'success';
  if (r.reason === 'cancelled') return 'cancel';
  return r.reason === 'failed' ? 'fail' : 'pending';
}

export function buyPack(packId: ColorStickerPackId, now = Date.now()): Promise<BuyResult> {
  return oneAtATime(packId, async () => {
    track('purchase_start', { product: 'pack' });
    const r = await store().buyPack(packId);
    if (r.ok) await grantPurchase(packId, now);
    track('purchase_result', { product: 'pack', result: purchaseResult(r) });
    return r;
  });
}

/** 광고를 끝까지 본 때부터 24시간 (2026-10-08). */
export async function watchAdForPack(packId: ColorStickerPackId, now = Date.now()): Promise<{ ok: true; endsAt: number } | Extract<AdResult, { ok: false }>> {
  track('ad_rewarded_start');
  const r = await store().showRewardedAd();
  track('ad_rewarded_result', { result: r.ok ? 'earned' : r.reason });
  if (!r.ok) return r;
  return { ok: true, endsAt: await startAdTrial(packId, now) };
}

export function buyAdFree(): Promise<BuyResult> {
  return oneAtATime('adFree', async () => {
    track('purchase_start', { product: 'ad_free' });
    const r = await store().buyAdFree();
    if (r.ok) await setAdFree(true);
    track('purchase_result', { product: 'ad_free', result: purchaseResult(r) });
    return r;
  });
}

/**
 * 구독 상태를 스토어에 물어 기기에 맞춘다. 앱을 켤 때, 앞으로 올 때, 구독 화면과 앱 설정을 열 때 (구독 설계 4.3).
 * 확인하지 못하면 저장한 값으로 판단한다(끝난 뒤 3일 더, src/domain/subscription.ts). 바뀌면 위젯과 워치를 다시 맞춘다.
 */
export async function refreshSubscription(now = Date.now()): Promise<boolean> {
  let status: SubscriptionStatus | null;
  try {
    status = await store().subscriptionStatus();
  } catch {
    status = null;
  }
  return applySubscription(status, now);
}

async function applySubscription(status: SubscriptionStatus | null, now: number): Promise<boolean> {
  const prev = await getSubscription();
  const next = nextStoredSubscription(prev, status, now);
  if (JSON.stringify(next) !== JSON.stringify(prev)) {
    await saveSubscription(next);
    notifyLocalChange();
  }
  return isSubscribed(next, now);
}

/** 월 또는 연 구독. 결제 전 고지는 구독 화면에 모두 있어 확인 창을 띄우지 않는다 (구독 설계 D4). */
export function subscribe(plan: SubscriptionPlan, now = Date.now()): Promise<BuyResult> {
  return oneAtATime(`sub-${plan}`, async () => {
    track('purchase_start', { product: 'subscription' });
    const r = await store().subscribe(plan);
    // 결제 결과에 든 상태를 바로 쓴다. 없을 때만 다시 묻는다 — 다시 묻다 실패해 잠긴 채 「구독했어요」가 뜨지 않게
    if (r.ok) await (r.subscription ? applySubscription(r.subscription, now) : refreshSubscription(now));
    track('purchase_result', { product: 'subscription', result: purchaseResult(r) });
    return r;
  });
}

export async function manageSubscriptionUrl(): Promise<string | null> {
  try {
    return await store().manageSubscriptionUrl();
  } catch {
    return null;
  }
}

/** 구독 화면에 쓸 월과 연 가격(금액과 통화). 못 받아 온 것은 빠진다 */
export async function loadSubscriptionPrices(): Promise<Partial<Record<SubscriptionPlan, StorePrice>>> {
  const got = await store().prices();
  return { ...(got.month ? { month: got.month } : {}), ...(got.year ? { year: got.year } : {}) };
}

/** 산 묶음 전부와 광고 제거, 구독을 되살린다. 결과 문구용 이름: 「구독」, 묶음 순서대로 「○○ 묶음」, 끝에 「광고 제거」. */
export async function restorePurchases(now = Date.now()): Promise<string[]> {
  let restored: Awaited<ReturnType<Store['restore']>>;
  try {
    restored = await store().restore();
  } catch (error) {
    track('restore_result', { result: 'fail' });
    throw error;
  }
  track('restore_result', { result: 'success' });
  const { packs, adFree } = restored;
  for (const id of packs) await grantPurchase(id, now);
  if (adFree) await setAdFree(true);
  const subscribed = await applySubscription(restored.subscription, now);
  return [
    ...(subscribed ? [t('sub.title')] : []),
    ...colorStickerPacks.filter((p) => packs.includes(p.id)).map((p) => t('shop.packTitle', packName(p.id))),
    ...(adFree ? [t('shop.adFree')] : []),
  ];
}

let priceCache: PriceLabels = {};
/**
 * 화면에 쓸 가격 글자 (2026-10-13). 한 번 받아 온 값은 앱이 켜져 있는 동안 쓴다.
 * 못 받아 오면(오프라인·스토어 오류) 전에 받은 값, 그것도 없으면 빈 값 — 화면은 가격 없이 그린다.
 */
export async function loadPrices(): Promise<PriceLabels> {
  try {
    const got = await store().prices();
    const labels: PriceLabels = {};
    for (const [key, p] of Object.entries(got) as [ProductKey, StorePrice][]) labels[key] = priceLabel(p);
    priceCache = { ...priceCache, ...labels };
  } catch {
    // 가격 없이 그린다
  }
  return priceCache;
}
/** 앱을 켤 때 받아 둔 값. 화면은 이것으로 먼저 그린다 */
export const cachedPrices = (): PriceLabels => priceCache;
export function resetPricesForTest(): void { priceCache = {}; }
