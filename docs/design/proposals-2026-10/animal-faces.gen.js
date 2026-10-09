// 동물 얼굴 스티커 생성기: 몸통 없이 얼굴만 24칸에 꽉 채운다(2026-10-08 시안 2안).
// 왼쪽 반(12칸)을 그리면 오른쪽은 거울로 채운다. 색은 지금 Codex 동물 색을 그대로 쓰고,
// 처음 도트 규칙(면 한 색 · 아래쪽 그림자 한 칸 · 왼쪽 위 하이라이트 · 2×2 눈 · 남색 검정 윤곽)을 따른다.
// 사용: node animal-faces.gen.js <출력 json> [미리보기 png]
const fs = require('fs');
const zlib = require('zlib');
const {Buffer} = require('buffer');
const N = 24;
const INK = '#1e1a2e';

// 모양: 얼굴·귀는 타원·다각형(regions, 뒤에서 앞으로)으로 잡고 바깥 윤곽은 자동으로 한 칸 두른다.
// 앞 모양과 맞닿은 뒤 모양 칸도 윤곽이 된다(귀와 얼굴 사이 선). paints는 면(a) 칸만 칠하고,
// cells는 왼쪽 반 좌표의 칸(눈·코·입)을 거울로 찍는다. 그림자(아래 윤곽 바로 위)·하이라이트는 자동.
// 글자: O 윤곽·눈·입 / a 면 / 나머지는 동물마다. 대문자 = 같은 소문자 색의 그림자.
const ell = (cx, cy, rx, ry, p = 2) => (x, y) => Math.abs((x - cx) / rx) ** p + Math.abs((y - cy) / ry) ** p <= 1;
const poly = pts => (x, y) => { let s = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) s = !s; } return s; };
const rect = (x, y, w = 1, h = 1, ch = 'O') => ({x, y, w, h, ch});
const ANIMALS = [
  {id: 'cat', name: '고양이', pal: {a: '#d4d8de', p: '#e9859e'},
   regions: [['a', poly([[3.5, 1], [10.5, 6.5], [3.2, 11]])], ['a', ell(12, 13.6, 9.4, 8.6)]],
   paints: [['p', poly([[4.6, 3.6], [8.6, 7], [4.6, 9]])]],
   cells: [rect(7, 12, 2, 2), rect(5, 15, 2), rect(11, 15, 1, 1, 'p'), rect(10, 16), rect(11, 17)]},
  {id: 'dog', name: '강아지', pal: {a: '#b88561', b: '#865d48', m: '#fff2d2', p: '#e9859e'},
   regions: [['a', poly([[4.2, 1.4], [10.4, 6.4], [3.6, 10.6]])], ['a', ell(12, 13.6, 9, 8.6)]],
   paints: [['b', poly([[5.2, 4], [8.6, 6.8], [5, 8.8]])], ['m', ell(12, 17.6, 4.4, 3.2)]],
   cells: [rect(7, 12, 2, 2), rect(5, 15, 2, 1, 'p'), rect(10, 15, 2), rect(11, 16), rect(10, 18), rect(11, 19)]},
  {id: 'rabbit', name: '토끼', pal: {a: '#fffaf0', p: '#e9859e'}, shade: 0.22,
   regions: [['a', ell(8, 6, 2.4, 5.6)], ['a', ell(12, 15, 9.2, 7.6)]],
   paints: [['p', ell(8, 5.6, 0.9, 3.9)]],
   cells: [rect(7, 14, 2, 2), rect(5, 17, 2, 1, 'p'), rect(11, 17, 1, 1, 'p'), rect(10, 18), rect(11, 19)]},
  {id: 'bear', name: '곰', pal: {a: '#b88561', b: '#865d48', m: '#fff2d2', p: '#e9859e'},
   regions: [['a', ell(5.6, 5.8, 3.2, 3.2)], ['a', ell(12, 13.8, 9.4, 8.4)]],
   paints: [['b', ell(5.6, 5.8, 1.4, 1.4)], ['m', ell(12, 17, 4.2, 3)]],
   cells: [rect(7, 12, 2, 2), rect(5, 15, 2, 1, 'p'), rect(10, 15, 2), rect(11, 16), rect(10, 18), rect(11, 19)]},
  {id: 'fox', name: '여우', pal: {a: '#f6a638', b: '#865d48', m: '#fff2d2'},
   regions: [['a', poly([[3.2, 1], [11, 7.5], [3, 12]])], ['a', ell(12, 14.2, 9.6, 8)]],
   paints: [['b', poly([[4.4, 3.6], [8.8, 7.6], [4.4, 9.6]])], ['m', ell(6.4, 18.6, 4.6, 3.8)], ['m', ell(12, 19.6, 4, 3.4)]],
   cells: [rect(7, 13, 2, 2), rect(11, 17), rect(10, 19), rect(11, 20)]},
  {id: 'penguin', name: '펭귄', pal: {a: '#293246', m: '#fff2d2', y: '#f6a638', p: '#e9859e'},
   regions: [['y', ell(8.6, 21.4, 2.4, 1.4)], ['a', ell(12, 11.8, 8, 10)], ['a', ell(4.2, 14.6, 1.8, 3.6)]],
   paints: [['m', ell(9.2, 9.6, 3.4, 3.6)], ['m', ell(12, 15.6, 5.4, 5.6)]],
   cells: [rect(8, 8, 2, 2), rect(6, 11, 2, 1, 'p'), rect(10, 11, 2, 1, 'y'), rect(11, 12, 1, 1, 'y')]},
  {id: 'chick', name: '병아리', pal: {a: '#f8cb61', b: '#ffe698', y: '#d17622', p: '#e9859e'}, half: [
    '............',
    '..........OO',
    '.........Oaa',
    '......OOOOaa',
    '....OOaaaaaa',
    '...Oaaaaaaaa',
    '..Oaaaaaaaaa',
    '..Oaaaaaaaaa',
    '..OaaaaOOaaa',
    '..OaaaaOOaaa',
    '.OObbaaaaayy',
    '.Obbbbpaaaay',
    '.Obbbbbaaaaa',
    '.Obbbbbaaaaa',
    '.OObbbaaaaaa',
    '..OOaaaaaaaa',
    '...OOaaaaaaa',
    '.....OOOOOOO',
    '......OyyyO.',
    '......OOOOO.',
  ]},
  {id: 'frog', name: '개구리', pal: {a: '#80b879', w: '#fffaf0', p: '#e9859e'},
   regions: [['a', ell(7, 7.6, 3.9, 3.9)], ['a', ell(12, 15, 10, 7.2)]], merge: true,
   paints: [['w', ell(7, 7.6, 2.4, 2.4)]],
   cells: [rect(6, 7, 2, 2), rect(4, 15, 2, 1, 'p'), rect(7, 16), rect(8, 17, 4)]},
  {id: 'turtle', name: '거북이', mirror: false, pal: {a: '#80b879', b: '#4f7857', c: '#b9d993', r: '#e3c36b', p: '#e9859e'},
   regions: [
     ['c', poly([[1.2, 13.2], [4.6, 11.4], [4.6, 14.6]])],
     ['c', poly([[3.6, 12], [8.6, 12], [8.6, 19.6], [3.6, 19.6]])], ['c', poly([[12.4, 12], [17.4, 12], [17.4, 19.6], [12.4, 19.6]])],
     ['a', (x, y) => y < 15 && ell(10.4, 15, 8.6, 10.6)(x, y)],
     ['c', ell(19.2, 10.6, 3.4, 3.2)]],
   paints: [
     ['r', (x, y) => Math.floor(y) === 13],
     ['b', (x, y) => Math.floor(y) === 10 && x > 3 && x < 18],
     ['b', (x, y) => (Math.floor(x) === 7 || Math.floor(x) === 13) && y > 6 && y < 10],
     ['b', (x, y) => Math.floor(y) === 6 && x > 7 && x < 14]],
   cells: [rect(18, 9, 2, 2), rect(17, 11, 1, 1, 'p'), rect(20, 11)]},
  {id: 'whale', name: '고래', pal: {b: '#76b7d8', a: '#b9e1e9', w: '#b9e1e9', p: '#e9859e'}, hlChar: 'b', grid: [
    '........................',
    '........................',
    '......OO....OO..........',
    '.....OwwO..OwwO.........',
    '......OwwOOwwO..OO..OO..',
    '.......OwwwwO..ObbOObbO.',
    '........OwwO....ObbbbbO.',
    '....OOOOOwwOOOO..ObbbO..',
    '...ObbbbbbbbbbbOO.ObO...',
    '..ObbbbbbbbbbbbbbOObO...',
    '.ObbbbbbbbbbbbbbbbbbO...',
    '.ObbbbOObbbbbbbbbbbO....',
    '.ObbbbOObbbbbbbbbbbO....',
    '.ObppbbbbbbbbbbbbbbO....',
    '.OaaaaOaaOaaaaaaaaaO....',
    '.OaaaaaOOaaaaaaaaaaO....',
    '..OaaaaaaaaaaaaaaaO.....',
    '...OOaaaaaaaaaaaaOO.....',
    '.....OOOOOOOOOOOO.......',
    '........................',
  ]},
];

const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const toHex = v => '#' + v.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
const mix = (c, t, k) => toHex(hex(c).map((x, i) => x + (t[i] - x) * k));
const shadeOf = (c, k = 0.25) => mix(c, [30, 26, 46], k);
const lightOf = c => mix(c, [255, 255, 255], 0.55);

// 타원 끝에 한두 칸만 튀어나온 꼭지를 깎는다: 맨 위·아래 줄(맨 왼쪽·오른쪽 열)이 2칸 이하인데
// 바로 안쪽 줄이 4칸 이상 더 넓으면 지운다.
function trimNubs(m) {
  const T = a => a[0].map((_, i) => a.map(r => r[i]));
  const pass = rows => {
    const cnt = rows.map(r => r.filter(Boolean).length), idx = cnt.map((c, i) => c ? i : -1).filter(i => i >= 0);
    if (idx.length < 3) return;
    for (const [e, inner] of [[idx[0], idx[0] + 1], [idx[idx.length - 1], idx[idx.length - 1] - 1]])
      if (cnt[e] <= 2 && cnt[inner] >= cnt[e] + 4) rows[e].fill(false);
  };
  pass(m);
  const t = T(m); pass(t);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) m[y][x] = t[x][y];
}

function build(an) {
  const own = Array.from({length: N}, () => Array(N).fill(-1));
  const M = an.mirror !== false;
  if (an.half) return finish(an, halfGrid(an));
  if (an.grid) return finish(an, an.grid.map(r => { if (r.length !== N) throw new Error(`${an.id}: 줄 길이 ${r.length}`); return r.split(''); }).concat(Array.from({length: N - an.grid.length}, () => Array(N).fill('.'))));
  an.regions.forEach(([, f], k) => {
    const m = Array.from({length: N}, (_, y) => Array.from({length: N}, (_, x) => f(x + 0.5, y + 0.5) || (M && f(N - x - 0.5, y + 0.5))));
    trimNubs(m);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (m[y][x]) own[y][x] = an.merge ? 0 : k;
  });
  const g = Array.from({length: N}, () => Array(N).fill('.'));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const k = own[y][x]; if (k < 0) continue;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const nx = x + dx, ny = y + dy; const n = nx < 0 || ny < 0 || nx >= N || ny >= N ? -1 : own[ny][nx]; return n === -1 || n > k; });
    g[y][x] = edge ? 'O' : an.regions[k][0];
  }
  for (const [ch, f, on = 'a'] of an.paints) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] === on && (f(x + 0.5, y + 0.5) || (M && f(N - x - 0.5, y + 0.5)))) g[y][x] = ch;
  for (const c of an.cells) for (let y = c.y; y < c.y + c.h; y++) for (let x = c.x; x < c.x + c.w; x++) { g[y][x] = c.ch; if (M) g[y][N - 1 - x] = c.ch; }
  return finish(an, g);
}

// 왼쪽 반 글자 그림(half)을 거울로 채워 가운데에 놓는다.
function halfGrid(an) {
  const rows = an.half.map(r => { if (r.length !== 12) throw new Error(`${an.id}: 줄 길이 ${r.length}`); return r + [...r].reverse().join(''); });
  const top = Math.floor((N - rows.length) / 2);
  return Array.from({length: N}, (_, y) => (rows[y - top] || '.'.repeat(N)).split(''));
}

function finish(an, g) {
  const M = an.mirror !== false, cells = an.cells || [];
  // 그림자: 아래쪽 절반에서 바로 아래가 윤곽인 칸.
  for (let y = N - 2; y >= 12; y--) for (let x = 0; x < N; x++) { const ch = g[y][x]; if (/[a-z]/.test(ch) && ch !== 'h' && g[y + 1][x] === 'O' && an.pal[ch] && !cells.some(c => x >= c.x && x < c.x + c.w || M && N - 1 - x >= c.x && N - 1 - x < c.x + c.w ? y >= c.y && y < c.y + c.h : false)) g[y][x] = ch.toUpperCase(); }
  // 하이라이트: 왼쪽 위에서 처음 만나는, 위·왼쪽·오른쪽·아래가 모두 같은 면인 칸 + 오른쪽 + 아래.
  const hc = an.hlChar || 'a'; let best = null;
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < 12; x++) if ([[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]].every(([dx, dy]) => g[y + dy][x + dx] === hc) && (!best || x + y < best[0] + best[1])) best = [x, y];
  if (!best && !an.noHl) console.warn(`${an.id}: 하이라이트 자리 없음`);
  if (best) for (const [x, y] of [[best[0], best[1]], [best[0] + 1, best[1]], [best[0], best[1] + 1]]) g[y][x] = 'h';
  const color = ch => {
    if (ch === 'O') return INK;
    if (ch === 'h') return lightOf(an.pal[hc]);
    if (ch >= 'A' && ch <= 'Z') return shadeOf(an.pal[ch.toLowerCase()], an.shade);
    if (!an.pal[ch]) throw new Error(`${an.id}: 색 없는 글자 ${ch}`);
    return an.pal[ch];
  };
  const byColor = new Map();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const ch = g[y][x]; if (ch === '.') continue;
    const c = color(ch);
    if (!byColor.has(c)) byColor.set(c, []);
    byColor.get(c).push([x, y]);
  }
  // 같은 줄에 이어진 칸을 한 사각형으로 묶는다(기존 데이터와 같은 path 모양).
  const layers = [...byColor].map(([c, cells]) => {
    const set = new Set(cells.map(([x, y]) => y * N + x)); let d = '';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (!set.has(y * N + x) || (x > 0 && set.has(y * N + x - 1))) continue;
      let w = 1; while (x + w < N && set.has(y * N + x + w)) w++;
      d += `M${x} ${y}h${w}v1h-${w}Z`;
    }
    return {color: c, d};
  });
  layers.sort((p, q) => (q.color === INK) - (p.color === INK));
  return {theme: an.theme || 'animals', id: an.id, base: an.base || an.id, name: an.name, layers, grid: g.map(r => r.join(''))};
}

// 품질 점검과 같은 자동 검사: 여백 · 떠 있는 칸 · 밝은 면.
function lint(s) {
  const cells = [];
  s.grid.forEach((r, y) => [...r].forEach((ch, x) => ch !== '.' && cells.push([x, y])));
  const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
  const margin = Math.min(Math.min(...xs), Math.min(...ys), N - 1 - Math.max(...xs), N - 1 - Math.max(...ys));
  const key = ([x, y]) => y * N + x, filled = new Set(cells.map(key)), seen = new Set([key(cells[0])]), q = [cells[0]];
  while (q.length) {
    const [x, y] = q.pop();
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const nx = x + dx, k = key([nx, y + dy]);
      if (nx >= 0 && nx < N && filled.has(k) && !seen.has(k)) { seen.add(k); q.push([nx, y + dy]); }
    }
  }
  let light = 0, fill = 0;
  for (const l of s.layers) {
    if (l.color === INK) continue;
    const n = (l.d.match(/h(\d+)/g) || []).reduce((a, m) => a + +m.slice(1), 0);
    const [r, g, b] = hex(l.color);
    fill += n; if (0.2126 * r + 0.7152 * g + 0.0722 * b > 225) light += n;
  }
  return {margin, floating: cells.length - seen.size, lightFill: +(light / fill).toFixed(2)};
}

// 아주 작은 PNG 인코더(미리보기용).
function png(w, h, rgba) {
  const crcT = Array.from({length: 256}, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function sheet(list, scale, file) {
  const pad = 8, cell = N * scale + pad, w = cell * list.length + pad, h = cell + pad;
  const buf = Buffer.alloc(w * h * 4);
  const put = (x, y, [r, g, b]) => { const i = (y * w + x) * 4; buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) put(x, y, hex('#fbf3dc'));
  list.forEach((s, i) => {
    const color = {};
    for (const l of s.layers) for (const m of l.d.matchAll(/M(\d+) (\d+)h(\d+)/g)) for (let k = 0; k < +m[3]; k++) color[`${+m[1] + k},${m[2]}`] = l.color;
    for (const [k, c] of Object.entries(color)) {
      const [cx, cy] = k.split(',').map(Number);
      for (let yy = 0; yy < scale; yy++) for (let xx = 0; xx < scale; xx++) put(pad + i * cell + cx * scale + xx, pad + cy * scale + yy, hex(c));
    }
  });
  fs.writeFileSync(file, png(w, h, buf));
}

module.exports = {N, INK, ell, poly, rect, build, lint, sheet, shadeOf, lightOf, mix};
if (require.main === module) {

const out = ANIMALS.map(build);
for (const s of out) console.log(s.id.padEnd(8), JSON.stringify(lint(s)));
fs.writeFileSync(process.argv[2] || 'animal-faces.json', JSON.stringify({stickers: out.map(({grid, ...s}) => s), lint: Object.fromEntries(out.map(s => [s.id, lint(s)]))}, null, 1));
if (process.argv[3]) sheet(out, 8, process.argv[3]);
}
