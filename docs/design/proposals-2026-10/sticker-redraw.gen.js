// 다시 그리기 10종 생성기(2026-10-08): 품질 점검에서 「다시 그리기」로 나온 기본·운동·간식 스티커.
// 동물 얼굴 생성기(animal-faces.gen.js)의 그리는 부분을 그대로 쓴다 — 모양(regions)을 잡으면
// 윤곽 한 칸·그림자·하이라이트는 자동. 선만 있는 그림 대신 면을 채우고, 떠 있는 점은 없앤다.
// 사용: node sticker-redraw.gen.js <출력 json> [미리보기 png]
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {Buffer} = require('buffer');
const {ell, poly, rect, build, lint, sheet} = require('./animal-faces.gen.js');

// 굵은 선분: 선분까지 거리가 w/2 이하인 칸.
const seg = (x1, y1, x2, y2, w) => (x, y) => {
  const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - x1 - t * dx, y - y1 - t * dy) <= w / 2;
};
const box = (x0, y0, x1, y1) => (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
const ring = (outer, inner) => (x, y) => outer(x, y) && !inner(x, y);
const or = (...fs) => (x, y) => fs.some(f => f(x, y));

// 자전거: 바퀴(윤곽·타이어·안쪽 윤곽)와 빨간 2칸 뼈대를 칸에 직접 찍는다.
function bikeGrid() {
  const g = Array.from({length: 24}, () => Array(24).fill('.'));
  const put = (f, ch, only) => { for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) if (f(x + 0.5, y + 0.5) && (!only || only.includes(g[y][x]))) g[y][x] = ch; };
  for (const cx of [6, 18]) {
    const d = (x, y) => Math.hypot(x - cx, y - 16.5);
    put((x, y) => d(x, y) <= 5.2, 'O'); put((x, y) => d(x, y) <= 4.2, 't'); put((x, y) => d(x, y) <= 3, 'O'); put((x, y) => d(x, y) <= 2.1, '.'); put((x, y) => d(x, y) <= 0.8, 'O');
  }
  const frame = or(seg(6, 16.5, 11.5, 16.5, 1.6), seg(11.5, 16.5, 9.5, 9.5, 1.6), seg(9.5, 10, 16.5, 10, 1.6), seg(16.5, 10, 11.5, 16.5, 1.6), seg(16.5, 8.5, 18, 16.5, 1.6), seg(9.5, 10, 6, 16.5, 1.6));
  put(frame, 'f', ['.', 'O']);
  put(box(6, 6, 12, 9), 'O'); put(box(7, 7, 11, 8), 's');
  put(box(15, 5, 21, 8), 'O'); put(box(16, 6, 20, 7), 'k');
  return g.map(r => r.join(''));
}

// 줄넘기: 굵은 손잡이 둘(윤곽 있음)에 가는 2칸 빨간 줄을 U자로 늘어뜨린다. 줄까지 굵으면 말굽자석처럼 보인다.
function jumpropeGrid() {
  const g = Array.from({length: 24}, () => Array(24).fill('.'));
  const put = (f, ch) => { for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) if (f(x + 0.5, y + 0.5) || f(24 - x - 0.5, y + 0.5)) g[y][x] = ch; };
  put((x, y) => y > 9.6 && ring(ell(12, 9.6, 7.6, 12, 2.6), ell(12, 9.6, 5.6, 10, 2.6))(x, y), 'f');
  put(box(3, 1, 7, 11), 'O'); put(box(4, 2, 6, 10), 'a'); put(box(4, 2, 6, 4), 'g'); put(box(4, 8, 6, 10), 'g');
  return g.map(r => r.join(''));
}

// 다른 곳에서 만든 24×24 PNG(운동 v3, 2026-10-08 사용자 선택)를 그대로 옮긴다: 색마다 같은 줄에 이어진 칸을 묶는다.
// 그림자·하이라이트는 PNG에 이미 있으니 손대지 않는다. 반투명 칸은 알파 128 이상만 칸으로 친다.
function readPng(file) {
  const b = fs.readFileSync(file); let p = 8, w, h, idat = [];
  while (p < b.length) { const len = b.readUInt32BE(p), type = b.toString('latin1', p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); if (d[8] !== 8 || d[9] !== 6) throw new Error(`${file}: 8비트 RGBA만`); }
    if (type === 'IDAT') idat.push(d); p += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), st = w * 4, out = Buffer.alloc(st * h);
  for (let y = 0; y < h; y++) { const f = raw[y * (st + 1)];
    for (let x = 0; x < st; x++) { const v = raw[y * (st + 1) + 1 + x], a = x >= 4 ? out[y * st + x - 4] : 0, up = y ? out[(y - 1) * st + x] : 0, c = x >= 4 && y ? out[(y - 1) * st + x - 4] : 0;
      const pa = Math.abs(up - c), pb = Math.abs(a - c), pc = Math.abs(a + up - 2 * c);
      out[y * st + x] = (v + [0, a, up, (a + up) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? up : c][f]) & 255; } }
  return {w, h, px: out};
}
// fix: {pal: {글자: 색}, rows: {줄: '24글자'}} — 받은 그림에서 그 줄만 바꿔 쓴다(원본 PNG는 그대로 둔다).
function fromPng(theme, id, name, file, fix) {
  const {w, h, px} = readPng(path.join(path.dirname(module.filename), file)); if (w !== 24 || h !== 24) throw new Error(`${file}: 24칸 아님`);
  if (fix) for (const [y, row] of Object.entries(fix.rows)) {
    if (row.length !== 24) throw new Error(`${id}: ${y}줄 길이 ${row.length}`);
    [...row].forEach((ch, x) => { const i = (+y * 24 + x) * 4; if (ch === '.') { px[i + 3] = 0; return; }
      const c = ch === 'O' ? '#1e1a2e' : fix.pal[ch]; if (!c) throw new Error(`${id}: 색 없는 글자 ${ch}`);
      [1, 3, 5].forEach((k, j) => { px[i + j] = parseInt(c.slice(k, k + 2), 16); }); px[i + 3] = 255; });
  }
  const by = new Map(), grid = []; let partial = 0;
  for (let y = 0; y < 24; y++) { let row = '';
    for (let x = 0; x < 24; x++) { const i = (y * 24 + x) * 4, al = px[i + 3]; if (al > 0 && al < 255) partial++;
      if (al < 128) { row += '.'; continue; } row += '#';
      const c = '#' + [0, 1, 2].map(k => px[i + k].toString(16).padStart(2, '0')).join('').toUpperCase();
      if (!by.has(c)) by.set(c, new Set()); by.get(c).add(y * 24 + x); }
    grid.push(row); }
  if (partial) console.warn(`${id}: 반투명 칸 ${partial}`);
  const layers = [...by].map(([color, set]) => { let d = '';
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) { if (!set.has(y * 24 + x) || (x > 0 && set.has(y * 24 + x - 1))) continue;
      let n = 1; while (x + n < 24 && set.has(y * 24 + x + n)) n++; d += `M${x} ${y}h${n}v1h-${n}Z`; }
    return {color, d}; }).sort((p, q) => q.d.length - p.d.length);
  return {theme, id, base: id, name, layers, grid, source: file};
}

// 케이크 조각: 앞 옆면은 4칸마다 1칸씩 올라가고, 모든 세로줄이 같은 층(윤곽 · 크림 2 · 빵 2 · 잼 1 · 빵 2 · 윤곽)을 가진다.
// 윗면은 분홍 삼각형(왼쪽 끝 → 뒤 꼭짓점 → 오른쪽 끝), 꼭짓점 위에 딸기.
function cakeGrid() {
  const g = Array.from({length: 24}, () => Array(24).fill('.'));
  const LAYER = 'OmmaajaaO';
  for (let x = 1; x <= 22; x++) {
    const te = 13 - Math.floor(Math.max(0, x - 2) / 4);
    for (let k = 0; k < LAYER.length; k++) g[te + k][x] = x === 1 || x === 22 ? 'O' : LAYER[k];
    const tb = x <= 12 ? 13 - Math.round((x - 1) * 8 / 11) : 5 + Math.round((x - 12) * 4 / 10);
    for (let y = tb; y < te; y++) g[y][x] = y === tb || x === 22 ? 'O' : 'k';
    if (x > 1) { const prev = x - 1 <= 12 ? 13 - Math.round((x - 2) * 8 / 11) : 5 + Math.round((x - 13) * 4 / 10); for (let y = Math.min(tb, prev); y <= Math.max(tb, prev); y++) if (g[y][x] === 'k' || g[y][x] === '.') g[y][x] = 'O'; }
  }
  const berry = ['..lll..', '.OrrrO.', 'OrwrrrO', 'OrrrrrO', '.OrrrO.', '..OOO..'];
  berry.forEach((r, dy) => [...r].forEach((ch, dx) => { if (ch !== '.') g[1 + dy][12 + dx] = ch; }));
  return g.map(r => r.join(''));
}

// 지금 그림을 그대로 가져와 줄만 빼고 옮긴다(손보기: 여백만 문제인 그림). drop = 뺄 줄 번호, top = 위에 띄울 칸.
function fromSource(theme, id, name, {drop = [], top = 0}) {
  const src = require('../../../src/stickers/color/source/sticker-packs-24.json').stickers.find(s => s.theme === theme && s.id === id);
  const cells = Array.from({length: 24}, () => Array(24).fill(null));
  for (const l of src.layers) for (const m of l.d.matchAll(/M(\d+) (\d+)h(\d+)/g)) for (let k = 0; k < +m[3]; k++) cells[+m[2]][+m[1] + k] = l.color;
  const kept = cells.filter((_, y) => !drop.includes(y));
  const rows = [...Array(top).fill(Array(24).fill(null)), ...kept]; while (rows.length < 24) rows.push(Array(24).fill(null));
  const by = new Map();
  rows.forEach((r, y) => r.forEach((c, x) => { if (c) { if (!by.has(c)) by.set(c, new Set()); by.get(c).add(y * 24 + x); } }));
  const layers = [...by].map(([color, set]) => { let d = '';
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) { if (!set.has(y * 24 + x) || (x > 0 && set.has(y * 24 + x - 1))) continue;
      let n = 1; while (x + n < 24 && set.has(y * 24 + x + n)) n++; d += `M${x} ${y}h${n}v1h-${n}Z`; }
    return {color, d}; });
  return {theme, id, base: id, name, layers, grid: rows.map(r => r.map(c => c ? '#' : '.').join(''))};
}

const STICKERS = [
  {theme: 'free', id: 'sprout', name: '새싹', pal: {a: '#f2d58c', l: '#7dbe5a', s: '#4e8a3e', p: '#f58a8a'},
   regions: [['l', poly([[11.6, 8.2], [8.6, 3.4], [3.4, 2.2], [3.2, 5.4], [7, 8.6]])], ['s', box(10, 5, 12, 10)], ['a', ell(12, 15.6, 8.8, 6.6)]],
   paints: [],
   cells: [rect(8, 14, 2, 2), rect(6, 17, 2, 1, 'p'), rect(10, 17), rect(11, 18)]},
  {theme: 'sports', id: 'yoga', name: '요가', pal: {a: '#ffd3b0', m: '#5aa9e6', b: '#8a7ad0', t: '#f7a8b8', r: '#6b4226', p: '#f58a8a'},
   regions: [['m', box(1.6, 19.6, 22.4, 22.6)], ['r', ell(12, 2.4, 1.6, 1.3)], ['b', ell(12, 17.4, 9.6, 3.6)],
     ['t', poly([[8.4, 9.2], [15.6, 9.2], [17, 16.6], [7, 16.6]])], ['a', poly([[7.6, 9.2], [10, 10.6], [7.4, 16.8], [4, 16.8]])], ['a', ell(12, 6, 4, 3.8)]],
   paints: [['r', (x, y) => y < 4.6]],
   cells: [rect(9, 6, 2, 1), rect(9, 8, 1, 1, 'p')]},
  {theme: 'sports', id: 'swim', name: '수영', png: 'exercise-v3/swimming.png'},
  {theme: 'sports', id: 'bike', name: '자전거', mirror: false, noHl: true, pal: {t: '#4a5563', f: '#e03d36', s: '#6b4226', k: '#a9b4be'},
   grid: bikeGrid()},
  {theme: 'sports', id: 'jumprope', name: '줄넘기', noHl: true, pal: {f: '#e03d36', a: '#ffd25e', g: '#4e8a3e'},
   grid: jumpropeGrid()},
  {theme: 'sports', id: 'tennis', name: '테니스', mirror: false, pal: {f: '#e03d36', a: '#d6f0ff', n: '#9ccbe8', g: '#4a5563', y: '#d7ec5a', l: '#f2fab8'},
   regions: [['g', box(9.4, 14, 13.6, 22.4)], ['f', ell(11.5, 8.6, 7.6, 7.8)], ['a', ell(11.5, 8.6, 4.8, 5)], ['y', ell(18.5, 18, 3.7, 3.7)]],
   paints: [['n', (x, y) => [8, 11, 14].includes(Math.floor(x)) || [5, 8, 11].includes(Math.floor(y))]],
   cells: [rect(9, 14, 1, 1, 'f'), rect(10, 14, 3, 1, 'f')]},
  {theme: 'sports', id: 'stopwatch', name: '스톱워치', mirror: false, pal: {g: '#58b06a', a: '#f5e0a8', b: '#a9b4be'},
   regions: [['b', box(8.4, 1, 15.6, 4)], ['b', box(10, 3, 14, 6)], ['b', box(16.6, 3.6, 20.4, 7.4)], ['g', ell(12, 13.6, 9.2, 8.6)], ['a', ell(12, 13.6, 6.4, 5.8)]],
   paints: [],
   cells: [rect(12, 9, 1, 5), rect(13, 13, 3, 1), rect(12, 8, 1, 1, 'g'), rect(17, 13, 1, 1, 'g'), rect(12, 18, 1, 1, 'g'), rect(7, 13, 1, 1, 'g')]},
  // 운동 묶음 다시 짜기(2026-10-08 사용자 2안): 도구(물병·스톱워치·축구공·농구공) 대신 많이 하는 운동 종류.
  // 달리기·걷기: 「발이 너무 크다 · 왕발 같다」(6판 사용자) → 신발을 2~4칸 × 1줄로 줄임.
  // 달리기 팔: 「팔 구분이 제대로 안된다」(7판 사용자) → 일자로 뻗은 팔 대신 앞팔은 굽혀 올리고 뒷팔은 뒤로 내림, 몸통과 윤곽으로 나눔. 「앞 손이 두껍기만」(8판) → 앞 팔뚝 1칸.
  {theme: 'sports', id: 'run', name: '달리기', png: 'exercise-v3/running.png', fix: {pal: {b: '#fff2d2', c: '#f6a638', e: '#397795', f: '#fffaf0'}, rows: {
    6: '.........OObbbOO...OOO..',
    7: '........OOccccccO..ObO..',
    8: '.....OOOOOccccccOOOObO..',
    9: '....ObbbbOccccccObbbbO..',
    10: '....ObbbOOccccccOOOOOO..',
    11: '....ObbO.OccccccO.......',
    12: '....OOO.OOceccccOO......',
    15: '.......OOeeOOeeeeOOOO...',
    16: '......OOeeeOOOOeeeeffO..',
    17: '....OOOeeeOO..OOOOOOOO..',
    18: '...OOeeeOOO.............',
    19: '....OfffO...............',
    20: '....OOOOO...............',
    21: '........................'}}},
  {theme: 'sports', id: 'walk', name: '걷기', png: 'exercise-v3/walking.png', fix: {pal: {e: '#397795', f: '#fffaf0'}, rows: {
    19: '....OeeeO.....OeeeO.....',
    20: '...OfffOO.....OOfffO....',
    21: '...OOOOOO.....OOOOOO....',
    22: '........................'}}},
  {theme: 'sports', id: 'hike', name: '등산', mirror: false, pal: {b: '#4f7857', a: '#80b879', w: '#fffaf0', r: '#e03d36'},
   regions: [['b', poly([[1, 21.6], [6.6, 10.4], [12.6, 21.6]])], ['a', poly([[3, 21.6], [13.5, 7.4], [23.4, 21.6]])]],
   paints: [['w', (x, y) => y < 11.4 + (Math.floor(x) % 2) * 0.8]],
   cells: [rect(13, 1, 1, 7), rect(14, 1, 5, 1), rect(14, 2, 4, 2, 'r'), rect(18, 2, 1, 2), rect(14, 4, 5, 1)]},
  {theme: 'sports', id: 'pilates', name: '필라테스', png: 'exercise-v3/pilates.png'},
  {theme: 'sports', id: 'soccer', name: '축구공', png: 'exercise-v3/soccer_ball.png'},
  // 배드민턴: 「배드민턴처럼 안생겼어」(7판) → 셔틀콕. 「상단이 너무 삐쭉, 균일하게」(8판) · 「그냥 일자」(9판) → 같은 크기의 둥근 깃털 끝 4개, 깃털 줄은 같은 간격. 라켓 없는 셔틀콕만(8판 사용자).
  {theme: 'sports', id: 'badminton', name: '배드민턴', hlChar: 'c', pal: {a: '#d5dde8', n: '#7f8ea3', c: '#fff2d2', r: '#e03d36'},
   regions: [['a', (x, y) => poly([[9.2, 14.2], [3.4, 3.6], [20.6, 3.6], [14.8, 14.2]])(x, y) || [5.2, 9.4, 14.6, 18.8].some(cx => ell(cx, 3.8, 2.2, 1.8)(x, y))], ['r', box(8.4, 13.4, 15.6, 16.4)], ['c', (x, y) => y > 15.4 && ell(12, 15.6, 4.2, 5.4)(x, y)]],
   paints: [['n', (x, y) => { const hw = 3.2 + (14.2 - y) * 5.4 / 10.6, u = (x - 12) / hw; return y > 4 && [-0.62, 0, 0.62].some(k => Math.abs(u - k) < 0.1); }]],
   cells: []},
  {theme: 'snack', id: 'coffee', name: '커피', pal: {a: '#f3d9a4', c: '#7a4a2e', k: '#c89a6a', p: '#f58a8a', e: '#1e1a2e'}, grid: [
    '........................',
    '........................',
    '........................',
    '...OOOOOOOOOOOOO........',
    '..OccckkccccccccO.......',
    '..OcccccccccccccO.......',
    '..OaaaaaaaaaaaaaO.......',
    '..OaaaaaaaaaaaaaO.......',
    '..OaaaaaaaaaaaaaOOOO....',
    '..OaaaaaaaaaaaaaOaaaO...',
    '..OaaaaaaaaaaaaaOOOaaO..',
    '..OaaeeaaaaaeeaaO.OaaO..',
    '..OaaeeaaaaaeeaaO.OaaO..',
    '..OaaaaaaaaaaaaaO.OaaO..',
    '..OappaaeaeaappaOOOaaO..',
    '..OaaaaaaeaaaaaaOaaaO...',
    '..OaaaaaaaaaaaaaOOOO....',
    '..OaaaaaaaaaaaaaO.......',
    '..OaaaaaaaaaaaaaO.......',
    '...OaaaaaaaaaaaO........',
    '....OOOOOOOOOOO.........',
    '........................',
    '........................',
    '........................',
  ]},
  {theme: 'snack', id: 'bread', name: '빵', hlChar: 'm', pal: {a: '#c9873f', m: '#f6d79a'},
   regions: [['a', or(ell(7.6, 8, 5.6, 5.4), box(2.4, 8, 12, 21))]],
   paints: [['m', or(ell(7.6, 8, 3.6, 3.4), box(4.4, 8, 12, 19))]],
   cells: []},
  // 케이크: 「단면이 자글자글」(8판) · 「너무 네모」 · 「입체적인 삼각형 느낌이 사라졌다」(9판) → 위에서 비스듬히 본 조각을 칸에 직접 찍음(cakeGrid).
  {theme: 'snack', id: 'cake', name: '케이크', noHl: true, pal: {k: '#f9c3cf', m: '#f7a8b8', a: '#f6d79a', j: '#e9859e', r: '#e03d36', w: '#f58a8a', l: '#7dbe5a'},
   grid: cakeGrid()},
  // ── 손보기(2026-10-08 품질 점검). 15종을 고쳐 봤으나 「신발부터 바람까지 비행기 빼고 이전꺼가 더 나은거 같애」(12판, 사용자) → 비행기만 남기고 나머지 14종은 지금 그림 그대로.
  {theme: 'objects', id: 'airplane', name: '비행기', mirror: false, hlChar: 'f', pal: {f: '#fff2d2', b: '#76b7d8', o: '#f6a638', d: '#397795'},
   regions: [['b', poly([[7.6, 10], [14, 10], [11, 2.4], [7.4, 2.4]])], ['o', poly([[2.2, 12], [7, 12], [5.4, 4.6], [2.2, 4.6]])], ['f', or(ell(12.8, 12, 9.2, 3.8), box(3, 8.6, 9, 15.6))], ['b', poly([[7.6, 14], [14, 14], [11, 21.6], [7.4, 21.6]])]],
   paints: [], cells: [rect(14, 11, 1, 1, 'd'), rect(16, 11, 1, 1, 'd'), rect(18, 11, 1, 1, 'd')]},
];

const out = STICKERS.map(s => s.png ? fromPng(s.theme, s.id, s.name, s.png, s.fix) : s.source ? fromSource(s.theme, s.id, s.name, s.source) : build(s));
for (const s of out) console.log(s.id.padEnd(10), JSON.stringify(lint(s)));
fs.writeFileSync(process.argv[2] || 'sticker-redraw.json', JSON.stringify({stickers: out.map(({grid, ...s}) => s), lint: Object.fromEntries(out.map(s => [s.id, lint(s)]))}, null, 1));
if (process.argv[3]) sheet(out, 10, process.argv[3]);
