import { colorStickerPacks, type ColorStickerPackId } from '../stickers/color/catalog';
import type { BuyResult, PurchaseStore, SubscriptionStatus } from './index';
import type { SubscriptionPlan } from '../domain/subscription';
import type { ProductKey, StorePrice } from './price';

/**
 * RevenueCat 결제 (2026-10-13 — Test Store로 개발, 출시 전에 스토어 키로 바꾼다).
 * 상품 ID는 지운 뒤에도 다시 못 쓴다 — 규칙은 src/stickers/color/README.md.
 * 앱은 상품이 아니라 권한(entitlement)으로 판단한다. 나중에 낼 구독도 같은 권한을 연다.
 */
export const productIdOf = (packId: ColorStickerPackId) => `com.novumlab.chagok.pack.${packId}`;
export const AD_FREE_PRODUCT = 'com.novumlab.chagok.adfree';
export const entitlementOf = (packId: ColorStickerPackId) => `pack_${packId}`;
export const AD_FREE_ENTITLEMENT = 'ad_free';
/** 구독 전용 권한. 묶음 권한(pack_*)과 광고 제거(ad_free)는 단품 전용이라 구독자가 복원해도 영구로 적히지 않는다 (구독 설계 2절) */
export const ALL_ACCESS_ENTITLEMENT = 'all_access';
/** 월과 연은 같은 구독 그룹에 둔다 — 둘을 동시에 결제하지 않게 (App Store 심사 지침 3.1.2(b)) */
export const SUBSCRIPTION_PRODUCTS: Record<SubscriptionPlan, string> = { month: 'com.novumlab.chagok.sub.monthly', year: 'com.novumlab.chagok.sub.yearly' };
/** PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR — 보호자 승인을 기다린다 */
const PAYMENT_PENDING = '20';
/** PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR — 앞 결제 창이 아직 열려 있다. 실패가 아니라 알리지 않는다 */
const ALREADY_IN_PROGRESS = '15';

/** react-native-purchases에서 쓰는 부분만. 테스트에서 가짜로 바꾼다. */
type Entitlement = { expirationDate?: string | null; willRenew?: boolean; productIdentifier?: string };
type CustomerInfo = { entitlements: { active: Record<string, Entitlement | undefined> }; managementURL?: string | null };
type Category = 'NON_SUBSCRIPTION' | 'SUBSCRIPTION';
export interface PurchasesSdk {
  getProducts(ids: string[], category: Category): Promise<{ identifier: string; price?: number; currencyCode?: string; priceString?: string }[]>;
  purchaseStoreProduct(product: { identifier: string }): Promise<{ customerInfo: CustomerInfo }>;
  restorePurchases(): Promise<CustomerInfo>;
  getCustomerInfo(): Promise<CustomerInfo>;
}

/** 열린 all_access에서 구독 상태를 읽는다. 끝나는 시각이 없으면(평생 권한 등) 구독으로 보지 않는다. */
function subscriptionOf(info: CustomerInfo): SubscriptionStatus {
  const e = info.entitlements.active[ALL_ACCESS_ENTITLEMENT];
  const expiresAt = e?.expirationDate ? Date.parse(e.expirationDate) : NaN;
  if (!e || Number.isNaN(expiresAt)) return { active: false };
  const plan: SubscriptionPlan = e.productIdentifier === SUBSCRIPTION_PRODUCTS.year ? 'year' : 'month';
  return { active: true, plan, expiresAt, willRenew: e.willRenew !== false };
}

async function buy(sdk: PurchasesSdk, productId: string, entitlement: string, category: Category = 'NON_SUBSCRIPTION'): Promise<BuyResult> {
  try {
    const [product] = await sdk.getProducts([productId], category);
    if (!product) return { ok: false, reason: 'failed' };
    const { customerInfo } = await sdk.purchaseStoreProduct(product);
    if (!(entitlement in customerInfo.entitlements.active)) return { ok: false, reason: 'failed' };
    return entitlement === ALL_ACCESS_ENTITLEMENT ? { ok: true, subscription: subscriptionOf(customerInfo) } : { ok: true };
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
    subscribe: (plan) => buy(sdk, SUBSCRIPTION_PRODUCTS[plan], ALL_ACCESS_ENTITLEMENT, 'SUBSCRIPTION'),
    async subscriptionStatus() {
      try {
        return subscriptionOf(await sdk.getCustomerInfo());
      } catch {
        return null;
      }
    },
    async manageSubscriptionUrl() {
      return (await sdk.getCustomerInfo()).managementURL ?? null;
    },
    /** 상품 ID → 묶음·광고 제거. 스토어에 아직 없는 상품은 빠진다 */
    /** 상품 ID → 묶음, 광고 제거, 구독. 스토어에 아직 없는 상품은 빠진다. 단품과 구독은 따로 묻고, 한쪽이 실패해도 다른 쪽은 쓴다 */
    async prices() {
      const keys: ProductKey[] = [...colorStickerPacks.filter((p) => !p.free).map((p) => p.id), 'adFree'];
      const idOf = (k: ProductKey) => (k === 'adFree' ? AD_FREE_PRODUCT : k === 'month' || k === 'year' ? SUBSCRIPTION_PRODUCTS[k] : productIdOf(k));
      const plans: ProductKey[] = ['month', 'year'];
      const [single, subs] = await Promise.allSettled([sdk.getProducts(keys.map(idOf), 'NON_SUBSCRIPTION'), sdk.getProducts(plans.map(idOf), 'SUBSCRIPTION')]);
      if (single.status === 'rejected' && subs.status === 'rejected') throw single.reason;
      const products = [...(single.status === 'fulfilled' ? single.value : []), ...(subs.status === 'fulfilled' ? subs.value : [])];
      const out: Partial<Record<ProductKey, StorePrice>> = {};
      for (const k of [...keys, ...plans]) {
        const p = products.find((x) => x.identifier === idOf(k));
        if (p && typeof p.price === 'number' && p.currencyCode && p.priceString) out[k] = { amount: p.price, currency: p.currencyCode, text: p.priceString };
      }
      return out;
    },
    async restore() {
      const info = await sdk.restorePurchases();
      const { active } = info.entitlements;
      return {
        packs: colorStickerPacks.filter((p) => !p.free && entitlementOf(p.id) in active).map((p) => p.id),
        adFree: AD_FREE_ENTITLEMENT in active,
        subscription: subscriptionOf(info),
      };
    },
  };
}
