import { NativeModules } from 'react-native';
import Purchases, { PRODUCT_CATEGORY } from 'react-native-purchases';
import { setActiveStore } from './index';
import { createRevenueCatStore } from './revenueCatStore';

let configured = false;

/**
 * 앱을 켤 때 한 번. 키(.env.local의 EXPO_PUBLIC_REVENUECAT_KEY)가 없거나 결제 모듈이 없는 빌드면
 * 개발용 대역 그대로 둔다 — 다른 작업 공간과 예전 개발 빌드가 깨지지 않게.
 * Test Store 키는 출시 빌드에서 SDK가 일부러 멈춘다(RevenueCat 문서). 출시 전에 스토어 키로 바꾼다.
 */
export function configureRevenueCat(): boolean {
  if (configured) return true;
  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_KEY;
  if (!apiKey || !NativeModules.RNPurchases) return false;
  Purchases.configure({ apiKey });
  configured = true;
  setActiveStore(createRevenueCatStore({
    getProducts: (ids) => Purchases.getProducts(ids, PRODUCT_CATEGORY.NON_SUBSCRIPTION),
    purchaseStoreProduct: (product) => Purchases.purchaseStoreProduct(product as Parameters<typeof Purchases.purchaseStoreProduct>[0]),
    restorePurchases: () => Purchases.restorePurchases(),
  }));
  return true;
}

/**
 * 로그인한 계정에 구매를 묶는다 — 다른 기기에서 같은 계정으로 [구매 복원]하면 되살아난다.
 * 실패하면(오프라인) 다음 로그인 변화 때 다시 한다. 로그인 전 구매는 RevenueCat이 그 계정으로 옮긴다.
 */
export async function linkPurchaseAccount(userId: string | null): Promise<void> {
  if (!configured) return;
  try {
    if (userId) await Purchases.logIn(userId);
    else if (!(await Purchases.isAnonymous())) await Purchases.logOut();
  } catch {
    // 구매 자체는 스토어 계정에 남아 있다
  }
}
