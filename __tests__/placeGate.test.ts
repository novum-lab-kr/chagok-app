import { placeGate, stickerUsableUntil } from '../src/app-data/placeGate';
import type { PackAccess } from '../src/domain/packs';
import type { Goal } from '../src/domain/types';

const now = Date.UTC(2026, 9, 8, 14);
const goal = (defaultStickerId: string): Goal => ({
  id: 'g', name: '목표', boardType: 'tally', totalSlots: 10, defaultStickerId, createdAt: 0, endDate: null,
  completedAt: null, completionSeen: false, lastPlacedAt: null, initialSlots: 10,
});

describe('placeGate', () => {
  it('기본 묶음·옛 흑백 ID는 붙인다', () => {
    expect(placeGate(goal('basic.star'), [], now)).toEqual({ ok: true });
    expect(placeGate(goal('star'), [], now)).toEqual({ ok: true });
  });
  it('산 묶음과 체험 중인 묶음은 붙인다', () => {
    const bought: PackAccess = { packId: 'animals', source: 'purchase', grantedAt: 0, expiresAt: null };
    const live: PackAccess = { packId: 'animals', source: 'ad', grantedAt: now, expiresAt: now + 1 };
    expect(placeGate(goal('animals.cat'), [bought], now)).toEqual({ ok: true });
    expect(placeGate(goal('animals.cat'), [live], now)).toEqual({ ok: true });
  });
  it('끝난 광고 체험은 「하루」, 끝난 붙인 날 체험은 「3일」', () => {
    expect(placeGate(goal('animals.cat'), [{ packId: 'animals', source: 'ad', grantedAt: 0, expiresAt: now - 1 }], now))
      .toEqual({ ok: false, kind: '하루', packId: 'animals' });
    expect(placeGate(goal('animals.cat'), [{ packId: 'animals', source: 'days', grantedAt: 0, expiresAt: now - 1 }], now))
      .toEqual({ ok: false, kind: '3일', packId: 'animals' });
  });
  it('체험 기록 없이 잠긴 묶음은 「3일」로 안내한다', () => {
    expect(placeGate(goal('animals.cat'), [], now)).toEqual({ ok: false, kind: '3일', packId: 'animals' });
  });
});

describe('stickerUsableUntil', () => {
  it('기본·산 묶음은 기한 없음(null), 체험 중은 끝나는 시각, 잠긴 묶음은 0', () => {
    expect(stickerUsableUntil(goal('basic.star'), [], now)).toBeNull();
    expect(stickerUsableUntil(goal('animals.cat'), [{ packId: 'animals', source: 'purchase', grantedAt: 0, expiresAt: null }], now)).toBeNull();
    expect(stickerUsableUntil(goal('animals.cat'), [{ packId: 'animals', source: 'ad', grantedAt: now, expiresAt: now + 5 }], now)).toBe(now + 5);
    expect(stickerUsableUntil(goal('animals.cat'), [], now)).toBe(0);
  });
});
