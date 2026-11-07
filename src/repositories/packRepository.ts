import { getDb } from '../db/client';
import { AD_TRIAL_MS, DAY_TRIAL_MS, canStartDayTrial, type PackAccess } from '../domain/packs';
import { isSubscribed, subscriptionEnd, type StoredSubscription } from '../domain/subscription';
import { colorStickerPacks, type ColorStickerPackId } from '../stickers/color/catalog';
import { getSetting, setSetting } from './appSettingsRepository';

/**
 * 이 기기에서 쓸 수 있는 묶음 (PRD 4.12, 스키마 v6 pack_access). 서버로 올리지 않는다 —
 * 산 묶음은 스토어가 원본이라 구매 복원으로 되살리고, 체험은 짧다 (2026-10-08 계획 E).
 */
type Row = { pack_id: string; source: PackAccess['source']; granted_at: number; expires_at: number | null };
const toAccess = (r: Row): PackAccess => ({ packId: r.pack_id as ColorStickerPackId, source: r.source, grantedAt: r.granted_at, expiresAt: r.expires_at });
const UPSERT = `INSERT INTO pack_access (pack_id, source, granted_at, expires_at) VALUES (?, ?, ?, ?)
  ON CONFLICT(pack_id) DO UPDATE SET source = excluded.source, granted_at = excluded.granted_at, expires_at = excluded.expires_at`;

export async function getSubscription(): Promise<StoredSubscription | null> {
  const raw = await getSetting('subscription');
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as StoredSubscription;
    return s.plan && typeof s.expiresAt === 'number' && typeof s.verifiedAt === 'number' ? s : null;
  } catch {
    return null;
  }
}

export async function saveSubscription(s: StoredSubscription | null): Promise<void> {
  await setSetting('subscription', s ? JSON.stringify(s) : null);
}

/** 구독이 있으면(끝났어도) 유료 묶음마다 구독 줄을 더한다. 저장하지 않으니 체험 줄을 덮지 않는다 (구독 설계 4.1). */
const subscriptionRows = (s: StoredSubscription | null): PackAccess[] =>
  s ? colorStickerPacks.filter((p) => !p.free).map((p) => ({ packId: p.id, source: 'sub' as const, grantedAt: s.verifiedAt, expiresAt: subscriptionEnd(s) })) : [];

export async function listPackAccess(): Promise<PackAccess[]> {
  const db = await getDb();
  const stored = (await db.all<Row>('SELECT * FROM pack_access ORDER BY pack_id')).map(toAccess);
  return [...stored, ...subscriptionRows(await getSubscription())];
}

/** 묶음마다 한 줄. 새로 연 방법이 이전 줄을 덮는다 — 산 것은 영구다. */
export async function grantPurchase(packId: ColorStickerPackId, now: number): Promise<void> {
  const db = await getDb();
  await db.run(UPSERT, packId, 'purchase', now, null);
}

/** 광고를 끝까지 본 때부터 24시간. 끝나는 시각을 돌려준다. */
export async function startAdTrial(packId: ColorStickerPackId, now: number): Promise<number> {
  const db = await getDb();
  await db.run(UPSERT, packId, 'ad', now, now + AD_TRIAL_MS);
  return now + AD_TRIAL_MS;
}

/** 붙인 날 3일 체험. 받을 수 없으면 거절한다. 받은 수와 함께 한 트랜잭션으로 쓴다. */
export async function startDayTrial(packId: ColorStickerPackId, now = Date.now()): Promise<number> {
  const db = await getDb();
  const ends = now + DAY_TRIAL_MS;
  await db.transaction(async (tx) => {
    const access = (await tx.all<Row>('SELECT * FROM pack_access')).map(toAccess);
    const days = (await tx.first<{ n: number }>('SELECT COUNT(*) AS n FROM placed_days'))?.n ?? 0;
    const claimed = Number((await tx.first<{ value: string }>("SELECT value FROM app_settings WHERE key = 'dayTrialsClaimed'"))?.value ?? 0);
    if (!canStartDayTrial(packId, access, days, claimed, now)) throw new Error('붙인 날 체험을 시작할 수 없어요.');
    await tx.run(UPSERT, packId, 'days', now, ends);
    await tx.run(
      `INSERT INTO app_settings (key, value) VALUES ('dayTrialsClaimed', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      String(claimed + 1),
    );
  });
  return ends;
}

export async function setAdFree(on: boolean): Promise<void> {
  await setSetting('adFree', on ? '1' : null);
}

/**
 * 화면에 필요한 것 한 번에: 묶음 권한, 붙인 날 수, 받은 체험 수, 광고 제거, 구독.
 * adFree는 광고가 없는가(광고 제거를 샀거나 구독 중), adFreePurchased는 광고 제거를 샀는가.
 */
/** loadPackState가 돌려주는 것. 디자인 시스템의 PackState(묶음 하나의 상태)와 다르다 */
export type LoadedPackState = { access: PackAccess[]; days: number; claimed: number; adFree: boolean; adFreePurchased: boolean; subscription: StoredSubscription | null; subscribed: boolean };

export async function loadPackState(now = Date.now()): Promise<LoadedPackState> {
  const db = await getDb();
  const days = (await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM placed_days'))?.n ?? 0;
  const subscription = await getSubscription();
  const subscribed = isSubscribed(subscription, now);
  const adFreePurchased = (await getSetting('adFree')) === '1';
  return {
    access: await listPackAccess(),
    days,
    claimed: Number((await getSetting('dayTrialsClaimed')) ?? 0),
    subscription,
    subscribed,
    adFreePurchased,
    adFree: adFreePurchased || subscribed,
  };
}
