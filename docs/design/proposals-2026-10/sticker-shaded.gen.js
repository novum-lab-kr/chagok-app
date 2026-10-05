// 도트 스티커 생성기 3판: 참고 하트(사용자 제공)의 명암 규칙.
// 24칸 격자, 한 칸 윤곽, 재질마다 기본·그림자·하이라이트 세 단계. 빛은 왼쪽 위.
const fs = require('fs');
const N = 24;
const OUT = '#1A1426';
const MAT = {
  red: {b: '#E03D36', s: '#9E2033', l: '#F0A9A7', r: '#EA6B5F'},
  apricot: {b: '#FD855F', s: '#C9553D', l: '#FFD3BE', r: '#FFA585'},
  leaf: {b: '#7DBE5A', s: '#4E8A3E', l: '#C7E89A', r: '#9ED477'},
  cream: {b: '#FEF1D1', s: '#E3C79A', l: '#FFFFFF', r: '#FFF8E6'},
  white: {b: '#F7FBFF', s: '#BFD2E3', l: '#FFFFFF', r: '#FFFFFF'},
  brown: {b: '#9A6440', s: '#6B3F27', l: '#C99470', r: '#B07A52'},
  coffee: {b: '#7A4A2E', s: '#55301C', l: '#A87352', r: '#8D5A3A'},
  pink: {b: '#F7A8B8', s: '#D9758D', l: '#FFE0E7', r: '#FBC2CF'},
  yellow: {b: '#FFD25E', s: '#E0A030', l: '#FFF2B8', r: '#FFE08A'},
  mint: {b: '#AFE1CB', s: '#76B79C', l: '#E4F7EE', r: '#C9EEDD'},
};
const EYE = '#1A1426', SPARK = '#FFFFFF', BLUSH = '#F58A8A';

const circle = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r;
const ell = (cx, cy, rx, ry, a = 0) => (x, y) => {
  const c = Math.cos(-a), s = Math.sin(-a), dx = x - cx, dy = y - cy;
  const u = dx * c - dy * s, v = dx * s + dy * c;
  return (Math.hypot(u / rx, v / ry) - 1) * Math.min(rx, ry);
};
const rbox = (cx, cy, hw, hh, r = 0) => (x, y) => {
  const qx = Math.abs(x - cx) - hw + r, qy = Math.abs(y - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
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

/* objs: [{shape, mat, hl:[x,y,rx,ry]?, flat?}] 뒤에서 앞으로. extra: [[x,y,color]] 마지막에 찍는다. */
function draw(objs, extra = []) {
  const g = Array.from({length: N}, () => Array(N).fill(null));
  const own = Array.from({length: N}, () => Array(N).fill(-1));
  objs.forEach((o, k) => {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (o.shape(x + 0.5, y + 0.5) <= 0) own[y][x] = k;
  });
  const inside = (k, x, y) => x >= 0 && y >= 0 && x < N && y < N && own[y][x] === k;
  const cy = objs.map((o, k) => { let s = 0, n = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (own[y][x] === k) { s += y; n++; } return n ? s / n : 0; });
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const k = own[y][x]; if (k < 0) continue;
    const o = objs[k], m = MAT[o.mat];
    let edge = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; const n = nx < 0 || ny < 0 || nx >= N || ny >= N ? -1 : own[ny][nx]; if (n === -1 || n > k) { edge = true; break; } }
    if (edge) { g[y][x] = OUT; continue; }
    if (o.flat) { g[y][x] = m.b; continue; }
    // 참고 하트 규칙: 무게중심보다 아래에서, 바로 아래(대각선 포함) 한 칸이 윤곽이면 그림자 한 칸
    const shade = y + 0.5 > cy[k] && [[-1, 1], [0, 1], [1, 1]].some(([dx, dy]) => !inside(k, x + dx, y + dy) && !(own[y + dy] && own[y + dy][x + dx] > k));
    let c = m.b;
    if (shade) c = m.s;
    if (o.hl) for (const [hx, hy] of o.hl) if (hx === x && hy === y) c = m.l;
    g[y][x] = c;
  }
  for (const [x, y, c] of extra) g[y][x] = c;
  return g;
}
/* 얼굴: 눈 2×2(왼쪽 위 반짝), w 입, 볼 */
const face = (cx, ey, sp, {spark = SPARK, blush = false} = {}) => {
  // 눈 2×2(왼쪽 위 반짝), 입은 가운데 아래 두 칸 (참고 하트)
  const L = Math.round(cx - sp - 1), R = Math.round(cx + sp - 1), mx = Math.round(cx - 1), my = ey + 3;
  const e = [];
  for (const ex of [L, R]) e.push([ex, ey, spark], [ex + 1, ey, EYE], [ex, ey + 1, EYE], [ex + 1, ey + 1, EYE]);
  e.push([mx, my, EYE], [mx + 1, my, EYE]);
  if (blush) e.push([L - 1, ey + 2, BLUSH], [R + 2, ey + 2, BLUSH]);
  return e;
};
const px = (s, c) => s.trim().split(/\s+/).map(p => { const [x, y] = p.split(',').map(Number); return [x, y, c]; });

const S = {};
const P = (str) => str.trim().split(/\s+/).map(p => p.split(',').map(Number));
// 하트: 참고와 같은 크기(가로 19칸)
S.heart = draw([{mat: 'red', shape: U(circle(8, 9.2, 5.4), circle(16, 9.2, 5.4), poly([[2.6, 10], [21.4, 10], [21.4, 12], [12, 21], [2.6, 12]])), hl: P('7,6 6,7 7,7 6,8')}], face(12, 11, 3.5, {spark: MAT.red.l}));
S.apple = draw([
  {mat: 'leaf', shape: ell(15.6, 4.6, 3.2, 1.7, -0.5), hl: P('14,4')},
  {mat: 'red', shape: U(circle(8.8, 13, 6.2), circle(15.2, 13, 6.2), circle(12, 15.4, 6.2)), hl: P('6,9 5,10 6,10 5,11')},
], [...px('11,4 11,5 12,6', OUT), ...face(12, 13, 3.5, {spark: MAT.red.l})]);
S.coffee = draw([
  {mat: 'cream', shape: SUB(circle(18.4, 14.5, 3.6), circle(18.4, 14.5, 1.4))},
  {mat: 'cream', shape: rbox(10.5, 15, 7, 6.8, 1.6), hl: P('5,10 5,11 5,12')},
  {mat: 'coffee', shape: rbox(10.5, 8.8, 5.6, 0.9), flat: true},
], [...px('7,2 8,3 7,4 12,1 13,2 12,3', '#B8A898'), ...face(10.5, 13, 3, {spark: '#FFFFFF'})]);
S.cloud = draw([{mat: 'white', shape: U(circle(7.2, 14.4, 4.2), circle(11.4, 11.2, 4.8), circle(15.8, 11.6, 4.3), circle(18.4, 15, 3.6), rbox(12.6, 16.2, 9, 2.8, 2.4)), hl: P('9,8 8,9 10,8')}], face(12.6, 13, 3.5, {spark: '#FFFFFF'}));
S.rabbit = draw([
  {mat: 'cream', shape: ell(8.6, 7, 2.5, 6, -0.12)}, {mat: 'cream', shape: ell(15.4, 7, 2.5, 6, 0.12)},
  {mat: 'cream', shape: ell(12, 16, 8, 6.4), hl: P('6,12 5,13 6,13')},
], [...px('8,5 8,6 8,7 8,8 15,5 15,6 15,7 15,8', MAT.pink.b), ...face(12, 15, 3.5, {spark: '#FFFFFF', blush: true})]);

const toRects = (g) => g.flatMap((r, y) => r.map((c, x) => (c ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>` : ''))).join('');
const svg = (g, size) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" shape-rendering="crispEdges">${toRects(g)}</svg>`;
module.exports = {S, draw, face, px, MAT, OUT, toRects, svg, circle, ell, rbox, poly, U, SUB};
if (require.main === module) {
  let h = '<body style="background:#e4ebe5;padding:12px;font:13px sans-serif"><div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap">';
  h += `<div style="text-align:center"><div style="background:#FEF1D1;padding:6px"><img src="file:///Users/eunjukim/Desktop/south.png" width=144 height=144 style="image-rendering:pixelated"></div>참고</div>`;
  for (const [id, g] of Object.entries(S)) h += `<div style="text-align:center"><div style="background:#FEF1D1;padding:6px">${svg(g, 144)}</div><div style="display:flex;gap:6px;justify-content:center;margin:4px 0"><span style="background:#C7DE94;box-shadow:inset 0 0 0 3px #06261C;padding:8px 15px 3px">${svg(g, 54)}</span><span style="background:#C7DE94;padding:4px">${svg(g, 28)}</span></div>${id}</div>`;
  fs.writeFileSync(`${process.argv[2] || '.'}/preview3.html`, h + '</div>');
}
