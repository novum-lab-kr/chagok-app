// 새 화풍(참고 하트 규칙)으로 그린 무료 6종 + 팩 후보 전체.
// node packs.js <dir> → packs.json(색별 path), packs.html(확인용)
const fs = require('fs');
const G = require('./sticker-shaded.gen.js');
const {draw, face, px, MAT, OUT, circle, ell, rbox, poly, U, SUB} = G;
Object.assign(MAT, {
  gray: {b: '#A9B4BE', s: '#6F7C88', l: '#E3E9EE'},
  dark: {b: '#4A5563', s: '#2E3640', l: '#7C8896'},
  blue: {b: '#5AA9E6', s: '#3478B5', l: '#BFE3FF'},
  sky: {b: '#D6F0FF', s: '#9CCBE8', l: '#FFFFFF'},
  orange: {b: '#F28C38', s: '#B85A1E', l: '#FFD09A'},
  navy: {b: '#3D4B6E', s: '#273250', l: '#6E7FA8'},
  wood: {b: '#E6B470', s: '#B07F3E', l: '#FFE2B0'},
  purple: {b: '#B49BE0', s: '#8068B8', l: '#E4D8FF'},
  green: {b: '#58B06A', s: '#357A45', l: '#A8E0B0'},
});
MAT.skin = {b: '#FFD3B0', s: '#E8A27E', l: '#FFF0E2'};
const cap = (ax, ay, bx, by, r) => (x, y) => { const px_ = x - ax, py = y - ay, vx = bx - ax, vy = by - ay; const h = Math.max(0, Math.min(1, (px_ * vx + py * vy) / (vx * vx + vy * vy || 1))); return Math.hypot(px_ - vx * h, py - vy * h) - r; };
const waveRow = (y, x0, x1, amp = 1, per = 6) => { const out = []; for (let x = x0; x <= x1; x++) { const yy = Math.round(y + amp * Math.sin((x - x0) / per * 2 * Math.PI)); out.push([x, yy, MAT.blue.b], [x, yy + 1, MAT.blue.s]); } return out; };
const rot = (f, a, cx, cy) => (x, y) => { const c = Math.cos(-a), s = Math.sin(-a), dx = x - cx, dy = y - cy; return f(cx + dx * c - dy * s, cy + dx * s + dy * c); };
const P = (str) => str.trim().split(/\s+/).map(p => p.split(',').map(Number));
const W = '#FFFFFF', E = OUT;
const cloudShape = (dx = 0, dy = 0) => U(circle(7.2 + dx, 14.4 + dy, 4.2), circle(11.4 + dx, 11.2 + dy, 4.8), circle(15.8 + dx, 11.6 + dy, 4.3), circle(18.4 + dx, 15 + dy, 3.6), rbox(12.6 + dx, 16.2 + dy, 9, 2.8, 2.4));
const rays = () => U(...[0, 1, 2, 3, 4, 5, 6, 7].map(k => rot(rbox(12, 2.6, 1.9, 2.1, 0.8), k * Math.PI / 4 + Math.PI / 8, 12, 12)));

const THEMES = [
  {id: 'free', name: '무료 6종 (지금 있는 것)'},
  {id: 'fit', name: '운동·건강'}, {id: 'study', name: '공부·일'}, {id: 'life', name: '생활·마음'},
  {id: 'season', name: '계절·날씨'}, {id: 'animal', name: '동물 친구'},
];
const S = [];
const add = (theme, id, name, grid) => S.push({theme, id, name, grid});

/* ── 무료 6종 ── */
add('free', 'sprout', '새싹', draw([
  {mat: 'leaf', shape: ell(7.8, 5.4, 3.8, 2.1, 0.45), hl: P('6,4')}, {mat: 'leaf', shape: ell(16.2, 5.4, 3.8, 2.1, -0.45), hl: P('15,4')},
  {mat: 'cream', shape: ell(12, 15.4, 7.6, 6.8), hl: P('7,11 6,12 7,12')},
], [...px('11,7 11,8', E), ...face(12, 14, 3.5, {spark: W, blush: true})]));
add('free', 'shoe', '운동화', draw([
  {mat: 'apricot', shape: poly([[2.5, 9], [9, 8], [12, 11], [18, 12.5], [21.5, 14.5], [21.5, 17], [2.5, 17]]), hl: P('4,10 4,11')},
  {mat: 'cream', shape: rbox(12, 18.2, 10, 1.9, 0.9)},
], px('8,11 10,12 12,13', W).concat(px('9,11 11,12 13,13', E))));
add('free', 'book', '책', draw([
  {mat: 'apricot', shape: rbox(12, 14.2, 11, 6.6, 1)},
  {mat: 'cream', shape: poly([[1.5, 6.5], [11.5, 8], [11.5, 19], [1.5, 18]]), hl: P('3,8')},
  {mat: 'cream', shape: poly([[12.5, 8], [22.5, 6.5], [22.5, 18], [12.5, 19]])},
], px('4,11 5,11 6,11 7,11 8,11 4,14 5,14 6,14 7,14 15,11 16,11 17,11 18,11 19,11 15,14 16,14 17,14 18,14', '#B8A898')));
{
  const petals = [0, 1, 2, 3, 4].map(k => { const t = -Math.PI / 2 + k * 2 * Math.PI / 5; return circle(12 + 4.8 * Math.cos(t), 9.6 + 4.8 * Math.sin(t), 3.7); });
  add('free', 'flower', '꽃', draw([
    {mat: 'leaf', shape: ell(7.6, 19.2, 3.6, 1.8, -0.5)}, {mat: 'leaf', shape: ell(16.4, 19.2, 3.6, 1.8, 0.5)},
    {mat: 'pink', shape: U(...petals), hl: P('8,4 7,5')},
    {mat: 'yellow', shape: circle(12, 9.6, 3.2)},
  ], [...px('12,15 12,16 12,17 12,18 12,19 12,20 12,21', E), ...px('11,9 13,9', E)]));
}
{
  const star = (cx, cy, R, r) => poly(Array.from({length: 10}, (_, i) => { const t = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; return [cx + rr * Math.cos(t), cy + rr * Math.sin(t)]; }));
  add('free', 'star', '별', draw([{mat: 'yellow', shape: star(12, 13, 11.2, 5.4), hl: P('11,5 11,6')}], face(12, 12, 3, {spark: W, blush: true})));
}
add('free', 'cat', '고양이', draw([
  {mat: 'orange', shape: ell(20, 13, 2.2, 5.4, 0.3)},
  {mat: 'orange', shape: U(ell(11, 14, 8.6, 6.8), poly([[3.4, 10], [4.4, 3], [9.4, 7.6]]), poly([[18.6, 10], [17.6, 3], [12.6, 7.6]])), hl: P('5,7 5,8')},
], [...px('5,6 17,6', MAT.pink.b), ...face(11, 13, 3.5, {spark: W, blush: true})]));

/* ── 운동·건강 ── */
add('fit', 'dumbbell', '덤벨', draw([
  {mat: 'dark', shape: rbox(12, 12, 8, 1.5), flat: true},
  {mat: 'gray', shape: rbox(6, 12, 2.4, 6.5, 1), hl: P('5,7 5,8')}, {mat: 'gray', shape: rbox(18, 12, 2.4, 6.5, 1), hl: P('17,7 17,8')},
  {mat: 'gray', shape: rbox(2.6, 12, 1.6, 4, 0.8)}, {mat: 'gray', shape: rbox(21.4, 12, 1.6, 4, 0.8)},
]));
add('fit', 'yoga', '요가', draw([
  {mat: 'blue', shape: U(ell(12, 18.6, 9.6, 2.8), ell(12, 17, 5, 2.4))},
  {mat: 'pink', shape: poly([[8.6, 9.6], [15.4, 9.6], [16.6, 16.4], [7.4, 16.4]]), hl: P('9,11 9,12')},
  {mat: 'skin', shape: U(cap(8.2, 10.6, 4.8, 16.4, 1.8), cap(15.8, 10.6, 19.2, 16.4, 1.8))},
  {mat: 'skin', shape: circle(4.8, 17.4, 1.5)}, {mat: 'skin', shape: circle(19.2, 17.4, 1.5)},
  {mat: 'brown', shape: circle(12, 2.2, 1.9)},
  {mat: 'skin', shape: circle(12, 5.8, 3.3), hl: P('10,4')},
], [...px('10,6 11,6 13,6 14,6', E), ...px('10,7 14,7', MAT.pink.b), ...px('2,22 3,22 4,22 5,22 6,22 7,22 8,22 9,22 10,22 11,22 12,22 13,22 14,22 15,22 16,22 17,22 18,22 19,22 20,22 21,22', E)]));
add('fit', 'water', '물컵', draw([
  {mat: 'sky', shape: poly([[5, 4], [19, 4], [17.4, 21], [6.6, 21]]), hl: P('7,6 7,7 7,8 7,9')},
  {mat: 'blue', shape: poly([[6.2, 11], [17.8, 11], [17.1, 19.8], [6.9, 19.8]]), hl: P('8,13 8,14')},
], face(12, 14, 3, {spark: W})));
add('fit', 'bike', '자전거', draw([
  {mat: 'dark', shape: SUB(circle(5.8, 15.5, 4.8), circle(5.8, 15.5, 2.6))}, {mat: 'dark', shape: SUB(circle(18.2, 15.5, 4.8), circle(18.2, 15.5, 2.6))},
], [...px('5,15 6,15 18,15 19,15', E),
  ...px('6,14 7,13 8,12 9,11 10,11 11,11 12,11 13,11 14,11 15,11 9,12 10,13 11,14 12,15 13,14 14,13 15,12 16,12 17,13 17,14 16,10 16,9 15,8 16,8 17,8 8,10 8,9', MAT.red.b),
  ...px('7,9 9,9', E)]));
add('fit', 'swim', '수영', draw([
  {mat: 'skin', shape: U(cap(5, 16.2, 8.6, 5, 1.8), cap(8.6, 5, 15.6, 5, 1.8), cap(15.6, 5, 14.2, 7.6, 1.8))},
  {mat: 'skin', shape: circle(18, 12, 4), hl: P('16,13')},
  {mat: 'red', shape: (x, y) => Math.max(circle(18, 12, 4)(x, y), y - 11.4), hl: P('16,9 17,9')},
], [...px('19,12 20,12', E), ...px('18,14 19,14', MAT.pink.b), ...px('1,7 2,7 3,7 4,7 0,10 1,10 2,10 3,10 4,10 1,13 2,13 3,13', MAT.blue.s),
  ...waveRow(16.8, 0, 23, 1, 6), ...waveRow(20.6, 1, 22, 1, 6)]));
add('fit', 'apple', '사과', G.S.apple);

/* ── 공부·일 ── */
{
  // 참고(사용자 PixelLab 연필): 왼쪽 아래 심 → 오른쪽 위 지우개, 몸통 면 세 줄, 쇠테 홈 두 줄
  const A = -Math.PI / 4, c = (f) => rot(f, A, 12, 12);
  const local = (x, y) => { const ca = Math.cos(-A), sa = Math.sin(-A), dx = x - 12, dy = y - 12; return [12 + dx * ca - dy * sa, 12 + dx * sa + dy * ca]; };
  const g = draw([
    {mat: 'wood', shape: c(poly([[7.4, 8.6], [7.4, 15.4], [0.6, 12]]))},
    {mat: 'orange', shape: c(rbox(13.8, 12, 6.6, 3.4))},
    {mat: 'gray', shape: c(rbox(22, 12, 1.8, 3.4))},
    {mat: 'pink', shape: c(rbox(25.4, 12, 1.8, 3.4, 1.2))},
  ]);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    const col = g[y][x]; if (!col || col === OUT) continue;
    const [u, v] = local(x + 0.5, y + 0.5);
    if (col === MAT.orange.b || col === MAT.orange.s) g[y][x] = v < 10.9 ? MAT.yellow.b : v > 13.1 ? MAT.orange.s : MAT.orange.b;
    if (col === MAT.gray.b || col === MAT.gray.s) g[y][x] = (Math.abs(u - 21.4) < 0.5 || Math.abs(u - 22.8) < 0.5) ? MAT.gray.s : v < 11 ? MAT.gray.l : MAT.gray.b;
    if (col === MAT.wood.b || col === MAT.wood.s) g[y][x] = u < 3.2 ? OUT : v > 12.6 ? MAT.wood.s : MAT.wood.b;
    if (col === MAT.pink.b || col === MAT.pink.s) g[y][x] = v < 11 ? MAT.pink.l : v > 13 ? MAT.pink.s : MAT.pink.b;
  }
  add('study', 'pencil', '연필', g);
}
add('study', 'laptop', '노트북', draw([
  {mat: 'gray', shape: rbox(12, 10, 9, 7, 1.2)},
  {mat: 'sky', shape: rbox(12, 10, 6.6, 4.8, 0.5), flat: true},
  {mat: 'gray', shape: rbox(12, 19, 11.4, 2, 0.8), hl: P('3,18 4,18 5,18')},
], [...face(12, 9, 2.8, {spark: W}), ...px('10,19 11,19 12,19 13,19', MAT.gray.s)]));
add('study', 'clock', '시계', draw([
  {mat: 'yellow', shape: circle(5.4, 5, 3)}, {mat: 'yellow', shape: circle(18.6, 5, 3)},
  {mat: 'red', shape: circle(12, 13, 9.4), hl: P('6,8 5,9 5,10')},
  {mat: 'cream', shape: circle(12, 13, 6.6), flat: true},
], [...px('12,8 12,9 12,10 12,11 12,12 13,13 14,14 15,15', E), ...px('5,22 6,21 18,21 19,22', E), ...px('12,7 6,13 18,13 12,19', MAT.cream.s)]));
add('study', 'bulb', '전구', draw([
  {mat: 'yellow', shape: U(circle(12, 9.6, 7.2), poly([[7.6, 13], [16.4, 13], [15, 17.4], [9, 17.4]])), hl: P('7,5 6,6 6,7')},
  {mat: 'gray', shape: rbox(12, 19.6, 3.6, 2.4, 0.8)},
], [...face(12, 9, 2.8, {spark: W, blush: true}), ...px('9,19 10,19 11,19 12,19 13,19 14,19', MAT.gray.s), ...px('1,9 2,9 21,9 22,9 3,2 4,3 20,2 19,3', MAT.orange.b)]));
add('study', 'check', '체크', draw([
  {mat: 'green', shape: rbox(12, 12, 9.6, 9.6, 3), hl: P('5,4 4,5 4,6')},
], px('6,12 7,12 7,13 8,13 8,14 9,14 9,15 10,15 10,16 10,14 11,14 11,13 12,13 12,12 13,12 13,11 14,11 14,10 15,10 15,9 16,9 16,8 17,8 17,7 11,15', W)));
add('study', 'coffee', '커피', G.S.coffee);

/* ── 생활·마음 ── */
add('life', 'plant', '화분', draw([
  {mat: 'leaf', shape: ell(7.4, 7.6, 4.4, 2.3, 0.5), hl: P('5,6')}, {mat: 'leaf', shape: ell(16.6, 6.6, 4.4, 2.3, -0.5), hl: P('14,5')}, {mat: 'leaf', shape: ell(12, 4.4, 2.2, 3.6), hl: P('11,2')},
  {mat: 'apricot', shape: poly([[5, 13], [19, 13], [17, 22], [7, 22]]), hl: P('7,15 7,16')},
  {mat: 'apricot', shape: rbox(12, 12.6, 7.8, 1.6, 0.5)},
], [...px('12,8 12,9 12,10', E), ...face(12, 16, 2.8, {spark: W, blush: true})]));
add('life', 'moon', '잠', draw([
  {mat: 'yellow', shape: SUB(circle(11, 13, 9), circle(16.4, 9.4, 7.6)), hl: P('5,9 4,10 4,11')},
], [...px('6,16 7,17 8,17 9,16', E), ...px('5,18 6,18', MAT.pink.b), ...px('15,4 16,4 17,4 16,5 15,6 16,6 17,6 19,1 20,1 20,2 19,3 20,3', MAT.navy.b)]));
add('life', 'wallet', '지갑', draw([
  {mat: 'green', shape: rbox(9.6, 6.6, 6, 2.4, 0.5), flat: true},
  {mat: 'brown', shape: rbox(12, 13.6, 10, 7, 2), hl: P('4,8 5,8 6,8')},
  {mat: 'brown', shape: rbox(18.4, 13.6, 4, 2.8, 1.4)},
  {mat: 'yellow', shape: circle(18.6, 13.6, 1.3), flat: true},
]));
add('life', 'diary', '일기장', draw([
  {mat: 'pink', shape: rbox(11, 12, 8.4, 10, 1.2), hl: P('5,4 5,5 5,6')},
  {mat: 'cream', shape: rbox(20, 12, 1.6, 9, 0.4), flat: true},
  {mat: 'red', shape: U(circle(9.6, 10.4, 1.9), circle(12.6, 10.4, 1.9), poly([[7.6, 11], [14.6, 11], [11.1, 14.6]])), flat: true},
], px('4,3 4,4 4,5 4,6 4,7 4,8 4,9 4,10 4,11 4,12 4,13 4,14 4,15 4,16 4,17 4,18 4,19 4,20', MAT.pink.s)));
add('life', 'heart', '하트', G.S.heart);
add('life', 'letter', '편지', draw([
  {mat: 'cream', shape: rbox(12, 13, 10.4, 7.4, 1), hl: P('3,7 3,8 3,9')},
], [...px('3,7 4,8 5,9 6,10 7,11 8,12 9,13 10,14 11,15 12,15 13,14 14,13 15,12 16,11 17,10 18,9 19,8 20,7', MAT.cream.s),
  ...px('11,13 12,13 10,14 11,14 12,14 13,14 11,15 12,15 10,13 13,13', MAT.red.b), ...px('11,16 12,16', MAT.red.s)]));
/* ── 계절·날씨 ── */
add('season', 'cloud', '구름', G.S.cloud);
add('season', 'raincloud', '비구름', draw([{mat: 'gray', shape: cloudShape(0, -3), hl: P('9,5 8,6 10,5')}],
  [...face(12.6, 10, 3.5, {spark: W}), ...px('6,18 6,19 11,20 11,21 16,18 16,19 8,22 14,22 19,21', MAT.blue.b)]));
add('season', 'sun2', '해', draw([
  {mat: 'orange', shape: rays()},
  {mat: 'yellow', shape: circle(12, 12, 6.8), hl: P('8,8 7,9')},
], face(12, 11, 2.8, {spark: W, blush: true})));
add('season', 'snowflake', '눈송이', draw([
  {mat: 'sky', shape: U(rbox(12, 12, 1.6, 10.4), rot(rbox(12, 12, 1.6, 10.4), Math.PI / 3, 12, 12), rot(rbox(12, 12, 1.6, 10.4), -Math.PI / 3, 12, 12)), flat: true},
], px('12,12', MAT.blue.b)));
add('season', 'snowcloud', '눈구름', draw([{mat: 'white', shape: cloudShape(0, -3), hl: P('9,5 8,6 10,5')}],
  [...face(12.6, 10, 3.5, {spark: W}), ...px('6,18 11,20 16,18 8,22 14,22 19,21 3,21', MAT.blue.s), ...px('5,18 7,18 6,17 6,19 10,20 12,20 11,19 11,21 15,18 17,18 16,17 16,19', MAT.sky.s)]));
add('season', 'snowman', '눈사람', draw([
  {mat: 'white', shape: circle(12, 16.4, 6.6), hl: P('8,12 7,13')},
  {mat: 'white', shape: circle(12, 7.6, 4.6), hl: P('9,5')},
  {mat: 'red', shape: rbox(12, 11.8, 5.2, 1.2, 0.5), flat: true},
], [...px('10,6 11,6 13,6 14,6', E), ...px('12,8 13,8', MAT.orange.b), ...px('12,15 12,18', E), ...px('15,13 15,14', MAT.red.s)]));
add('season', 'umbrella', '우산', draw([
  {mat: 'red', shape: (x, y) => Math.max(circle(12, 12.4, 10.6)(x, y), y - 12.4), hl: P('5,7 6,6 7,5')},
], [...px('12,12 12,13 12,14 12,15 12,16 12,17 12,18 12,19 11,20 10,20 9,19', E), ...px('12,2 12,1', E), ...px('8,11 9,11 15,11 16,11', MAT.red.s)]));
add('season', 'maple', '단풍', draw([
  {mat: 'orange', shape: poly([[12, 1.6], [14, 7], [17.4, 4.6], [17, 9.6], [22.4, 8.4], [19.8, 13], [22.6, 14.6], [17, 16.4], [18, 19.4], [12, 17.6], [6, 19.4], [7, 16.4], [1.4, 14.6], [4.2, 13], [1.6, 8.4], [7, 9.6], [6.6, 4.6], [10, 7]]), hl: P('8,8 9,7')},
], px('12,17 12,18 12,19 12,20 12,21 12,22 12,12 12,13 12,14 12,15 12,16 11,11 13,11 10,10 14,10', MAT.orange.s)));
{
  const petals = [0, 1, 2, 3, 4].map(k => { const t = -Math.PI / 2 + k * 2 * Math.PI / 5; return circle(12 + 5.2 * Math.cos(t), 12.4 + 5.2 * Math.sin(t), 4.2); });
  add('season', 'blossom', '벚꽃', draw([
    {mat: 'pink', shape: U(...petals), hl: P('8,6 7,7')},
    {mat: 'yellow', shape: circle(12, 12.4, 2.2), flat: true},
  ], px('12,2 12,3', MAT.pink.s)));
}

/* ── 동물 친구 ── */
add('animal', 'dog', '강아지', draw([
  {mat: 'cream', shape: ell(12, 13.4, 8.4, 7.2), hl: P('6,9 5,10')},
  {mat: 'brown', shape: ell(3.8, 11.4, 2.6, 5.4, 0.3)}, {mat: 'brown', shape: ell(20.2, 11.4, 2.6, 5.4, -0.3)},
], [...face(12, 12, 3.5, {spark: W, blush: true}), ...px('11,15 12,15', E)]));
add('animal', 'rabbit', '토끼', G.S.rabbit);
add('animal', 'penguin', '펭귄', draw([
  {mat: 'navy', shape: ell(4.4, 14, 2, 4.6, 0.4)}, {mat: 'navy', shape: ell(19.6, 14, 2, 4.6, -0.4)},
  {mat: 'orange', shape: ell(9, 21.6, 2.6, 1.3), flat: true}, {mat: 'orange', shape: ell(15, 21.6, 2.6, 1.3), flat: true},
  {mat: 'navy', shape: ell(12, 12.4, 7.6, 9.4), hl: P('7,6 6,7')},
  {mat: 'white', shape: ell(12, 14.6, 5, 6.2), flat: true},
], [...px('9,9 10,9 14,9 15,9', E), ...px('9,8 14,8', W), ...px('11,11 12,11 13,11 12,12', MAT.orange.b)]));
add('animal', 'duck', '오리', draw([
  {mat: 'yellow', shape: ell(13.6, 16, 8.6, 5.6), hl: P('8,12 9,12')},
  {mat: 'yellow', shape: circle(9.4, 8.4, 5.2), hl: P('6,5 6,6')},
  {mat: 'orange', shape: ell(3.4, 9.6, 2.8, 1.5), flat: true},
], [...px('9,7 10,7 10,8', E), ...px('9,7', W), ...px('15,16 16,17 17,17 18,16', MAT.yellow.s)]));
add('animal', 'hamster', '햄스터', draw([
  {mat: 'orange', shape: circle(6.4, 6.6, 2.6)}, {mat: 'orange', shape: circle(17.6, 6.6, 2.6)},
  {mat: 'orange', shape: ell(12, 13.6, 9, 7.6), hl: P('6,9 5,10')},
  {mat: 'cream', shape: ell(12, 17.4, 5, 3.2), flat: true},
], [...face(12, 10, 3.6, {spark: W, blush: true})]));
add('animal', 'bear', '곰', draw([
  {mat: 'brown', shape: circle(5.8, 6.4, 3)}, {mat: 'brown', shape: circle(18.2, 6.4, 3)},
  {mat: 'brown', shape: ell(12, 13.6, 8.8, 7.6), hl: P('6,9 5,10')},
  {mat: 'wood', shape: ell(12, 15.8, 3.6, 2.6), flat: true},
], [...px('8,11 15,11', E), ...px('8,10 15,10', W), ...px('11,14 12,14', E), ...px('11,16 12,16', E)]));

/* ── 출력 ── */
const layers = (g) => { const m = {}; g.forEach((r, y) => { let x = 0; while (x < 24) { const c = r[x]; if (!c) { x++; continue; } let w = 0; while (x + w < 24 && r[x + w] === c) w++; m[c] = (m[c] || '') + `M${x} ${y}h${w}v1h-${w}Z`; x += w; } }); return Object.entries(m).map(([color, d]) => ({color, d})); };
const out = {themes: THEMES, stickers: S.map(s => ({theme: s.theme, id: s.id, name: s.name, layers: layers(s.grid)}))};
const dir = process.argv[2] || '.';
fs.writeFileSync(`${dir}/packs.json`, JSON.stringify(out));
let h = '<body style="margin:0;background:#e4ebe5;font:13px sans-serif;padding:10px">';
for (const t of THEMES) {
  h += `<div style="margin:6px 0 2px">${t.name}</div><div style="display:flex;gap:8px;flex-wrap:wrap">`;
  for (const s of out.stickers.filter(s => s.theme === t.id)) h += `<div style="text-align:center"><div style="background:#FEF1D1"><svg width=120 height=120 viewBox="0 0 24 24" shape-rendering="crispEdges">${s.layers.map(l => `<path d="${l.d}" fill="${l.color}"/>`).join('')}</svg></div>${s.name}</div>`;
  h += '</div>';
}
fs.writeFileSync(`${dir}/packs.html`, h);
console.log(out.stickers.length);
