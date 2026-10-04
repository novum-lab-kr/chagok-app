// 몽글이 계열 2차 (24×24). 모양은 줄마다 [시작, 끝] 칸으로 정하고, 바깥 테두리는 자동으로 잉크로 찍는다.
// 모양을 여러 겹 쌓을 수 있다(뒤에 오는 모양이 위). 그다음 얼굴·볼·선 같은 점을 찍는다.
const PAL2 = {'#': '#06261C', w: '#FEF1D1', g: '#C7DE94', m: '#AFE1CB', o: '#FD855F'};
function shape(rows, fill) { return {rows, fill}; } // rows: {y: [x0, x1]}
const sym = (w) => [12 - w / 2, 11 + w / 2]; // 가운데 맞춘 폭 w
function build(shapes, dots) {
  const g = Array.from({length: 24}, () => Array(24).fill('.'));
  for (const s of shapes) {
    const inside = (x, y) => s.rows[y] && x >= s.rows[y][0] && x <= s.rows[y][1];
    for (const y in s.rows) {
      const [x0, x1] = s.rows[y];
      for (let x = x0; x <= x1; x++) {
        const yy = Number(y);
        const edge = !inside(x - 1, yy) || !inside(x + 1, yy) || !inside(x, yy - 1) || !inside(x, yy + 1);
        g[yy][x] = edge ? '#' : (typeof s.fill === 'function' ? s.fill(x, yy) : s.fill);
      }
    }
  }
  for (const [c, pts] of Object.entries(dots)) for (const [x, y] of pts) g[y][x] = c;
  return g.map(r => r.join(''));
}
const range = (a, b, f) => Object.fromEntries(Array.from({length: b - a + 1}, (_, i) => [a + i, f(a + i)]));
const eyes = (y, l, r) => [[l, y], [l + 1, y], [l, y + 1], [l + 1, y + 1], [r, y], [r + 1, y], [r, y + 1], [r + 1, y + 1]];

const CHARS2 = {
  // 1. 층층이 — 세 단 계단 실루엣. 위로 갈수록 좁다.
  tier: build([
    shape({4: sym(8), ...range(5, 9, () => sym(12)), 10: sym(10),
           11: sym(14), ...range(12, 14, () => sym(16)), 15: sym(14),
           16: sym(18), ...range(17, 19, () => sym(20)), 20: sym(18)}, 'g'),
  ], {
    '#': [...eyes(6, 9, 13), [11, 9], [12, 9], [7, 21], [8, 21], [15, 21], [16, 21],
          [6, 11], [17, 11], [4, 16], [19, 16]],
    o: [[7, 8], [16, 8]],
  }),
  // 2. 두단이 — 작은 몽글이가 큰 몽글이 위에 올라탐
  duo: build([
    shape({11: sym(12), 12: sym(14), ...range(13, 18, () => sym(16)), 19: sym(14), 20: sym(12)}, 'g'),
    shape({3: sym(4), 4: sym(8), ...range(5, 9, () => sym(10)), 10: sym(8), 11: sym(4)}, 'g'),
  ], {
    '#': [...eyes(6, 9, 13), [11, 8], [12, 8], ...eyes(14, 8, 14), [11, 17], [12, 17], [8, 21], [9, 21], [14, 21], [15, 21]],
    o: [[6, 16], [17, 16]],
  }),
  // 3. 이고지고 — 머리에 블록 세 장을 차곡차곡 이고 있음
  carry: build([
    shape({11: sym(8), 12: sym(12), ...range(13, 14, () => sym(14)), ...range(15, 20, () => sym(16)), 21: sym(14)}, 'g'),
    shape(range(8, 11, () => [8, 15]), 'm'),
    shape(range(5, 8, () => [9, 16]), 'w'),
    shape(range(2, 5, () => [7, 14]), 'o'),
  ], {
    '#': [...eyes(14, 8, 14), [11, 17], [12, 17], [8, 22], [9, 22], [14, 22], [15, 22]],
    o: [[6, 16], [7, 16], [16, 16], [17, 16]],
  }),
  // 4. 말랑블록 — 모서리 둥근 네모 몸, 아래 한 층이 다른 색
  brick: build([
    shape({4: [7, 16], 5: [5, 18], ...range(6, 17, () => [4, 19]), 18: [5, 18], 19: [7, 16]},
      (x, y) => (y === 14 ? '#' : y > 14 ? 'w' : 'g')),
  ], {
    '#': [...eyes(8, 8, 14), [11, 11], [12, 11], [7, 20], [8, 20], [15, 20], [16, 20]],
    o: [[6, 11], [7, 11], [16, 11], [17, 11]],
  }),
  // 5. 방석이 — 스티커 더미(세 장) 위에 앉은 몽글이
  cushion: build([
    shape(range(19, 21, () => [4, 19]), 'g'),
    shape(range(17, 19, () => [5, 20]), 'o'),
    shape(range(15, 17, () => [3, 18]), 'w'),
    shape({4: sym(6), 5: sym(10), 6: sym(12), ...range(7, 14, () => sym(14)), 15: sym(14)}, 'g'),
  ], {
    '#': [...eyes(8, 8, 14), [11, 11], [12, 11]],
    o: [[6, 11], [7, 11], [16, 11], [17, 11]],
  }),
};
function charSvg2(id, size) {
  let rects = '';
  CHARS2[id].forEach((r, y) => { for (let x = 0; x < 24; x++) { const c = r[x]; if (PAL2[c]) rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${PAL2[c]}"/>`; } });
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" shape-rendering="crispEdges" role="img" aria-label="${id}">${rects}</svg>`;
}
if (typeof module !== 'undefined') module.exports = {CHARS2, charSvg2};
