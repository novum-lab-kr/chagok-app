// 도트 스티커 생성기 2판: 24×24 격자, 1칸 윤곽, 팔레트 칠.
// 물체마다 채움 영역을 칠하고, 뒤 물체가 빈칸·앞 물체와 닿는 칸을 잉크로 바꿔 한 칸짜리 윤곽을 만든다.
const fs = require('fs');
const N = 24;
const PAL = {K: '#06261C', A: '#FD855F', L: '#C7DE94', I: '#FEF1D1', M: '#AFE1CB', W: '#FFFFFF'};

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

/* layers: [obj, color, shape, {detail}] 순서대로 칠한다. px: [[x,y,color],...] 마지막에 직접 찍는다. */
function draw({layers, px = [], erase = []}) {
  const col = Array.from({length: N}, () => Array(N).fill('.'));
  const obj = Array.from({length: N}, () => Array(N).fill(-1));
  const order = {};
  layers.forEach(([o, c, f, opt = {}]) => {
    if (!(o in order)) order[o] = Object.keys(order).length;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (f(x + 0.5, y + 0.5) <= 0) {
      col[y][x] = c;
      if (!opt.detail) obj[y][x] = order[o];
    }
  });
  const out = col.map(r => r.slice());
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (obj[y][x] < 0) continue;
    const me = obj[y][x];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      const n = nx < 0 || ny < 0 || nx >= N || ny >= N ? -1 : obj[ny][nx];
      if (n === -1 || n > me) { out[y][x] = 'K'; break; }
    }
  }
  for (const [x, y] of erase) out[y][x] = '.';
  for (const [x, y, c] of px) out[y][x] = c;
  return out;
}
const pts = (s, c = 'K') => s.trim().split(/\s+/).map(p => { const [x, y] = p.split(',').map(Number); return [x, y, c]; });

const S = {};
S.apple = draw({
  layers: [
    ['leaf', 'L', ell(15.6, 5.4, 3, 1.6, -0.6)],
    ['body', 'A', U(circle(9, 14.5, 6.6), circle(15, 14.5, 6.6), circle(12, 16.5, 6.4))],
  ],
  px: [...pts('12,5 12,6 12,7 11,4'), ...pts('6,11 6,12 7,10', 'I'), ...pts('8,14 8,15 15,14 15,15 10,17 11,18 12,18 13,17')],
});
S.coffee = draw({
  layers: [
    ['handle', 'I', U(circle(18.5, 15, 3.6))],
    ['cup', 'I', rbox(10.5, 15, 7, 6.5, 1.5)],
    ['band', 'L', rbox(10.5, 19.5, 6, 1, 0), {detail: true}],
  ],
  px: [...pts('8,2 9,3 8,4 9,5 12,1 13,2 12,3 13,4'), ...pts('18,15 19,15 18,14 19,14 18,16 19,16', '.'), ...pts('8,13 8,14 13,13 13,14 9,16 10,17 11,17 12,16'), ...pts('5,10 5,11', 'W')],
});
S.cloud = draw({
  layers: [['cloud', 'W', U(circle(7, 14.5, 4.2), circle(11, 11.5, 4.6), circle(15.5, 11, 4.4), circle(18.5, 14.5, 3.8), rbox(12.5, 16.2, 9, 2.8, 2.5))]],
  px: [...pts('9,13 9,14 15,13 15,14 11,15 12,16 13,15'), ...pts('7,15 16,15', 'A')],
});
S.rabbit = draw({
  layers: [
    ['ear1', 'I', ell(8.5, 6.5, 2.4, 5.6, -0.12)], ['ear1', 'A', ell(8.5, 7.2, 0.9, 3.6, -0.12), {detail: true}],
    ['ear2', 'I', ell(15.5, 6.5, 2.4, 5.6, 0.12)], ['ear2', 'A', ell(15.5, 7.2, 0.9, 3.6, 0.12), {detail: true}],
    ['head', 'I', ell(12, 16, 8.2, 6.6)],
  ],
  px: [...pts('8,15 8,16 15,15 15,16 11,18 12,18'), ...pts('6,17 17,17', 'A'), ...pts('11,17 12,17', 'A')],
});

/* 표현 세 가지: 색 / 잉크 선만 / 잉크 + 점묘 */
const variants = {
  color: g => g,
  line: g => g.map(r => r.map(c => (c === 'K' ? 'K' : '.'))),
  sticker: g => g.map((r, y) => r.map((c, x) => {
    if (c !== '.') return c;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = (g[y + dy] || [])[x + dx]; if (v && v !== '.') return 'W'; }
    return '.';
  })),
};
const toSvg = (g, size) => {
  let rects = '';
  g.forEach((r, y) => r.forEach((c, x) => { if (c !== '.') rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${PAL[c]}"/>`; }));
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" shape-rendering="crispEdges">${rects}</svg>`;
};
module.exports = {S, variants, toSvg, PAL, draw, pts, circle, ell, rbox, poly, U, N};
if (require.main === module) {
  let h = '<body style="margin:0;background:#e4ebe5;font:14px sans-serif;padding:12px">';
  for (const [vn, vf] of Object.entries(variants)) {
    h += `<div style="margin:10px 0 4px">${vn}</div><div style="display:flex;gap:14px;align-items:flex-end">`;
    for (const [id, g] of Object.entries(S)) {
      const v = vf(g);
      h += `<div style="text-align:center"><div style="background:#FEF1D1;padding:8px">${toSvg(v, 144)}</div><div style="display:flex;gap:6px;justify-content:center;margin-top:4px"><span style="background:#C7DE94;outline:3px solid #06261C;outline-offset:-3px;padding:5px">${toSvg(v, 30)}</span><span style="background:#AFE1CB;padding:6px">${toSvg(v, 48)}</span></div>${id}</div>`;
    }
    h += '</div>';
  }
  fs.writeFileSync(`${process.argv[2] || '.'}/preview2.html`, h);
}
