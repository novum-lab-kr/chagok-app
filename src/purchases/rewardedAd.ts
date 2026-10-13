import type { AdResult } from './index';

/**
 * 보상형 광고 한 편 (PRD 4.12). react-native-google-mobile-ads의 RewardedAd에서 쓰는 부분만 — 테스트에서 가짜로 바꾼다.
 * 이벤트 이름은 라이브러리 값과 같다(RewardedAdEventType.LOADED·EARNED_REWARD, AdEventType.CLOSED·ERROR).
 */
export type RewardedEvent = 'rewarded_loaded' | 'rewarded_earned_reward' | 'closed' | 'error';
export interface RewardedAdLike {
  addAdEventListener(type: RewardedEvent, listener: () => void): () => void;
  load(): void;
  show(): Promise<void> | void;
}

/** 이 시간 안에 못 불러오면 「지금은 광고를 볼 수 없어요」 */
export const LOAD_TIMEOUT_MS = 15_000;

/** 불러오면 바로 띄운다. 끝까지 봐서 보상을 받은 채로 닫아야 ok, 중간에 닫으면 closed. */
export function playRewardedAd(ad: RewardedAdLike, timeoutMs = LOAD_TIMEOUT_MS): Promise<AdResult> {
  return new Promise((resolve) => {
    let earned = false;
    let shown = false;
    let done = false;
    const offs: (() => void)[] = [];
    const finish = (r: AdResult) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      offs.forEach((off) => off());
      resolve(r);
    };
    const timer = setTimeout(() => { if (!shown) finish({ ok: false, reason: 'unavailable' }); }, timeoutMs);
    offs.push(
      ad.addAdEventListener('rewarded_loaded', () => {
        shown = true;
        Promise.resolve()
          .then(() => ad.show())
          .catch(() => finish({ ok: false, reason: 'unavailable' }));
      }),
      ad.addAdEventListener('rewarded_earned_reward', () => { earned = true; }),
      ad.addAdEventListener('closed', () => finish(earned ? { ok: true } : { ok: false, reason: 'closed' })),
      // 띄운 뒤의 오류도 보상을 받았으면 ok로 친다
      ad.addAdEventListener('error', () => finish(earned ? { ok: true } : { ok: false, reason: 'unavailable' })),
    );
    try {
      ad.load();
    } catch {
      finish({ ok: false, reason: 'unavailable' });
    }
  });
}
