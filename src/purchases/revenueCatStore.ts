import { colorStickerPacks, type ColorStickerPackId } from '../stickers/color/catalog';
import type { BuyResult, Store } from './index';

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

/** react-native-purchases에서 쓰는 부분만. 테스트에서 가짜로 바꾼다. */
type CustomerInfo = { entitlements: { active: Record<string, unknown> } };
export interface PurchasesSdk {
  getProducts(ids: string[], category: 'NON_SUBSCRIPTION'): Promise<{ identifier: string }[]>;
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
    if (err.userCancelled) return { ok: false, reason: 'cancelled' };
    return { ok: false, reason: err.code === PAYMENT_PENDING ? 'pending' : 'failed' };
  }
}

/** 보상형 광고는 AdMob을 붙일 때까지 ads(지금은 개발용 대역)에 맡긴다. */
export function createRevenueCatStore(sdk: PurchasesSdk, ads: Pick<Store, 'showRewardedAd'>): Store {
  return {
    buyPack: (packId) => buy(sdk, productIdOf(packId), entitlementOf(packId)),
    buyAdFree: () => buy(sdk, AD_FREE_PRODUCT, AD_FREE_ENTITLEMENT),
    async restore() {
      const { active } = (await sdk.restorePurchases()).entitlements;
      return {
        packs: colorStickerPacks.filter((p) => !p.free && entitlementOf(p.id) in active).map((p) => p.id),
        adFree: AD_FREE_ENTITLEMENT in active,
      };
    },
    showRewardedAd: () => ads.showRewardedAd(),
  };
}
