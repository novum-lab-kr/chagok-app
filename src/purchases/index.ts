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

export async function buyPack(packId: ColorStickerPackId, now = Date.now()): Promise<BuyResult> {
  const r = await store().buyPack(packId);
  if (r.ok) await grantPurchase(packId, now);
  return r;
}

/** 광고를 끝까지 본 때부터 24시간 (2026-10-08). */
export async function watchAdForPack(packId: ColorStickerPackId, now = Date.now()): Promise<{ ok: true; endsAt: number } | Extract<AdResult, { ok: false }>> {
  const r = await store().showRewardedAd();
  if (!r.ok) return r;
  return { ok: true, endsAt: await startAdTrial(packId, now) };
}

export async function buyAdFree(): Promise<BuyResult> {
  const r = await store().buyAdFree();
  if (r.ok) await setAdFree(true);
  return r;
}

/** 산 묶음 전부와 광고 제거를 되살린다. 결과 문구용 이름: 묶음 순서대로 「○○ 묶음」, 끝에 「광고 제거」. */
export async function restorePurchases(now = Date.now()): Promise<string[]> {
  const { packs, adFree } = await store().restore();
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
