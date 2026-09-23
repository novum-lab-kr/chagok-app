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
