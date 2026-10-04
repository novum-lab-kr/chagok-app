/* eslint-disable */ // 문서용: 네 파일을 이어 붙여 한 번에 돌린다(../README.md 「다시 만들기」). 파일 하나로는 전역이 비어 보인다.
// 이고지고 3차: 팔(arms)과 머리 위 물건(item)을 바꿔 그린다. chars2.js의 build·shape·range·sym·eyes, chars4.js의 FACES를 쓴다.
const mirror = (rows) => Object.fromEntries(Object.entries(rows).map(([y, [a, b]]) => [y, [23 - b, 23 - a]]));
const ARM = {
  none: [],
  up: [{8: [6, 7], 9: [5, 7], 10: [4, 6], 11: [3, 5], 12: [2, 5], 13: [2, 5], 14: [2, 5]}],
  side: [{15: [2, 5], 16: [1, 5], 17: [2, 5]}],
};
// 팔 그림 3차: 모두 두 팔을 들어 맨 아래 블록(8~15열, 8~11행)을 받치는 자세
// 팔 그림 4차: 블록을 잡지 않는 팔. 몸(4~19열, 15~20행) 옆에서 나온다
const ARM_FREE = {
  // 아래로 내린 짧은 팔
  down: {left: {15: [2, 4], 16: [1, 4], 17: [1, 4], 18: [1, 3], 19: [2, 3]}},
  // 옆으로 뻗은 짧은 팔
  out: {left: {14: [1, 4], 15: [0, 4], 16: [0, 4], 17: [1, 4]}},
  // 한 팔은 내리고 한 팔은 흔들기(블록과 떨어진 바깥쪽 위)
  wave: {left: {15: [2, 4], 16: [1, 4], 17: [1, 4], 18: [1, 3], 19: [2, 3]}, right: {9: [20, 22], 10: [19, 23], 11: [19, 23], 12: [19, 22], 13: [19, 21], 14: [18, 21], 15: [18, 20]}},
};
const ARM_DRAW = {
  // 굵은 팔: 몸 아래쪽 옆구리에서 나와 바깥으로 둘러 올라가, 손으로 블록 옆을 받친다
  thick: [{16: [2, 4], 15: [1, 4], 14: [1, 3], 13: [1, 3], 12: [1, 3], 11: [2, 4], 10: [3, 6], 9: [4, 7], 8: [5, 7]}],
  // 가는 팔: 잉크 한 줄 팔과 작은 손 (점으로 찍는다)
  line: 'dots',
  // 손만: 팔 없이 벙어리장갑 손이 블록 옆에 떠 있다
  hands: [{7: [5, 7], 8: [4, 7], 9: [4, 7], 10: [5, 7]}],
};
function armShapes(kind) {
  if (DOT_ARM[kind]) return [];
  if (ARM_FREE[kind]) { const a = ARM_FREE[kind]; return [shape(a.left, 'g'), shape(a.right ?? mirror(a.left), 'g')]; }
  if (ARM_DRAW[kind] && ARM_DRAW[kind] !== 'dots') return ARM_DRAW[kind].flatMap(r => [shape(r, 'g'), shape(mirror(r), 'g')]);
  if (kind === 'line') return [];
  if (kind === 'wave') return [shape(ARM.up[0], 'g'), shape({9: [20, 21], 10: [19, 22], 11: [19, 22], 12: [18, 21], 13: [18, 20], 14: [18, 20]}, 'g')];
  return ARM[kind].flatMap(r => [shape(r, 'g'), shape(mirror(r), 'g')]);
}
// 물건: 아래(민트) → 가운데(아이보리) → 위(살구). 각 [행 범위, 열 범위]
const ITEM = {
  book: [[[8, 11], [8, 15]], [[5, 8], [9, 16]], [[2, 5], [7, 14]]],
  cube: [[[8, 11], [9, 14]], [[5, 8], [10, 15]], [[2, 5], [8, 13]]],
  sheet: [[[9, 11], [6, 16]], [[7, 9], [7, 17]], [[5, 7], [5, 15]]],
};
const ITEM_FILL = ['m', 'w', 'o'];
const itemBox = (item, i) => ITEM[item === 'brick' ? 'book' : item][i];
function itemShape(item, i) {
  const [[y0, y1], [x0, x1]] = itemBox(item, i);
  return shape(range(y0, y1, () => [x0, x1]), ITEM_FILL[i]);
}
// 블록(돌기): 각 판 윗면에 돌기 두 개. 스티커 장: 오른쪽 위 모서리가 들림
function itemMarks(item, i) {
  const [[y0], [x0, x1]] = itemBox(item, i);
  if (item === 'brick' && i === 2) return {ink: [[x0 + 1, y0 - 1], [x0 + 2, y0 - 1], [x1 - 2, y0 - 1], [x1 - 1, y0 - 1]], clear: []};
  if (item === 'sheet') return {ink: [[x1 - 1, y0 + 1]], clear: [[x1, y0]]};
  return {ink: [], clear: []};
}
function bodyShape(blocks) {
  return shape({...(blocks === 0 ? {10: sym(4)} : {}), 11: sym(8), 12: sym(12), ...range(13, 14, () => sym(14)), ...range(15, 20, () => sym(16)), 21: sym(14)}, 'g');
}
// 팔 그림 5차: 발처럼 잉크 점만 (모양 없이). 몸 옆(4·19열)에 붙는다
const DOT_ARM = {
  dside: [[2, 16], [3, 16], [20, 16], [21, 16]],
  ddown: [[3, 17], [2, 18], [20, 17], [21, 18]],
  dwave: [[2, 16], [3, 16], [20, 14], [21, 13]],
};
const LINE_ARM = [[3, 16], [2, 15], [2, 14], [2, 13], [2, 12], [3, 11], [4, 10], [5, 9], [6, 8], [7, 8], [6, 9], [7, 9]];
function faceDots(face, arms) {
  const f = FACES[face];
  const armInk = arms === 'line' ? [...LINE_ARM, ...LINE_ARM.map(([x, y]) => [23 - x, y])] : DOT_ARM[arms] ?? [];
  return {'#': [...(f['#'] || []), ...armInk, [8, 22], [9, 22], [14, 22], [15, 22]], o: [...(f.blush ?? [[6, 16], [7, 16], [16, 16], [17, 16]]), ...(f.o || [])], ...(f.w ? {w: f.w} : {})};
}
function clearCells(rows, cells) {
  return rows.map((r, y) => r.split('').map((c, x) => cells.some(([a, b]) => a === x && b === y) ? '.' : c).join(''));
}
/** 전체 그림. blocks장까지 이고 있다. */
function carry3({face = 'basic', arms = 'none', item = 'book', blocks = 3}) {
  const shapes = [...armShapes(arms), bodyShape(blocks)];
  const dots = faceDots(face, arms);
  const clear = [];
  for (let i = 0; i < blocks; i++) {
    shapes.push(itemShape(item, i));
    const m = itemMarks(item, i); dots['#'] = [...dots['#'], ...m.ink]; clear.push(...m.clear);
  }
  return clearCells(build(shapes, dots), clear);
}
/** 애니메이션 층: 몸(블록 없음)과 물건 한 장씩 */
function carryBody({face = 'basic', arms = 'none'}) { return build([...armShapes(arms), bodyShape(0)], faceDots(face, arms)); }
function carryItem(item, i) { const m = itemMarks(item, i); return clearCells(build([itemShape(item, i)], {'#': m.ink}), m.clear); }
function gridSvg(rows, size) {
  let rects = '';
  rows.forEach((r, y) => { for (let x = 0; x < 24; x++) { const c = r[x]; if (PAL2[c]) rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${PAL2[c]}"/>`; } });
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}
