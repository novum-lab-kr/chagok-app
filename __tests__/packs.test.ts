import { AD_TRIAL_MS, DAY_TRIAL_MS, canStartDayTrial, canUseSticker, dayTrialThreshold, dayTrialsAvailable, packStatus, reachedThreshold, showTrialReadyCard, trialLabel } from '../src/domain/packs';
import type { PackAccess } from '../src/domain/packs';
import type { ColorStickerId } from '../src/stickers/color/catalog';

const H = 3600_000;
const now = Date.UTC(2026, 9, 8, 14);
const bought: PackAccess = { packId: 'animals_normal', source: 'purchase', grantedAt: 0, expiresAt: null };

describe('packStatus', () => {
  it('기본 묶음은 늘 free', () => expect(packStatus('basic', [], now).state).toBe('free'));
  it('산 묶음은 owned', () => expect(packStatus('animals_normal', [bought], now)).toEqual({ state: 'owned' }));
  it('기록이 없는 유료 묶음은 locked', () => expect(packStatus('animals_normal', [], now)).toEqual({ state: 'locked' }));
  it('광고 하루 체험 중 — 배지는 남은 시간', () => {
    const s = packStatus('animals_normal', [{ packId: 'animals_normal', source: 'ad', grantedAt: now, expiresAt: now + AD_TRIAL_MS }], now);
    expect(s).toEqual({ state: 'trial', trialLabel: '24시간 남음', trialKind: '하루' });
  });
  it('끝난 체험은 locked + 어떤 체험이 끝났는지', () => {
    expect(packStatus('animals_normal', [{ packId: 'animals_normal', source: 'days', grantedAt: 0, expiresAt: now - 1 }], now)).toEqual({ state: 'locked', endedKind: '3일' });
  });
  it('여러 줄이면 산 것이 먼저, 그다음 늦게 끝나는 체험', () => {
    const ad: PackAccess = { packId: 'animals_normal', source: 'ad', grantedAt: now, expiresAt: now + 2 * H };
    const days: PackAccess = { packId: 'animals_normal', source: 'days', grantedAt: now, expiresAt: now + DAY_TRIAL_MS };
    expect(packStatus('animals_normal', [ad, days], now)).toEqual({ state: 'trial', trialLabel: '3일 남음', trialKind: '3일' });
    expect(packStatus('animals_normal', [ad, bought], now)).toEqual({ state: 'owned' });
  });
  it('다른 묶음 줄은 보지 않는다', () => {
    expect(packStatus('snack_normal', [bought], now)).toEqual({ state: 'locked' });
  });
});

describe('trialLabel', () => {
  it('24시간 넘으면 일(올림), 이하면 시간(올림)', () => {
    expect(trialLabel(now + DAY_TRIAL_MS, now)).toBe('3일 남음');
    expect(trialLabel(now + 25 * H, now)).toBe('2일 남음');
    expect(trialLabel(now + 24 * H, now)).toBe('24시간 남음');
    expect(trialLabel(now + 90_000, now)).toBe('1시간 남음');
  });
});

describe('붙인 날 문턱', () => {
  it('7, 14, 그 뒤 30일마다', () => expect([0, 1, 2, 3].map(dayTrialThreshold)).toEqual([7, 14, 44, 74]));
  it('받을 수 있는 수 = 넘긴 문턱 − 받은 수', () => {
    expect(dayTrialsAvailable(6, 0)).toBe(0);
    expect(dayTrialsAvailable(7, 0)).toBe(1);
    expect(dayTrialsAvailable(14, 0)).toBe(2);
    expect(dayTrialsAvailable(14, 2)).toBe(0);
    expect(dayTrialsAvailable(44, 2)).toBe(1);
  });
});

describe('canStartDayTrial', () => {
  it('붙인 날이 모자라면 안 된다', () => expect(canStartDayTrial('animals_normal', [], 6, 0, now)).toBe(false));
  it('같은 묶음을 다시 체험할 수 있다 — 끝난 체험이면 (B)', () => {
    const ended: PackAccess = { packId: 'animals_normal', source: 'days', grantedAt: 0, expiresAt: now - 1 };
    expect(canStartDayTrial('animals_normal', [ended], 14, 1, now)).toBe(true);
  });
  it('지금 체험 중이거나 산 묶음, 기본 묶음은 안 된다', () => {
    const live: PackAccess = { packId: 'animals_normal', source: 'ad', grantedAt: now, expiresAt: now + H };
    expect(canStartDayTrial('animals_normal', [live], 7, 0, now)).toBe(false);
    expect(canStartDayTrial('animals_normal', [bought], 7, 0, now)).toBe(false);
    expect(canStartDayTrial('basic', [], 7, 0, now)).toBe(false);
  });
});

describe('canUseSticker', () => {
  it('기본 묶음과 연 묶음 스티커만 새로 쓸 수 있다', () => {
    expect(canUseSticker('basic.sprout', [], now)).toBe(true);
    expect(canUseSticker('animals_normal.cat' as ColorStickerId, [], now)).toBe(false);
    expect(canUseSticker('animals_normal.cat' as ColorStickerId, [bought], now)).toBe(true);
  });
});

describe('체험 열림 카드 (목표 탭, 2026-10-12)', () => {
  it('넘긴 가장 높은 문턱', () => {
    expect(reachedThreshold(6)).toBe(0);
    expect(reachedThreshold(7)).toBe(7);
    expect(reachedThreshold(20)).toBe(14);
    expect(reachedThreshold(44)).toBe(44);
  });
  it('받을 체험이 있으면 보인다', () => {
    expect(showTrialReadyCard(7, 0, 0)).toBe(true);
    expect(showTrialReadyCard(6, 0, 0)).toBe(false);
  });
  it('받은 뒤에는 다음 문턱까지 안 보인다', () => {
    expect(showTrialReadyCard(10, 1, 0)).toBe(false);
    expect(showTrialReadyCard(14, 1, 0)).toBe(true);
  });
  it('×로 닫으면 다음 문턱을 넘길 때까지 안 보인다', () => {
    expect(showTrialReadyCard(9, 0, 7)).toBe(false);
    expect(showTrialReadyCard(14, 0, 7)).toBe(true);
    expect(showTrialReadyCard(20, 0, 14)).toBe(false);
  });
});
