import { createRevenueCatStore, type PurchasesSdk } from '../src/purchases/revenueCatStore';

const info = (...active: string[]) => ({ entitlements: { active: Object.fromEntries(active.map((k) => [k, {}])) } });
function fakeSdk(over: Partial<PurchasesSdk> = {}): PurchasesSdk & { asked: string[][] } {
  const asked: string[][] = [];
  return {
    asked,
    getProducts: async (ids) => { asked.push(ids); return ids.map((identifier) => ({ identifier })); },
    purchaseStoreProduct: async (p) => ({
      customerInfo: info(p.identifier === 'com.novumlab.chagok.adfree' ? 'ad_free' : `pack_${p.identifier.split('.').pop()}`),
    }),
    restorePurchases: async () => info(),
    getCustomerInfo: async () => info(),
    ...over,
  };
}

describe('RevenueCat 결제', () => {
  it('묶음과 광고 제거는 정해 둔 상품 ID로 산다', async () => {
    const sdk = fakeSdk();
    const store = createRevenueCatStore(sdk);
    expect(await store.buyPack('sports_normal')).toEqual({ ok: true });
    expect(await store.buyAdFree()).toEqual({ ok: true });
    expect(sdk.asked).toEqual([['com.novumlab.chagok.pack.sports_normal'], ['com.novumlab.chagok.adfree']]);
  });

  it('결제 창을 닫으면 취소, 그 밖의 오류는 실패', async () => {
    const cancel = createRevenueCatStore(fakeSdk({ purchaseStoreProduct: async () => { throw { userCancelled: true }; } }));
    expect(await cancel.buyPack('snack_normal')).toEqual({ ok: false, reason: 'cancelled' });
    const fail = createRevenueCatStore(fakeSdk({ purchaseStoreProduct: async () => { throw { userCancelled: false }; } }));
    expect(await fail.buyPack('snack_normal')).toEqual({ ok: false, reason: 'failed' });
  });

  it('앞 결제 창이 아직 열려 있으면(이미 진행 중) 실패가 아니라 취소처럼 조용히 끝낸다', async () => {
    const store = createRevenueCatStore(fakeSdk({ purchaseStoreProduct: async () => { throw { userCancelled: false, code: '15' }; } }));
    expect(await store.buyAdFree()).toEqual({ ok: false, reason: 'cancelled' });
  });

  it('보호자 승인을 기다리면 pending', async () => {
    const store = createRevenueCatStore(fakeSdk({ purchaseStoreProduct: async () => { throw { userCancelled: false, code: '20' }; } }));
    expect(await store.buyPack('snack_normal')).toEqual({ ok: false, reason: 'pending' });
  });

  it('상품이 없거나 사고도 권한이 안 열리면 실패', async () => {
    const missing = createRevenueCatStore(fakeSdk({ getProducts: async () => [] }));
    expect(await missing.buyPack('snack_normal')).toEqual({ ok: false, reason: 'failed' });
    const noAccess = createRevenueCatStore(fakeSdk({ purchaseStoreProduct: async () => ({ customerInfo: info() }) }));
    expect(await noAccess.buyPack('snack_normal')).toEqual({ ok: false, reason: 'failed' });
  });

  it('복원은 열린 권한에서 묶음과 광고 제거를 고른다', async () => {
    const store = createRevenueCatStore(fakeSdk({ restorePurchases: async () => info('pack_weather_normal', 'pack_sports_normal', 'ad_free', 'pack_unknown') }));
    expect(await store.restore()).toEqual({ packs: ['sports_normal', 'weather_normal'], adFree: true, subscription: { active: false } });
  });

  it('가격은 묶음·광고 제거 상품을 한 번에 묻고, 가격이 없는 상품은 뺀다', async () => {
    const sdk = fakeSdk({
      getProducts: async (ids) => ids.flatMap((identifier) =>
        identifier.endsWith('sports_normal') ? [{ identifier, price: 2200, currencyCode: 'KRW', priceString: '₩2,200' }]
          : identifier.endsWith('adfree') ? [{ identifier, price: 4.99, currencyCode: 'USD', priceString: '$4.99' }]
            : identifier.endsWith('snack_normal') ? [{ identifier }] : []),
    });
    expect(await createRevenueCatStore(sdk).prices()).toEqual({
      sports_normal: { amount: 2200, currency: 'KRW', text: '₩2,200' },
      adFree: { amount: 4.99, currency: 'USD', text: '$4.99' },
    });
  });

  it('구독은 구독 상품으로 사고 all_access 권한으로 판단한다', async () => {
    const sdk = fakeSdk({
      purchaseStoreProduct: async () => ({ customerInfo: { entitlements: { active: { all_access: { expirationDate: '2027-11-02T00:00:00Z', willRenew: true, productIdentifier: 'com.novumlab.chagok.sub.yearly' } } } } }),
    });
    expect(await createRevenueCatStore(sdk).subscribe('year')).toEqual({ ok: true, subscription: { active: true, plan: 'year', expiresAt: Date.parse('2027-11-02T00:00:00Z'), willRenew: true } });
    expect(sdk.asked.at(-1)).toEqual(['com.novumlab.chagok.sub.yearly']);
  });

  it('구독 상태: 열린 all_access의 끝나는 시각과 갱신 여부, 없으면 꺼짐, 못 물으면 null', async () => {
    const on = fakeSdk({ getCustomerInfo: async () => ({ entitlements: { active: { all_access: { expirationDate: '2026-12-02T00:00:00Z', willRenew: false, productIdentifier: 'com.novumlab.chagok.sub.monthly' } } }, managementURL: 'https://apps.apple.com/account/subscriptions' }) });
    const store = createRevenueCatStore(on);
    expect(await store.subscriptionStatus()).toEqual({ active: true, plan: 'month', expiresAt: Date.parse('2026-12-02T00:00:00Z'), willRenew: false });
    expect(await store.manageSubscriptionUrl()).toBe('https://apps.apple.com/account/subscriptions');
    expect(await createRevenueCatStore(fakeSdk()).subscriptionStatus()).toEqual({ active: false });
    expect(await createRevenueCatStore(fakeSdk({ getCustomerInfo: async () => { throw new Error('offline'); } })).subscriptionStatus()).toBeNull();
  });

  it('구독자의 복원은 묶음을 영구로 적지 않는다 — 구독 권한은 묶음 권한과 따로다', async () => {
    const store = createRevenueCatStore(fakeSdk({ restorePurchases: async () => ({ entitlements: { active: { all_access: { expirationDate: '2026-12-02T00:00:00Z', productIdentifier: 'com.novumlab.chagok.sub.monthly' } } } }) }));
    const r = await store.restore();
    expect(r.packs).toEqual([]);
    expect(r.subscription).toMatchObject({ active: true, plan: 'month' });
  });

  it('구독 가격은 구독 상품으로 따로 묻는다', async () => {
    const sdk = fakeSdk({
      getProducts: async (ids, category) => (category === 'SUBSCRIPTION' ? ids.map((identifier) => ({ identifier, price: identifier.endsWith('yearly') ? 24900 : 4900, currencyCode: 'KRW', priceString: 'x' })) : []),
    });
    expect(await createRevenueCatStore(sdk).prices()).toEqual({ month: { amount: 4900, currency: 'KRW', text: 'x' }, year: { amount: 24900, currency: 'KRW', text: 'x' } });
  });
});
