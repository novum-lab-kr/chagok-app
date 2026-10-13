import { playRewardedAd, type RewardedAdLike, type RewardedEvent } from '../src/purchases/rewardedAd';

/** 불러오기·보여주기에 맞춰 이벤트를 흘려보내는 가짜 광고 */
function fakeAd(script: { onLoad?: RewardedEvent[]; onShow?: RewardedEvent[]; showThrows?: boolean; loadThrows?: boolean }) {
  const listeners = new Map<RewardedEvent, Set<() => void>>();
  const emit = (events: RewardedEvent[] = []) => events.forEach((e) => listeners.get(e)?.forEach((l) => l()));
  const ad: RewardedAdLike & { listening: () => number } = {
    addAdEventListener(type, l) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(l);
      return () => listeners.get(type)!.delete(l);
    },
    load() {
      if (script.loadThrows) throw new Error('load');
      setTimeout(() => emit(script.onLoad), 0);
    },
    async show() {
      if (script.showThrows) throw new Error('show');
      emit(script.onShow);
    },
    listening: () => [...listeners.values()].reduce((n, s) => n + s.size, 0),
  };
  return ad;
}

describe('보상형 광고', () => {
  it('끝까지 보고 닫으면 ok', async () => {
    const ad = fakeAd({ onLoad: ['rewarded_loaded'], onShow: ['rewarded_earned_reward', 'closed'] });
    expect(await playRewardedAd(ad)).toEqual({ ok: true });
    expect(ad.listening()).toBe(0);
  });

  it('보상 전에 닫으면 closed', async () => {
    expect(await playRewardedAd(fakeAd({ onLoad: ['rewarded_loaded'], onShow: ['closed'] }))).toEqual({ ok: false, reason: 'closed' });
  });

  it('못 불러오면 unavailable', async () => {
    expect(await playRewardedAd(fakeAd({ onLoad: ['error'] }))).toEqual({ ok: false, reason: 'unavailable' });
    expect(await playRewardedAd(fakeAd({ loadThrows: true }))).toEqual({ ok: false, reason: 'unavailable' });
    expect(await playRewardedAd(fakeAd({ onLoad: ['rewarded_loaded'], showThrows: true }))).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('제한 시간 안에 안 오면 unavailable', async () => {
    expect(await playRewardedAd(fakeAd({ onLoad: [] }), 10)).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('보상을 받은 뒤의 오류는 ok', async () => {
    const ad = fakeAd({ onLoad: ['rewarded_loaded'], onShow: ['rewarded_earned_reward', 'error'] });
    expect(await playRewardedAd(ad)).toEqual({ ok: true });
  });
});
