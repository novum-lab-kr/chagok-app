import { getDb } from '../src/db/client';
import { AD_TRIAL_MS } from '../src/domain/packs';
import { buyAdFree, buyPack, restorePurchases, setStoreForTest, watchAdForPack, type Store } from '../src/purchases';
import { grantPurchase, listPackAccess, loadPackState } from '../src/repositories/packRepository';
import { withFreshDb } from './support/setup';

withFreshDb();

const now = Date.UTC(2026, 9, 8, 14);
function fakeStore(over: Partial<Store>): Store {
  return {
    buyPack: async () => ({ ok: true }),
    buyAdFree: async () => ({ ok: true }),
    restore: async () => ({ packs: [], adFree: false }),
    showRewardedAd: async () => ({ ok: true }),
    ...over,
  };
}
afterEach(() => setStoreForTest(null));

describe('purchases', () => {
  it('사면 그 묶음이 영구로 열린다', async () => {
    setStoreForTest(fakeStore({}));
    expect(await buyPack('animals', now)).toEqual({ ok: true });
    expect(await listPackAccess()).toEqual([{ packId: 'animals', source: 'purchase', grantedAt: now, expiresAt: null }]);
  });

  it('결제를 취소하면 아무것도 열리지 않는다', async () => {
    setStoreForTest(fakeStore({ buyPack: async () => ({ ok: false, reason: 'cancelled' }) }));
    expect(await buyPack('animals', now)).toEqual({ ok: false, reason: 'cancelled' });
    expect(await listPackAccess()).toEqual([]);
  });

  it('광고를 끝까지 보면 24시간, 닫으면 시작하지 않는다', async () => {
    setStoreForTest(fakeStore({ showRewardedAd: async () => ({ ok: false, reason: 'closed' }) }));
    expect(await watchAdForPack('animals', now)).toEqual({ ok: false, reason: 'closed' });
    expect(await listPackAccess()).toEqual([]);
    setStoreForTest(fakeStore({}));
    expect(await watchAdForPack('animals', now)).toEqual({ ok: true, endsAt: now + AD_TRIAL_MS });
  });

  it('광고 제거를 사면 표시가 남는다', async () => {
    setStoreForTest(fakeStore({}));
    await buyAdFree();
    expect((await loadPackState()).adFree).toBe(true);
  });

  it('복원: 스토어가 돌려준 묶음과 광고 제거를 되살리고 이름을 묶음 순서 + 광고 제거로 돌려준다', async () => {
    setStoreForTest(fakeStore({ restore: async () => ({ packs: ['snack', 'animals'], adFree: true }) }));
    expect(await restorePurchases(now)).toEqual(['간식 묶음', '동물 묶음', '광고 제거']);
    expect((await listPackAccess()).map((a) => [a.packId, a.expiresAt])).toEqual([['animals', null], ['snack', null]]);
    expect((await loadPackState()).adFree).toBe(true);
  });

  it('복원할 것이 없으면 빈 목록', async () => {
    setStoreForTest(fakeStore({}));
    expect(await restorePurchases(now)).toEqual([]);
  });

  it('개발용 대역의 복원은 이 기기에서 산 것을 그대로 돌려준다', async () => {
    await grantPurchase('animals', now);
    const db = await getDb();
    await db.run("INSERT INTO pack_access (pack_id, source, granted_at, expires_at) VALUES ('snack', 'ad', 1, 2)");
    expect(await restorePurchases(now)).toEqual(['동물 묶음']);
  });
});
