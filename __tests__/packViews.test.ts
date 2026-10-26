import { endLabel, initialChoice, packViews, samplePlacement } from '../src/app-data/packViews';
import { offerOpenPack, offerSticker, takeOfferedSticker, takeOpenPack } from '../src/app-data/stickerChoice';
import { AD_TRIAL_MS } from '../src/domain/packs';

const now = new Date(2026, 9, 8, 14, 0).getTime();

describe('packViews', () => {
  it('묶음 순서대로, 상태와 스티커 10종을 담는다', () => {
    const views = packViews([{ packId: 'objects_normal', source: 'ad', grantedAt: now, expiresAt: now + AD_TRIAL_MS }], now);
    expect(views.map((v) => [v.id, v.state])).toEqual([
      ['basic', 'free'], ['sports_normal', 'locked'], ['snack_normal', 'locked'], ['objects_normal', 'trial'], ['animals_normal', 'free'], ['emotions_normal', 'free'], ['weather_normal', 'locked'],
    ]);
    const objects = views.find((v) => v.id === 'objects_normal')!;
    expect(objects).toMatchObject({ label: '사물', trialLabel: '24시간 남음' });
    expect(objects.stickers).toHaveLength(10);
    expect(objects.stickers.every((id) => id.startsWith('objects_normal.'))).toBe(true);
  });
  it('판 예시는 그 묶음의 서로 다른 5개', () => {
    const v = packViews([], now).find((p) => p.id === 'snack_normal')!;
    const s = samplePlacement(v);
    expect(s).toHaveLength(5);
    expect(new Set(s).size).toBe(5);
  });
});

describe('endLabel — 광고 하루 체험이 끝나는 때', () => {
  const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m).getTime();
  it('시안: 밤 11시에 보면 「내일 밤 11:00」', () => expect(endLabel(at(9, 23), at(8, 23))).toBe('내일 밤 11:00'));
  it('때: 새벽 0~6, 아침 6~12, 낮 12~18, 밤 18~24', () => {
    expect(endLabel(at(9, 0, 30), now)).toBe('내일 새벽 12:30');
    expect(endLabel(at(9, 7, 5), now)).toBe('내일 아침 7:05');
    expect(endLabel(at(9, 12), now)).toBe('내일 낮 12:00');
    expect(endLabel(at(8, 19), now)).toBe('오늘 밤 7:00');
  });
});

describe('stickerChoice — 화면 사이 넘기기', () => {
  it('한 번 읽으면 비운다', () => {
    offerSticker('animals_normal.cat' as never);
    expect(takeOfferedSticker()).toBe('animals_normal.cat');
    expect(takeOfferedSticker()).toBeNull();
  });
  it('펼칠 묶음도 한 번만', () => {
    offerOpenPack('snack_normal');
    expect(takeOpenPack()).toBe('snack_normal');
    expect(takeOpenPack()).toBeNull();
  });
});

describe('initialChoice — 「기본 스티커」를 열 때 고른 상태', () => {
  it('쓸 수 있는 스티커면 그대로, 그 묶음을 펼친다', () => {
    expect(initialChoice('basic.star', [], now)).toEqual({ selected: 'basic.star', open: 'basic' });
  });
  it('잠긴 묶음 스티커로 열면(체험이 끝난 뒤 [다른 스티커]) 새싹을 고른 채로 연다', () => {
    expect(initialChoice('weather_normal.sun', [], now)).toEqual({ selected: 'basic.sprout', open: 'basic' });
  });
});
