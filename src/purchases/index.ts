import { colorStickerPacks, type ColorStickerPackId } from '../stickers/color/catalog';
import { grantPurchase, setAdFree, startAdTrial } from '../repositories/packRepository';
import { devStore } from './devStore';

/** 결제·광고 (PRD 4.12). 결제 팝업은 Apple·Google이 그린다. */
/** pending: 보호자 승인(구입 승인 요청·가족 결제)을 기다린다. 승인되면 [구매 복원]으로 연다. */
export type BuyResult = { ok: true } | { ok: false; reason: 'cancelled' | 'failed' | 'pending' };
export type AdResult = { ok: true } | { ok: false; reason: 'closed' | 'unavailable' };
export interface Store {
  buyPack(packId: ColorStickerPackId): Promise<BuyResult>;
  buyAdFree(): Promise<BuyResult>;
  /** 이 스토어 계정으로 산 묶음과 광고 제거 */
  restore(): Promise<{ packs: ColorStickerPackId[]; adFree: boolean }>;
  /** 보상형 광고. 끝까지 봤을 때만 ok */
  showRewardedAd(): Promise<AdResult>;
}

let override: Store | null = null;
/** 키가 있으면 앱을 켤 때 RevenueCat으로 바뀐다(revenueCat.ts). 없으면 개발용 대역. 보상형 광고는 AdMob 전까지 대역. */
let active: Store = devStore;
export const store = (): Store => override ?? active;
export function setActiveStore(s: Store): void { active = s; }
export function setStoreForTest(s: Store | null): void { override = s; }

export async function buyPack(packId: ColorStickerPackId, now = Date.now()): Promise<BuyResult> {
  const r = await store().buyPack(packId);
  if (r.ok) await grantPurchase(packId, now);
  return r;
}

/** 광고를 끝까지 본 때부터 24시간 (2026-10-08). */
export async function watchAdForPack(packId: ColorStickerPackId, now = Date.now()): Promise<{ ok: true; endsAt: number } | Extract<AdResult, { ok: false }>> {
  const r = await store().showRewardedAd();
  if (!r.ok) return r;
  return { ok: true, endsAt: await startAdTrial(packId, now) };
}

export async function buyAdFree(): Promise<BuyResult> {
  const r = await store().buyAdFree();
  if (r.ok) await setAdFree(true);
  return r;
}

/** 산 묶음 전부와 광고 제거를 되살린다. 결과 문구용 이름: 묶음 순서대로 「○○ 묶음」, 끝에 「광고 제거」. */
export async function restorePurchases(now = Date.now()): Promise<string[]> {
  const { packs, adFree } = await store().restore();
  for (const id of packs) await grantPurchase(id, now);
  if (adFree) await setAdFree(true);
  return [
    ...colorStickerPacks.filter((p) => packs.includes(p.id)).map((p) => `${p.label} 묶음`),
    ...(adFree ? ['광고 제거'] : []),
  ];
}
