import { colorStickerData } from '../src/stickers/color/stickers.generated';
import { stickerBlockColors } from '../src/watch/stickerColors.generated';
import { blockColorOf, FALLBACK_BLOCK_COLORS } from '../src/watch/blockColor';

const lum = (h: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b;
};
/** 윤곽선 = 그 스티커에서 가장 어두운 색 */
const outlineOf = (layers: readonly { color: string }[]) => [...layers].map((l) => l.color).sort((a, b) => lum(a) - lum(b))[0];

describe('블록 색 (워치 설계 「블록 색」)', () => {
  it('컬러 스티커마다 색이 하나씩 있다', () => {
    for (const s of colorStickerData) expect(stickerBlockColors[s.id]).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('윤곽선 색은 고르지 않는다', () => {
    for (const s of colorStickerData) expect(stickerBlockColors[s.id]).not.toBe(outlineOf(s.layers).toUpperCase());
  });

  it('예전 흑백 id도 컬러로 옮겨 찾는다', () => {
    expect(blockColorOf('sprout')).toBe(stickerBlockColors['basic.sprout']);
  });

  it('모르는 id는 앱처럼 기본 스티커(새싹) 색', () => {
    expect(blockColorOf('nope.nope')).toBe(stickerBlockColors['basic.sprout']);
  });

  it('기본 색은 차곡이 판 세 장 색', () => {
    expect(FALLBACK_BLOCK_COLORS).toEqual(['#AFE1CB', '#FEF1D1', '#FD855F']);
  });
});
