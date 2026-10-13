import { createRevenueCatStore, type PurchasesSdk } from '../src/purchases/revenueCatStore';

const ads = { showRewardedAd: async () => ({ ok: true as const }) };
const info = (...active: string[]) => ({ entitlements: { active: Object.fromEntries(active.map((k) => [k, {}])) } });
function fakeSdk(over: Partial<PurchasesSdk> = {}): PurchasesSdk & { asked: string[][] } {
  const asked: string[][] = [];
  return {
    asked,
    getProducts: async (ids) => { asked.push(ids); return ids.map((identifier) => ({ identifier })); },
    purchaseStoreProduct: async (p) => ({
      customerInfo: info(p.identifier === 'com.novum.chagok.adfree' ? 'ad_free' : `pack_${p.identifier.split('.').pop()}`),
    }),
    restorePurchases: async () => info(),
    ...over,
  };
}

describe('RevenueCat 결제', () => {
  it('묶음과 광고 제거는 정해 둔 상품 ID로 산다', async () => {
    const sdk = fakeSdk();
    const store = createRevenueCatStore(sdk, ads);
    expect(await store.buyPack('animals_normal')).toEqual({ ok: true });
    expect(await store.buyAdFree()).toEqual({ ok: true });
    expect(sdk.asked).toEqual([['com.novum.chagok.pack.animals_normal'], ['com.novum.chagok.adfree']]);
  });

  it('결제 창을 닫으면 취소, 그 밖의 오류는 실패', async () => {
    const cancel = createRevenueCatStore(fakeSdk({ purchaseStoreProduct: async () => { throw { userCancelled: true }; } }), ads);
    expect(await cancel.buyPack('snack_normal')).toEqual({ ok: false, reason: 'cancelled' });
    const fail = createRevenueCatStore(fakeSdk({ purchaseStoreProduct: async () => { throw { userCancelled: false }; } }), ads);
    expect(await fail.buyPack('snack_normal')).toEqual({ ok: false, reason: 'failed' });
  });

  it('보호자 승인을 기다리면 pending', async () => {
    const store = createRevenueCatStore(fakeSdk({ purchaseStoreProduct: async () => { throw { userCancelled: false, code: '20' }; } }), ads);
    expect(await store.buyPack('snack_normal')).toEqual({ ok: false, reason: 'pending' });
  });

  it('상품이 없거나 사고도 권한이 안 열리면 실패', async () => {
    const missing = createRevenueCatStore(fakeSdk({ getProducts: async () => [] }), ads);
    expect(await missing.buyPack('snack_normal')).toEqual({ ok: false, reason: 'failed' });
    const noAccess = createRevenueCatStore(fakeSdk({ purchaseStoreProduct: async () => ({ customerInfo: info() }) }), ads);
    expect(await noAccess.buyPack('snack_normal')).toEqual({ ok: false, reason: 'failed' });
  });

  it('복원은 열린 권한에서 묶음과 광고 제거를 고른다', async () => {
    const store = createRevenueCatStore(fakeSdk({ restorePurchases: async () => info('pack_weather_normal', 'pack_sports_normal', 'ad_free', 'pack_unknown') }), ads);
    expect(await store.restore()).toEqual({ packs: ['sports_normal', 'weather_normal'], adFree: true });
  });

  it('보상형 광고는 넘겨준 쪽에 맡긴다', async () => {
    const store = createRevenueCatStore(fakeSdk(), { showRewardedAd: async () => ({ ok: false, reason: 'closed' }) });
    expect(await store.showRewardedAd()).toEqual({ ok: false, reason: 'closed' });
  });
});
