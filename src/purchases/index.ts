import { track } from '../analytics';
import { colorStickerPacks, type ColorStickerPackId } from '../stickers/color/catalog';
import { grantPurchase, setAdFree, startAdTrial } from '../repositories/packRepository';
import { devStore } from './devStore';
import { priceLabel, type PriceLabels, type ProductKey, type StorePrice } from './price';

/** 결제·광고 (PRD 4.12). 결제 팝업은 Apple·Google이 그린다. */
/** pending: 보호자 승인(구입 승인 요청·가족 결제)을 기다린다. 승인되면 [구매 복원]으로 연다. */
export type BuyResult = { ok: true } | { ok: false; reason: 'cancelled' | 'failed' | 'pending' };
export type AdResult = { ok: true } | { ok: false; reason: 'closed' | 'unavailable' };
export interface Store {
  buyPack(packId: ColorStickerPackId): Promise<BuyResult>;
  buyAdFree(): Promise<BuyResult>;
  /** 이 스토어 계정으로 산 묶음과 광고 제거 */
  restore(): Promise<{ packs: ColorStickerPackId[]; adFree: boolean }>;
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
export function setAdStore(s: AdStore): void { ads = s; }
export function setStoreForTest(s: Store | null): void { override = s; }

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

/** 산 묶음 전부와 광고 제거를 되살린다. 결과 문구용 이름: 묶음 순서대로 「○○ 묶음」, 끝에 「광고 제거」. */
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
  return [
    ...colorStickerPacks.filter((p) => packs.includes(p.id)).map((p) => `${p.label} 묶음`),
    ...(adFree ? ['광고 제거'] : []),
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
