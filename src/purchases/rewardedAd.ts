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

/** 불러온 보상형 광고는 1시간 뒤 만료된다(AdMob). 조금 앞서 버리고 새로 불러온다 */
export const AD_MAX_AGE_MS = 55 * 60_000;

/** 광고를 미리 불러 둘 수 있는가 — 묶음 화면이 [광고 보고 하루]를 보일지 정한다 */
export interface RewardedPreloader {
  /** 지금 바로 띄울 수 있는 광고가 있다 */
  ready(): boolean;
  /** 불러오는 중이거나 준비돼 있으면 아무것도 하지 않는다 */
  preload(): void;
  play(): Promise<AdResult>;
  subscribe(listener: (ready: boolean) => void): () => void;
}

/**
 * 보상형 광고를 미리 불러 둔다 (2026-11-04 사용자: 광고를 못 불러오면 버튼을 숨기고, 볼 수 있을 때만 보인다).
 * 실패하면 다음 preload(화면에 다시 들어올 때) 때 다시 부른다. 본 뒤에는 바로 다음 광고를 불러 둔다.
 */
export function createRewardedPreloader(make: () => RewardedAdLike, clock: () => number = Date.now): RewardedPreloader {
  let ad: RewardedAdLike | null = null;
  let loading = false;
  let loadedAt = 0;
  let offs: (() => void)[] = [];
  const listeners = new Set<(ready: boolean) => void>();
  const ready = () => ad !== null && !loading && clock() - loadedAt < AD_MAX_AGE_MS;
  const emit = () => { const r = ready(); listeners.forEach((l) => l(r)); };
  const drop = () => { offs.forEach((off) => off()); offs = []; ad = null; loading = false; };

  function preload() {
    if (loading || ready()) return;
    drop();
    const next = make();
    ad = next;
    loading = true;
    offs.push(
      next.addAdEventListener('rewarded_loaded', () => { loading = false; loadedAt = clock(); emit(); }),
      next.addAdEventListener('error', () => { drop(); emit(); }),
    );
    try {
      next.load();
    } catch {
      drop();
      emit();
    }
  }

  function play(): Promise<AdResult> {
    if (!ready() || !ad) {
      preload();
      return Promise.resolve({ ok: false, reason: 'unavailable' });
    }
    const current = ad;
    drop();
    emit();
    return new Promise((resolve) => {
      let earned = false;
      let done = false;
      const mine: (() => void)[] = [];
      const finish = (r: AdResult) => {
        if (done) return;
        done = true;
        mine.forEach((off) => off());
        resolve(r);
        preload();
      };
      mine.push(
        current.addAdEventListener('rewarded_earned_reward', () => { earned = true; }),
        current.addAdEventListener('closed', () => finish(earned ? { ok: true } : { ok: false, reason: 'closed' })),
        // 띄운 뒤의 오류도 보상을 받았으면 ok로 친다
        current.addAdEventListener('error', () => finish(earned ? { ok: true } : { ok: false, reason: 'unavailable' })),
      );
      Promise.resolve()
        .then(() => current.show())
        .catch(() => finish({ ok: false, reason: 'unavailable' }));
    });
  }

  return { ready, preload, play, subscribe: (l) => { listeners.add(l); return () => { listeners.delete(l); }; } };
}
