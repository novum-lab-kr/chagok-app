import { AD_MAX_AGE_MS, createRewardedPreloader, type RewardedAdLike, type RewardedEvent } from '../src/purchases/rewardedAd';

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

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('보상형 광고 미리 불러오기 (2026-11-04)', () => {
  it('불러오기 전에는 준비되지 않았고, 불러오면 준비됨을 알린다', async () => {
    const seen: boolean[] = [];
    const p = createRewardedPreloader(() => fakeAd({ onLoad: ['rewarded_loaded'] }));
    p.subscribe((r) => seen.push(r));
    expect(p.ready()).toBe(false);
    p.preload();
    expect(p.ready()).toBe(false);
    await tick();
    expect(p.ready()).toBe(true);
    expect(seen).toEqual([true]);
  });

  it('못 불러오면 준비되지 않은 채로 남고, 그때 누르면 unavailable', async () => {
    const p = createRewardedPreloader(() => fakeAd({ onLoad: ['error'] }));
    p.preload();
    await tick();
    expect(p.ready()).toBe(false);
    expect(await p.play()).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('끝까지 보고 닫으면 ok, 그 뒤 다음 광고를 다시 불러 둔다', async () => {
    let made = 0;
    const p = createRewardedPreloader(() => { made++; return fakeAd({ onLoad: ['rewarded_loaded'], onShow: ['rewarded_earned_reward', 'closed'] }); });
    p.preload();
    await tick();
    expect(await p.play()).toEqual({ ok: true });
    expect(made).toBe(2);
    await tick();
    expect(p.ready()).toBe(true);
  });

  it('보상 전에 닫으면 closed', async () => {
    const p = createRewardedPreloader(() => fakeAd({ onLoad: ['rewarded_loaded'], onShow: ['closed'] }));
    p.preload();
    await tick();
    expect(await p.play()).toEqual({ ok: false, reason: 'closed' });
  });

  it('보상을 받은 뒤의 오류는 ok', async () => {
    const p = createRewardedPreloader(() => fakeAd({ onLoad: ['rewarded_loaded'], onShow: ['rewarded_earned_reward', 'error'] }));
    p.preload();
    await tick();
    expect(await p.play()).toEqual({ ok: true });
  });

  it('불러온 지 55분이 지나면 만료로 보고 다시 불러온다', async () => {
    let now = 0;
    let made = 0;
    const p = createRewardedPreloader(() => { made++; return fakeAd({ onLoad: ['rewarded_loaded'] }); }, () => now);
    p.preload();
    await tick();
    expect(p.ready()).toBe(true);
    now = AD_MAX_AGE_MS;
    expect(p.ready()).toBe(false);
    p.preload();
    expect(made).toBe(2);
  });

  it('불러오다 바로 실패해도(load가 던져도) 앱은 멈추지 않는다', () => {
    const p = createRewardedPreloader(() => fakeAd({ loadThrows: true }));
    expect(() => p.preload()).not.toThrow();
    expect(p.ready()).toBe(false);
  });
});
