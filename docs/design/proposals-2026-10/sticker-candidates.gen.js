// 스티커 후보 생성기: 도형(SDF)을 56×56 격자에 찍어 기존 pocket 스티커와 같은 형식의 path를 만든다.
// node gen.js <outdir>  → stickers.json, preview.html
const fs = require('fs');
const N = 56, T = 1.75; // 윤곽 반폭 → 3~4px 선

/* ── SDF 도형 ── */
const circle = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r;
const ell = (cx, cy, rx, ry, a = 0) => (x, y) => {
  const c = Math.cos(-a), s = Math.sin(-a), dx = x - cx, dy = y - cy;
  const u = dx * c - dy * s, v = dx * s + dy * c;
  const k = Math.hypot(u / rx, v / ry);
  return (k - 1) * Math.min(rx, ry);
};
const rbox = (cx, cy, hw, hh, r = 0) => (x, y) => {
  const qx = Math.abs(x - cx) - hw + r, qy = Math.abs(y - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const cap = (ax, ay, bx, by, r = 1.6) => (x, y) => {
  const px = x - ax, py = y - ay, vx = bx - ax, vy = by - ay;
  const h = Math.max(0, Math.min(1, (px * vx + py * vy) / (vx * vx + vy * vy || 1)));
  return Math.hypot(px - vx * h, py - vy * h) - r;
};
const poly = (pts) => (x, y) => {
  let d = Infinity, s = 1;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    const ex = xj - xi, ey = yj - yi, wx = x - xi, wy = y - yi;
    const h = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
    d = Math.min(d, Math.hypot(wx - ex * h, wy - ey * h));
    const c1 = y >= yi, c2 = y < yj, c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * d;
};
const U = (...fs) => (x, y) => Math.min(...fs.map(f => f(x, y)));
const SUB = (a, b) => (x, y) => Math.max(a(x, y), -b(x, y));
const AND = (a, b) => (x, y) => Math.max(a(x, y), b(x, y));
const heart = (cx, cy, s) => U(circle(cx - s * 0.5, cy - s * 0.25, s * 0.55), circle(cx + s * 0.5, cy - s * 0.25, s * 0.55),
  poly([[cx - s * 1.02, cy - s * 0.05], [cx + s * 1.02, cy - s * 0.05], [cx, cy + s * 1.05]]));

/* ── 그리기 명령: 순서대로 칠한다(뒤에 오는 것이 앞) ── */
function render(cmds) {
  const g = Array.from({length: N}, () => new Uint8Array(N));
  for (const [mode, f, mask] of cmds) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const px = x + 0.5, py = y + 0.5;
      if (mask && !mask(px, py)) continue;
      const d = f(px, py);
      if (mode === 'F' && d <= 0) g[y][x] = 1;
      else if (mode === 'E' && d <= 0) g[y][x] = 0;
      else if (mode === 'O' && Math.abs(d) <= T) g[y][x] = 1;
      else if (mode === 'o' && Math.abs(d) <= 0.8) g[y][x] = 1; // 가는 선
    }
  }
  return g;
}
const OE = (f, mask) => [['E', f, mask], ['O', f, mask]];
const F = (f) => [['F', f]];
const O = (f, mask) => [['O', f, mask]];
const o = (f, mask) => [['o', f, mask]];
const eyes = (cx, cy, sp) => [...F(rbox(cx - sp, cy, 1, 1.5)), ...F(rbox(cx + sp, cy, 1, 1.5))];
const smile = (cx, cy) => [...F(cap(cx - 2.2, cy, cx, cy + 1.4, 0.75)), ...F(cap(cx, cy + 1.4, cx + 2.2, cy, 0.75))];
const face = (cx, cy, sp = 5) => [...eyes(cx, cy, sp), ...smile(cx, cy + 4)];
const wave = (x0, x1, y, amp, per, r = 1.5) => {
  const out = [];
  for (let x = x0; x < x1; x += 1) out.push(...F(cap(x, y + amp * Math.sin((x - x0) / per * 2 * Math.PI), x + 1, y + amp * Math.sin((x + 1 - x0) / per * 2 * Math.PI), r)));
  return out;
};
const rot = (f, a, cx, cy) => (x, y) => { const c = Math.cos(-a), s = Math.sin(-a), dx = x - cx, dy = y - cy; return f(cx + dx * c - dy * s, cy + dx * s + dy * c); };

const THEMES = [
  {id: 'fit', name: '운동·건강'}, {id: 'study', name: '공부·일'}, {id: 'life', name: '생활·마음'},
  {id: 'season', name: '계절·날씨'}, {id: 'animal', name: '동물 친구'},
];

const S = {};
const add = (theme, id, name, cmds) => { S[id] = {theme, name, grid: render(cmds)}; };

/* 운동·건강 */
add('fit', 'dumbbell', '덤벨', [
  ...F(cap(12, 28, 44, 28, 2.6)),
  ...OE(rbox(15, 28, 4.5, 12, 2)), ...OE(rbox(41, 28, 4.5, 12, 2)),
  ...OE(rbox(7.5, 28, 3, 7.5, 1.5)), ...OE(rbox(48.5, 28, 3, 7.5, 1.5)),
]);
add('fit', 'yogamat', '요가 매트', [
  ...OE(rbox(32, 32, 19, 10, 2)),
  ...F(rbox(36, 32, 1.4, 10)),
  ...OE(circle(14, 32, 11)), ...O(circle(14, 32, 5.5)), ...F(circle(14, 32, 1.6)),
]);
add('fit', 'water', '물컵', [
  ...OE(poly([[13, 10], [43, 10], [39, 49], [17, 49]])),
  ...F(cap(15.5, 22, 40.5, 22, 1.4)),
  ...O(circle(24, 33, 2.6)), ...o(circle(32, 41, 2)), ...o(circle(31, 30, 1.6)),
]);
add('fit', 'bike', '자전거', [
  ...O(circle(13, 37, 9.5)), ...O(circle(43, 37, 9.5)), ...F(circle(13, 37, 1.8)), ...F(circle(43, 37, 1.8)),
  ...F(cap(13, 37, 27, 37)), ...F(cap(27, 37, 22, 22)), ...F(cap(22, 22, 39, 22)), ...F(cap(39, 22, 43, 37)), ...F(cap(27, 37, 39, 22)), ...F(cap(13, 37, 22, 22)),
  ...F(cap(18, 19, 26, 19, 1.8)), ...F(cap(39, 22, 37, 15)), ...F(cap(34, 15, 41, 15, 1.8)),
]);
add('fit', 'goggles', '수영', [
  ...F(cap(3, 28, 10, 29)), ...F(cap(46, 29, 53, 28)),
  ...OE(rbox(18.5, 28, 9, 7, 5)), ...OE(rbox(37.5, 28, 9, 7, 5)), ...F(cap(27, 28, 29, 28)),
  ...F(cap(14, 25, 17, 25, 0.9)), ...F(cap(33, 25, 36, 25, 0.9)),
  ...wave(6, 50, 45, 2.2, 11),
]);
add('fit', 'apple', '사과', [
  ...OE(U(circle(22, 34, 14), circle(34, 34, 14), circle(28, 40, 12))),
  ...F(cap(28, 21, 30, 11)),
  ...OE(ell(38, 13, 6.5, 3.4, -0.5)),
  ...face(28, 34, 5),
]);

/* 공부·일 */
{
  const a = -0.72, cx = 28, cy = 28, r = (f) => rot(f, a, cx, cy);
  add('study', 'pencil', '연필', [
    ...OE(r(poly([[40, 22], [53, 28], [40, 34]]))), ...F(r(poly([[48.5, 25.8], [53, 28], [48.5, 30.2]]))),
    ...OE(r(rbox(26, 28, 15, 6, 0.5))), ...F(r(cap(13, 28, 40, 28, 0.9))),
    ...OE(r(rbox(7, 28, 4.5, 6, 2.2))), ...F(r(rbox(12.2, 28, 1.2, 6))),
  ]);
}
add('study', 'laptop', '노트북', [
  ...OE(rbox(28, 25, 17, 13, 2)), ...o(rbox(28, 25, 12.5, 8.5, 1)),
  ...OE(rbox(28, 43, 23, 3.8, 1.8)), ...F(cap(23, 43, 33, 43, 0.9)),
  ...face(28, 23, 4.5),
]);
add('study', 'clock', '시계', [
  ...OE(circle(14, 12, 5.5)), ...OE(circle(42, 12, 5.5)),
  ...F(cap(17, 46, 13, 51)), ...F(cap(39, 46, 43, 51)),
  ...OE(circle(28, 30, 18.5)),
  ...F(rbox(28, 15.5, 1, 1.8)), ...F(rbox(28, 44.5, 1, 1.8)), ...F(rbox(13.5, 30, 1.8, 1)), ...F(rbox(42.5, 30, 1.8, 1)),
  ...F(cap(28, 30, 28, 20)), ...F(cap(28, 30, 35, 34)), ...F(circle(28, 30, 2.6)),
]);
add('study', 'bulb', '전구', [
  ...F(cap(6, 22, 2.5, 22)), ...F(cap(50, 22, 53.5, 22)), ...F(cap(11, 8, 8, 5)), ...F(cap(45, 8, 48, 5)), ...F(cap(10, 35, 7, 38)), ...F(cap(46, 35, 49, 38)),
  ...OE(U(circle(28, 21, 14), poly([[19, 29], [37, 29], [34, 41], [22, 41]]))),
  ...OE(rbox(28, 45.5, 6.5, 5, 1.5)), ...F(cap(22, 45, 34, 45, 0.9)),
  ...F(cap(24, 32, 26, 25, 0.9)), ...F(cap(26, 25, 28, 30, 0.9)), ...F(cap(28, 30, 30, 25, 0.9)), ...F(cap(30, 25, 32, 32, 0.9)),
]);
add('study', 'check', '체크', [
  ...OE(rbox(28, 28, 20, 20, 6)),
  ...F(cap(17, 29, 25, 37, 2.8)), ...F(cap(25, 37, 40, 19, 2.8)),
]);
add('study', 'coffee', '커피', [
  ...O(circle(41, 34, 7)),
  ...OE(rbox(25, 35, 15, 14, 3.5)),
  ...F(cap(20, 5, 18, 9, 1.3)), ...F(cap(18, 9, 20, 13, 1.3)), ...F(cap(20, 13, 18, 16, 1.3)),
  ...F(cap(29, 5, 27, 9, 1.3)), ...F(cap(27, 9, 29, 13, 1.3)), ...F(cap(29, 13, 27, 16, 1.3)),
  ...face(25, 33, 5),
]);

/* 생활·마음 */
add('life', 'plant', '화분', [
  ...F(cap(28, 34, 28, 16)),
  ...OE(ell(18, 20, 9.5, 4.8, 0.55)), ...OE(ell(38, 17, 9.5, 4.8, -0.55)), ...OE(ell(28, 9, 4.2, 7)),
  ...OE(poly([[15, 36], [41, 36], [37, 51], [19, 51]])),
  ...OE(rbox(28, 35, 16, 4, 1.2)),
  ...face(28, 44, 4.5),
]);
add('life', 'bed', '침대', [
  ...OE(rbox(7, 34, 3.5, 13, 2)),
  ...OE(rbox(30, 41, 23, 5, 2)),
  ...F(cap(11, 46, 11, 51)), ...F(cap(49, 46, 49, 51)),
  ...OE(circle(17, 30, 6.5)), ...F(cap(14, 31, 16, 31, 0.8)), ...F(cap(18.5, 31, 20.5, 31, 0.8)),
  ...OE(rbox(37, 34, 14, 5.5, 3)),
  ...F(cap(30, 12, 37, 12, 1.2)), ...F(cap(37, 12, 30, 19, 1.2)), ...F(cap(30, 19, 37, 19, 1.2)),
  ...F(cap(41, 5, 46, 5, 1)), ...F(cap(46, 5, 41, 10, 1)), ...F(cap(41, 10, 46, 10, 1)),
]);
add('life', 'wallet', '지갑', [
  ...OE(rbox(23, 16, 12, 6, 1)),
  ...OE(rbox(28, 33, 22, 15, 4)),
  ...OE(rbox(42, 33, 10, 6.5, 3)), ...F(circle(43, 33, 2)),
  ...F(cap(10, 24, 30, 24, 0.9)),
]);
add('life', 'diary', '일기장', [
  ...OE(rbox(26, 29, 17, 22, 3)),
  ...F(rbox(13.5, 29, 1.4, 22)),
  ...OE(rbox(43.5, 29, 4.5, 5.5, 1.6)),
  ...F(heart(27, 26, 5.5)),
  ...F(cap(20, 40, 34, 40, 0.9)),
]);
add('life', 'heart', '하트', [
  ...OE(heart(28, 26, 17)),
  ...face(28, 27, 6),
]);
add('life', 'sun', '해', [
  ...[0, 1, 2, 3, 4, 5, 6, 7].flatMap(k => { const t = k * Math.PI / 4; return F(cap(28 + 18 * Math.cos(t), 28 + 18 * Math.sin(t), 28 + 24 * Math.cos(t), 28 + 24 * Math.sin(t), 2)); }),
  ...OE(circle(28, 28, 13)),
  ...face(28, 27, 5),
]);

/* 계절·날씨 */
add('season', 'snowman', '눈사람', [
  ...F(cap(16, 36, 6, 29)), ...F(cap(9, 31, 6, 26, 1.2)), ...F(cap(40, 36, 50, 29)), ...F(cap(47, 31, 50, 26, 1.2)),
  ...OE(circle(28, 40, 13)),
  ...OE(circle(28, 18, 9.5)),
  ...eyes(28, 16, 3.5), ...F(poly([[27, 19.5], [34, 21], [27, 22.5]])),
  ...F(circle(28, 36, 1.7)), ...F(circle(28, 43, 1.7)),
]);
add('season', 'umbrella', '우산', [
  ...F(cap(28, 26, 28, 45)),
  ...O(circle(23.5, 45, 4.5), (x, y) => y >= 45),
  ...OE(AND(circle(28, 30, 23), (x, y) => y - 30)),
  ...F(cap(28, 8, 18, 29, 1.2)), ...F(cap(28, 8, 38, 29, 1.2)), ...F(cap(28, 8, 28, 29, 1.2)),
  ...F(cap(28, 4, 28, 7.5, 1.6)),
]);
add('season', 'maple', '단풍', [
  ...F(cap(28, 40, 28, 53)),
  ...OE(poly([[28, 4], [32, 15], [38, 10], [37, 21], [49, 17], [44, 28], [51, 31], [39, 36], [41, 42], [28, 39], [15, 42], [17, 36], [5, 31], [12, 28], [7, 17], [19, 21], [18, 10], [24, 15]])),
  ...F(cap(28, 39, 28, 13, 0.85)), ...F(cap(28, 32, 40, 23, 0.85)), ...F(cap(28, 32, 16, 23, 0.85)),
]);
{
  const petals = [], notches = [];
  for (let k = 0; k < 5; k++) { const t = -Math.PI / 2 + k * 2 * Math.PI / 5; petals.push(circle(28 + 12 * Math.cos(t), 29 + 12 * Math.sin(t), 9.5)); notches.push(poly([[28 + 18.5 * Math.cos(t), 29 + 18.5 * Math.sin(t)], [28 + 25 * Math.cos(t - 0.16), 29 + 25 * Math.sin(t - 0.16)], [28 + 25 * Math.cos(t + 0.16), 29 + 25 * Math.sin(t + 0.16)]])); }
  add('season', 'blossom', '벚꽃', [
    ...OE(SUB(U(...petals), U(...notches))),
    ...F(circle(28, 29, 2.2)),
  ]);
}

/* 동물 친구 */
add('animal', 'dog', '강아지', [
  ...OE(ell(13, 25, 5.5, 11, 0.55)), ...OE(ell(43, 25, 5.5, 11, -0.55)),
  ...OE(ell(28, 33, 15, 13)),
  ...eyes(28, 31, 6), ...F(ell(28, 37, 2.6, 1.8)), ...smile(28, 40),
]);
add('animal', 'rabbit', '토끼', [
  ...OE(ell(20, 14, 5, 12, -0.12)), ...OE(ell(36, 14, 5, 12, 0.12)),
  ...F(cap(20, 8, 20.5, 18, 0.8)), ...F(cap(36, 8, 35.5, 18, 0.8)),
  ...OE(ell(28, 37, 17, 14)),
  ...face(28, 36, 6),
]);
add('animal', 'penguin', '펭귄', [
  ...OE(ell(11, 33, 4, 9, 0.35)), ...OE(ell(45, 33, 4, 9, -0.35)),
  ...F(ell(21, 50, 5, 2.5)), ...F(ell(35, 50, 5, 2.5)),
  ...OE(ell(28, 30, 15, 20)),
  ...o(ell(28, 38, 9.5, 10)),
  ...eyes(28, 17, 5), ...F(poly([[25, 21], [31, 21], [28, 25]])),
]);
add('animal', 'duck', '오리', [
  ...OE(ell(31, 38, 18, 11)),
  ...O(ell(36, 35, 8, 4.5), (x, y) => y >= 35),
  ...OE(circle(20, 20, 10)),
  ...OE(ell(8, 23, 5.5, 3)),
  ...F(rbox(21, 18, 1, 1.5)),
]);

/* ── 출력: 기존 assets와 같은 줄 단위 path ── */
const toPath = (g) => {
  let d = '';
  for (let y = 0; y < N; y++) { let x = 0; while (x < N) { if (!g[y][x]) { x++; continue; } let w = 0; while (x + w < N && g[y][x + w]) w++; d += `M${x} ${y}h${w}v1h-${w}Z`; x += w; } }
  return d;
};
const out = {themes: THEMES, stickers: Object.fromEntries(Object.entries(S).map(([id, s]) => [id, {theme: s.theme, name: s.name, path: toPath(s.grid)}]))};
const dir = process.argv[2] || '.';
fs.writeFileSync(`${dir}/stickers.json`, JSON.stringify(out));
let h = '<body style="margin:0;background:#AFE1CB;font:14px sans-serif;padding:12px">';
for (const t of THEMES) {
  h += `<div style="margin:8px 0">${t.name}</div><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">`;
  for (const [, s] of Object.entries(out.stickers).filter(([, s]) => s.theme === t.id))
    h += `<div style="text-align:center"><div style="background:#FEF1D1"><svg width=168 height=168 viewBox="0 0 56 56" shape-rendering="crispEdges"><path d="${s.path}" fill="#06261C"/></svg></div><svg width=48 height=48 viewBox="0 0 56 56"><path d="${s.path}" fill="#06261C"/></svg><div>${s.name}</div></div>`;
  h += '</div>';
}
fs.writeFileSync(`${dir}/preview.html`, h);
console.log(Object.keys(out.stickers).length, 'stickers');
