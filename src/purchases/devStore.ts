import type { Store } from './index';
import { listPackAccess, loadPackState } from '../repositories/packRepository';
import { colorStickerPacks } from '../stickers/color/catalog';

const note = (what: string) => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.info(`개발용 결제: ${what} — 실제 결제·광고 없이 바로 성공`);
};

/**
 * 개발용 대역 (2026-10-08 계획 A). 결제·광고는 누르면 바로 성공한다.
 * 복원은 이 기기에서 산 것을 그대로 돌려준다. 실제 RevenueCat·AdMob은 다음 계획에서 같은 Store로 끼운다.
 */
export const devStore: Store = {
  async buyPack(packId) { note(`${packId} 묶음`); return { ok: true }; },
  async buyAdFree() { note('광고 제거'); return { ok: true }; },
  async restore() {
    const packs = (await listPackAccess()).filter((a) => a.expiresAt === null).map((a) => a.packId);
    return { packs, adFree: (await loadPackState()).adFree };
  },
  /** RELEASE-DECISIONS의 가격: 묶음 2,200원 · 광고 제거 5,500원 */
  async prices() {
    const won = (amount: number) => ({ amount, currency: 'KRW', text: `₩${amount.toLocaleString('en-US')}` });
    return { ...Object.fromEntries(colorStickerPacks.filter((p) => !p.free).map((p) => [p.id, won(2200)])), adFree: won(5500) };
  },
  async showRewardedAd() { note('보상형 광고'); return { ok: true }; },
};
