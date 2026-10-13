import { getDb } from '../src/db/client';
import { AD_TRIAL_MS, DAY_TRIAL_MS } from '../src/domain/packs';
import { grantPurchase, listPackAccess, loadPackState, setAdFree, startAdTrial, startDayTrial } from '../src/repositories/packRepository';
import { withFreshDb } from './support/setup';

withFreshDb();

const now = Date.UTC(2026, 9, 8, 14);

async function placedDays(n: number) {
  const db = await getDb();
  for (let i = 1; i <= n; i++) await db.run('INSERT INTO placed_days (date_key) VALUES (?)', `2026-09-${String(i).padStart(2, '0')}`);
}

describe('packRepository', () => {
  it('처음에는 아무 묶음도 없고 붙인 날 0, 받은 체험 0, 광고 제거 아님', async () => {
    expect(await loadPackState()).toEqual({ access: [], days: 0, claimed: 0, adFree: false });
  });

  it('사면 영구', async () => {
    await grantPurchase('animals_normal', now);
    expect(await listPackAccess()).toEqual([{ packId: 'animals_normal', source: 'purchase', grantedAt: now, expiresAt: null }]);
  });

  it('광고 하루는 지금부터 24시간', async () => {
    expect(await startAdTrial('animals_normal', now)).toBe(now + AD_TRIAL_MS);
    expect((await listPackAccess())[0]).toMatchObject({ source: 'ad', expiresAt: now + AD_TRIAL_MS });
  });

  it('체험 중에 사면 영구로 바뀐다', async () => {
    await startAdTrial('animals_normal', now);
    await grantPurchase('animals_normal', now + 1);
    expect(await listPackAccess()).toEqual([{ packId: 'animals_normal', source: 'purchase', grantedAt: now + 1, expiresAt: null }]);
  });

  it('붙인 날이 모자라면 3일 체험을 거절하고 받은 수는 그대로', async () => {
    await placedDays(6);
    await expect(startDayTrial('animals_normal', now)).rejects.toThrow();
    expect((await loadPackState()).claimed).toBe(0);
  });

  it('붙인 날 7일이면 3일 체험 + 받은 수 1', async () => {
    await placedDays(7);
    expect(await startDayTrial('animals_normal', now)).toBe(now + DAY_TRIAL_MS);
    expect(await loadPackState()).toMatchObject({ days: 7, claimed: 1 });
  });

  it('산 묶음에는 3일 체험을 시작하지 않는다', async () => {
    await placedDays(7);
    await grantPurchase('animals_normal', now);
    await expect(startDayTrial('animals_normal', now)).rejects.toThrow();
    expect((await loadPackState()).claimed).toBe(0);
  });

  it('광고 제거 표시', async () => {
    await setAdFree(true);
    expect((await loadPackState()).adFree).toBe(true);
  });
});
