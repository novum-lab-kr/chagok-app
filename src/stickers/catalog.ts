/**
 * ⚠️ 이 파일은 현재 어떤 화면 코드도 참조하지 않는다 (2026-09-23).
 *
 * 종이 테마 시절의 저장용 카탈로그다. 현재 디자인 시스템과 DB 기본값은
 * `src/stickers/pocket/catalog.ts`(6종)를 쓴다.
 *
 * 임의로 삭제하지 않는다. 과거 id로 저장된 데이터를 옮길 때 매핑 근거가 된다.
 * 새 스티커는 여기가 아니라 pocket 쪽에 추가한다.
 * 근거: docs/PRD.md 5절, docs/DESIGN-SYSTEM.md 「스티커 자산」.
 *
 * 스티커 22종. 시안(claude.ai/artifact/L2FvWa53FDxhZLVdQVsRcx)에서 확정된 값.
 * id가 그대로 stickers.sticker_type 컬럼에 저장된다.
 */

export const STICKER_IDS = [
  // 클래식 도장 — 이중 원, 도장 빨강
  'stamp-good', 'stamp-great',
  // 꽃 도장 — 참 잘했어요
  'bloom-good-y', 'bloom-good-r', 'bloom-good-g', 'bloom-good-p',
  // 꽃 도장 — 훌륭해요
  'bloom-great-y', 'bloom-great-r', 'bloom-great-g', 'bloom-great-p',
  // 꽃 도장 — 웃는 얼굴
  'bloom-face-y', 'bloom-face-r', 'bloom-face-g', 'bloom-face-p',
  // 그림 스티커
  'star', 'heart', 'flower', 'thumb',
  // 목적 스티커
  'obj-water', 'obj-dumbbell', 'obj-shoe', 'obj-book',
] as const;

export type StickerId = (typeof STICKER_IDS)[number];
export const STICKER_DEFAULT: StickerId = 'stamp-good';

export type StickerGroup = 'stamp' | 'bloom' | 'pic' | 'obj';

export const GROUP_LABEL: Record<StickerGroup, string> = {
  stamp: '도장',
  bloom: '꽃 도장',
  pic: '그림',
  obj: '목적',
};

/** 꽃잎·본체 색과, 그 위에 얹히는 글자·디테일 색 */
export type Palette = { petal: string; sink: string };

export const PALETTES = {
  classic: { petal: '#B5372B', sink: '#B5372B' },
  y: { petal: '#E0A32E', sink: '#8A5F12' },
  r: { petal: '#D4645F', sink: '#9B3A35' },
  g: { petal: '#6D9A8B', sink: '#3D6357' },
  p: { petal: '#8D7AB0', sink: '#55457A' },
  b: { petal: '#5B8CA8', sink: '#355A70' },
} as const satisfies Record<string, Palette>;

export type StickerDef = {
  id: StickerId;
  group: StickerGroup;
  label: string;
  palette: Palette;
};

export const STICKERS: Record<StickerId, StickerDef> = {
  'stamp-good':  { id: 'stamp-good',  group: 'stamp', label: '참 잘했어요', palette: PALETTES.classic },
  'stamp-great': { id: 'stamp-great', group: 'stamp', label: '훌륭해요',   palette: PALETTES.classic },

  'bloom-good-y': { id: 'bloom-good-y', group: 'bloom', label: '참 잘했어요 · 노랑', palette: PALETTES.y },
  'bloom-good-r': { id: 'bloom-good-r', group: 'bloom', label: '참 잘했어요 · 빨강', palette: PALETTES.r },
  'bloom-good-g': { id: 'bloom-good-g', group: 'bloom', label: '참 잘했어요 · 초록', palette: PALETTES.g },
  'bloom-good-p': { id: 'bloom-good-p', group: 'bloom', label: '참 잘했어요 · 보라', palette: PALETTES.p },

  'bloom-great-y': { id: 'bloom-great-y', group: 'bloom', label: '훌륭해요 · 노랑', palette: PALETTES.y },
  'bloom-great-r': { id: 'bloom-great-r', group: 'bloom', label: '훌륭해요 · 빨강', palette: PALETTES.r },
  'bloom-great-g': { id: 'bloom-great-g', group: 'bloom', label: '훌륭해요 · 초록', palette: PALETTES.g },
  'bloom-great-p': { id: 'bloom-great-p', group: 'bloom', label: '훌륭해요 · 보라', palette: PALETTES.p },

  'bloom-face-y': { id: 'bloom-face-y', group: 'bloom', label: '웃는 얼굴 · 노랑', palette: PALETTES.y },
  'bloom-face-r': { id: 'bloom-face-r', group: 'bloom', label: '웃는 얼굴 · 빨강', palette: PALETTES.r },
  'bloom-face-g': { id: 'bloom-face-g', group: 'bloom', label: '웃는 얼굴 · 초록', palette: PALETTES.g },
  'bloom-face-p': { id: 'bloom-face-p', group: 'bloom', label: '웃는 얼굴 · 보라', palette: PALETTES.p },

  star:   { id: 'star',   group: 'pic', label: '별',   palette: PALETTES.y },
  heart:  { id: 'heart',  group: 'pic', label: '하트', palette: PALETTES.r },
  flower: { id: 'flower', group: 'pic', label: '꽃',   palette: PALETTES.g },
  thumb:  { id: 'thumb',  group: 'pic', label: '따봉', palette: PALETTES.p },

  'obj-water':    { id: 'obj-water',    group: 'obj', label: '물컵',   palette: PALETTES.b },
  'obj-dumbbell': { id: 'obj-dumbbell', group: 'obj', label: '덤벨',   palette: PALETTES.p },
  'obj-shoe':     { id: 'obj-shoe',     group: 'obj', label: '운동화', palette: PALETTES.r },
  'obj-book':     { id: 'obj-book',     group: 'obj', label: '책',     palette: PALETTES.g },
};

export const GROUP_ORDER: StickerGroup[] = ['stamp', 'bloom', 'pic', 'obj'];

export function stickersByGroup(group: StickerGroup): StickerDef[] {
  return STICKER_IDS.map((id) => STICKERS[id]).filter((s) => s.group === group);
}

/** DB에 알 수 없는 값이 들어있어도 앱이 깨지지 않게 한다 */
export function resolveSticker(raw: string): StickerDef {
  return (STICKERS as Record<string, StickerDef | undefined>)[raw] ?? STICKERS[STICKER_DEFAULT];
}
