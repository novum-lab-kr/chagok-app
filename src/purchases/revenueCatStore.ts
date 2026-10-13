import { colorStickerPacks, type ColorStickerPackId } from '../stickers/color/catalog';
import type { BuyResult, PurchaseStore } from './index';
import type { ProductKey, StorePrice } from './price';

/**
 * RevenueCat 결제 (2026-10-13 — Test Store로 개발, 출시 전에 스토어 키로 바꾼다).
 * 상품 ID는 지운 뒤에도 다시 못 쓴다 — 규칙은 src/stickers/color/README.md.
 * 앱은 상품이 아니라 권한(entitlement)으로 판단한다. 나중에 낼 구독도 같은 권한을 연다.
 */
export const productIdOf = (packId: ColorStickerPackId) => `com.novum.chagok.pack.${packId}`;
export const AD_FREE_PRODUCT = 'com.novum.chagok.adfree';
export const entitlementOf = (packId: ColorStickerPackId) => `pack_${packId}`;
export const AD_FREE_ENTITLEMENT = 'ad_free';
/** PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR — 보호자 승인을 기다린다 */
const PAYMENT_PENDING = '20';
/** PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR — 앞 결제 창이 아직 열려 있다. 실패가 아니라 알리지 않는다 */
const ALREADY_IN_PROGRESS = '15';

/** react-native-purchases에서 쓰는 부분만. 테스트에서 가짜로 바꾼다. */
type CustomerInfo = { entitlements: { active: Record<string, unknown> } };
export interface PurchasesSdk {
  getProducts(ids: string[], category: 'NON_SUBSCRIPTION'): Promise<{ identifier: string; price?: number; currencyCode?: string; priceString?: string }[]>;
  purchaseStoreProduct(product: { identifier: string }): Promise<{ customerInfo: CustomerInfo }>;
  restorePurchases(): Promise<CustomerInfo>;
}

async function buy(sdk: PurchasesSdk, productId: string, entitlement: string): Promise<BuyResult> {
  try {
    const [product] = await sdk.getProducts([productId], 'NON_SUBSCRIPTION');
    if (!product) return { ok: false, reason: 'failed' };
    const { customerInfo } = await sdk.purchaseStoreProduct(product);
    return entitlement in customerInfo.entitlements.active ? { ok: true } : { ok: false, reason: 'failed' };
  } catch (e) {
    const err = e as { userCancelled?: boolean | null; code?: string };
    if (err.userCancelled || err.code === ALREADY_IN_PROGRESS) return { ok: false, reason: 'cancelled' };
    return { ok: false, reason: err.code === PAYMENT_PENDING ? 'pending' : 'failed' };
  }
}

/** 보상형 광고는 따로(admob.ts) 끼운다. */
export function createRevenueCatStore(sdk: PurchasesSdk): PurchaseStore {
  return {
    buyPack: (packId) => buy(sdk, productIdOf(packId), entitlementOf(packId)),
    buyAdFree: () => buy(sdk, AD_FREE_PRODUCT, AD_FREE_ENTITLEMENT),
    /** 상품 ID → 묶음·광고 제거. 스토어에 아직 없는 상품은 빠진다 */
    async prices() {
      const keys: ProductKey[] = [...colorStickerPacks.filter((p) => !p.free).map((p) => p.id), 'adFree'];
      const idOf = (k: ProductKey) => (k === 'adFree' ? AD_FREE_PRODUCT : productIdOf(k));
      const products = await sdk.getProducts(keys.map(idOf), 'NON_SUBSCRIPTION');
      const out: Partial<Record<ProductKey, StorePrice>> = {};
      for (const k of keys) {
        const p = products.find((x) => x.identifier === idOf(k));
        if (p && typeof p.price === 'number' && p.currencyCode && p.priceString) out[k] = { amount: p.price, currency: p.currencyCode, text: p.priceString };
      }
      return out;
    },
    async restore() {
      const { active } = (await sdk.restorePurchases()).entitlements;
      return {
        packs: colorStickerPacks.filter((p) => !p.free && entitlementOf(p.id) in active).map((p) => p.id),
        adFree: AD_FREE_ENTITLEMENT in active,
      };
    },
  };
}
