const G = require('./sticker-shaded.gen.js');
Object.assign(G.MAT, {white2: {b: '#FAFAFA', s: '#C9CDD2', l: '#FFFFFF'}});
const {draw, face, px, MAT, OUT, circle, poly, U} = G;
const fs = require('fs');
const P = (str) => str.trim().split(/\s+/).map(p => p.split(',').map(Number));
const W = '#FFFFFF';
const starPoly = (cx, cy, R, r) => poly(Array.from({length: 10}, (_, i) => { const t = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; return [cx + rr * Math.cos(t), cy + rr * Math.sin(t)]; }));
const round = (f, k) => (x, y) => f(x, y) - k;
const V = {};
// 가: 정오각 별 (뿔 다섯 개 길이·각도가 같음)
V.a = draw([{mat: 'yellow', shape: starPoly(12, 12.8, 11, 4.6), hl: P('11,4 11,5 10,6')}], face(12, 12, 2.6, {spark: W, blush: true}));
// 나: 통통한 별 (뿔 끝이 둥글다)
V.b = draw([{mat: 'yellow', shape: round(starPoly(12, 12.9, 9.4, 4.4), 1.4), hl: P('10,5 10,6 9,7')}], face(12, 12, 2.6, {spark: W, blush: true}));
// 다: 아주 통통한 별 (안쪽이 넓고 뿔이 짧다)
V.c = draw([{mat: 'yellow', shape: round(starPoly(12, 12.8, 9, 5.4), 1.6), hl: P('10,5 10,6 9,7')}], face(12, 12, 2.6, {spark: W, blush: true}));
V.now = require('./sticker-star.gen.js');
module.exports = V;
// 축구공: 가운데 검은 오각형 + 테두리 반쪽 오각형 다섯 + 이음선
{
  const ball = circle(12, 12, 9.6);
  const g = draw([{mat: 'white2', shape: ball, hl: P('7,6 6,7')}]);
  const pent = (cx, cy, r, a0) => poly(Array.from({length: 5}, (_, i) => { const t = a0 + i * 2 * Math.PI / 5; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; }));
  const center = pent(12, 12, 3, -Math.PI / 2);
  const outer = [0, 1, 2, 3, 4].map(k => { const t = Math.PI / 2 + k * 2 * Math.PI / 5; return pent(12 + 9.9 * Math.cos(t), 12 + 9.9 * Math.sin(t), 2.5, t); });
  const seam = (x, y) => { for (let k = 0; k < 5; k++) { const t = -Math.PI / 2 + k * 2 * Math.PI / 5; const ax = 12 + 3 * Math.cos(t), ay = 12 + 3 * Math.sin(t), bx = 12 + 7.6 * Math.cos(t), by = 12 + 7.6 * Math.sin(t); const vx = bx - ax, vy = by - ay, h = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy))); if (Math.hypot(x - ax - vx * h, y - ay - vy * h) < 0.62) return true; } return false; };
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    const c = g[y][x]; if (!c || c === OUT) continue;
    const X = x + 0.5, Y = y + 0.5;
    if (center(X, Y) <= 0 || outer.some(f => f(X, Y) <= 0)) g[y][x] = '#2B2B33';
    else if (seam(X, Y)) g[y][x] = '#8C929A';
  }
  V.soccer = g;
}
if (require.main === module) {
  const svg = (g, sz) => `<svg width=${sz} height=${sz} viewBox="0 0 24 24" shape-rendering="crispEdges">${g.flatMap((r, y) => r.map((c, x) => c ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>` : '')).join('')}</svg>`;
  let h = '<body style="background:#e4ebe5;padding:8px;display:flex;gap:10px;font:12px sans-serif">';
  for (const [k, g] of Object.entries(V)) h += `<div style="text-align:center"><div style="background:#FEF1D1">${svg(g, 132)}</div><span style="background:#C7DE94;display:inline-block;padding:3px">${svg(g, 48)}</span><br>${k}</div>`;
  fs.writeFileSync('ss.html', h);
}
