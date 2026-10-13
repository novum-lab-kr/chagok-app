import { getDb } from '../src/db/client';
import { AD_TRIAL_MS } from '../src/domain/packs';
import { buyAdFree, buyPack, loadPrices, resetPricesForTest, restorePurchases, setStoreForTest, watchAdForPack, type Store } from '../src/purchases';
import { priceLabel } from '../src/purchases/price';
import { grantPurchase, listPackAccess, loadPackState } from '../src/repositories/packRepository';
import { withFreshDb } from './support/setup';

withFreshDb();

const now = Date.UTC(2026, 9, 8, 14);
function fakeStore(over: Partial<Store>): Store {
  return {
    buyPack: async () => ({ ok: true }),
    buyAdFree: async () => ({ ok: true }),
    restore: async () => ({ packs: [], adFree: false }),
    prices: async () => ({}),
    showRewardedAd: async () => ({ ok: true }),
    ...over,
  };
}
afterEach(() => { setStoreForTest(null); resetPricesForTest(); });

describe('purchases', () => {
  it('사면 그 묶음이 영구로 열린다', async () => {
    setStoreForTest(fakeStore({}));
    expect(await buyPack('animals_normal', now)).toEqual({ ok: true });
    expect(await listPackAccess()).toEqual([{ packId: 'animals_normal', source: 'purchase', grantedAt: now, expiresAt: null }]);
  });

  it('결제를 취소하면 아무것도 열리지 않는다', async () => {
    setStoreForTest(fakeStore({ buyPack: async () => ({ ok: false, reason: 'cancelled' }) }));
    expect(await buyPack('animals_normal', now)).toEqual({ ok: false, reason: 'cancelled' });
    expect(await listPackAccess()).toEqual([]);
  });

  it('광고를 끝까지 보면 24시간, 닫으면 시작하지 않는다', async () => {
    setStoreForTest(fakeStore({ showRewardedAd: async () => ({ ok: false, reason: 'closed' }) }));
    expect(await watchAdForPack('animals_normal', now)).toEqual({ ok: false, reason: 'closed' });
    expect(await listPackAccess()).toEqual([]);
    setStoreForTest(fakeStore({}));
    expect(await watchAdForPack('animals_normal', now)).toEqual({ ok: true, endsAt: now + AD_TRIAL_MS });
  });

  it('광고 제거를 사면 표시가 남는다', async () => {
    setStoreForTest(fakeStore({}));
    await buyAdFree();
    expect((await loadPackState()).adFree).toBe(true);
  });

  it('복원: 스토어가 돌려준 묶음과 광고 제거를 되살리고 이름을 묶음 순서 + 광고 제거로 돌려준다', async () => {
    setStoreForTest(fakeStore({ restore: async () => ({ packs: ['snack_normal', 'animals_normal'], adFree: true }) }));
    expect(await restorePurchases(now)).toEqual(['간식 묶음', '동물 묶음', '광고 제거']);
    expect((await listPackAccess()).map((a) => [a.packId, a.expiresAt])).toEqual([['animals_normal', null], ['snack_normal', null]]);
    expect((await loadPackState()).adFree).toBe(true);
  });

  it('복원할 것이 없으면 빈 목록', async () => {
    setStoreForTest(fakeStore({}));
    expect(await restorePurchases(now)).toEqual([]);
  });

  it('개발용 대역의 복원은 이 기기에서 산 것을 그대로 돌려준다', async () => {
    await grantPurchase('animals_normal', now);
    const db = await getDb();
    await db.run("INSERT INTO pack_access (pack_id, source, granted_at, expires_at) VALUES ('snack_normal', 'ad', 1, 2)");
    expect(await restorePurchases(now)).toEqual(['동물 묶음']);
  });
});

describe('가격', () => {
  it('원화는 「2,200원」, 다른 통화는 스토어 글자 그대로', () => {
    expect(priceLabel({ amount: 2200, currency: 'KRW', text: '₩2,200' })).toBe('2,200원');
    expect(priceLabel({ amount: 12000, currency: 'KRW', text: '₩12,000' })).toBe('12,000원');
    expect(priceLabel({ amount: 900, currency: 'KRW', text: '₩900' })).toBe('900원');
    expect(priceLabel({ amount: 1.99, currency: 'USD', text: '$1.99' })).toBe('$1.99');
  });

  it('받아 온 가격을 글자로 바꾸고, 못 받아 오면 전에 받은 값을 쓴다', async () => {
    setStoreForTest(fakeStore({ prices: async () => ({ animals_normal: { amount: 2200, currency: 'KRW', text: '₩2,200' }, adFree: { amount: 5500, currency: 'KRW', text: '₩5,500' } }) }));
    expect(await loadPrices()).toEqual({ animals_normal: '2,200원', adFree: '5,500원' });
    setStoreForTest(fakeStore({ prices: async () => { throw new Error('offline'); } }));
    expect(await loadPrices()).toEqual({ animals_normal: '2,200원', adFree: '5,500원' });
  });

  it('한 번도 못 받아 왔으면 빈 값', async () => {
    setStoreForTest(fakeStore({ prices: async () => { throw new Error('offline'); } }));
    expect(await loadPrices()).toEqual({});
  });
});
