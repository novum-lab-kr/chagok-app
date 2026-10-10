import { colorStickers, type ColorStickerId } from './color/catalog';
import { pocketStickers } from './pocket/catalog';

const COLOR = new Set<string>(colorStickers.map((s) => s.id));
const LEGACY = new Set<string>(pocketStickers.map((s) => s.id));
export const DEFAULT_COLOR_STICKER: ColorStickerId = 'basic.sprout';

/**
 * 저장값을 그릴 수 있는 컬러 ID로 (2026-10-07 모두 컬러). 스키마 v6이 기기 값은 옮기지만
 * 서버 복원으로 옛 흑백 ID가 다시 올 수 있어 읽을 때마다 거친다. 저장값은 바꾸지 않는다.
 */
export function normalizeStickerId(raw: string): ColorStickerId {
  if (COLOR.has(raw)) return raw as ColorStickerId;
  if (LEGACY.has(raw)) return `basic.${raw}` as ColorStickerId;
  return DEFAULT_COLOR_STICKER;
}
