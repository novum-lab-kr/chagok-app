/** Two broad orthogonal steps, measured from the v6 frame corners. */
export function pixelOutline(width: number, height: number, inset = 0, unit = 3): string {
  const x = inset, y = inset, r = width - inset, b = height - inset;
  if (r <= x || b <= y) return '';
  const u = Math.min(unit, (r-x)/4, (b-y)/4);
  return `M${x+2*u} ${y} H${r-2*u} V${y+u} H${r-u} V${y+2*u} H${r} V${b-2*u} H${r-u} V${b-u} H${r-2*u} V${b} H${x+2*u} V${b-u} H${x+u} V${b-2*u} H${x} V${y+2*u} H${x+u} V${y+u} H${x+2*u} Z`;
}
export function progressRatio(value: number, total: number): number {
  return total > 0 && Number.isFinite(value) && Number.isFinite(total)
    ? Math.min(1, Math.max(0, value / total)) : 0;
}
/** 크게 보는 사진 틀의 폭:높이. 사진 비율을 따르되 세로는 3:4, 가로는 16:9까지만 (2026-11-05 A안). 아이폰 세로 사진 3:4를 자르지 않는다. 크기를 모르면 null. */
export const PHOTO_FRAME_MIN_RATIO=3/4;
export const PHOTO_FRAME_MAX_RATIO=16/9;
export function photoFrameRatio(width: number, height: number): number | null {
  if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) return null;
  return Math.min(PHOTO_FRAME_MAX_RATIO, Math.max(PHOTO_FRAME_MIN_RATIO, width / height));
}
