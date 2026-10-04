// 확정 캐릭터 데이터와 한 장짜리 시트를 다시 만든다.
// 실행: (cd docs/design/character/source && cat chars2.js chars4.js chars5.js export.js | node - ..)
// → ../character-data.json, ../character-sheet.html (시트 PNG는 이 HTML을 렌더해서 만든다)
{
  const fs = require('fs');
  const out = process.argv[2] || '..';
  const faces = {basic: 'basic', smile: 'happy3', grin: 'happyB', excited: 'happy5', surprised: 'wow', sleepy: 'sleepyZ2', wink: 'wink', sparkle: 'sparkle', shy: 'shy', curious: 'curious'};
  const data = {
    name: '이고지고 (가칭)', decided: '2026-10-04', grid: '24x24',
    legend: {'.': '투명', '#': 'ink #06261C', g: 'lcd #C7DE94', o: 'apricot #FD855F', w: 'ivory #FEF1D1', m: 'mint #AFE1CB'},
    faces: Object.fromEntries(Object.entries(faces).map(([k, v]) => [k, carryFace(FACES[v])])),
    variants: {sleepyBubble: carryFace(FACES.sleepyZ3), armsDotSide: carry3({arms: 'dside', item: 'book'}), armsDotDown: carry3({arms: 'ddown', item: 'book'})},
    blockStates: {b0: FACE_ART.b0, b1: FACE_ART.b1, b2: FACE_ART.b2, b3: FACE_ART.basic},
    splashLayers: {body: carryBody({arms: 'none'}), item0_mint: carryItem('book', 0), item1_ivory: carryItem('book', 1), item2_apricot: carryItem('book', 2)},
  };
  fs.writeFileSync(`${out}/character-data.json`, JSON.stringify(data, null, 1) + '\n');
  const cell = (rows, label) => `<div style="text-align:center;width:120px">${gridSvg(rows, 120)}<div>${label}</div></div>`;
  let h = '<body style="margin:0;background:#AFE1CB;font:12px sans-serif;color:#06261C;padding:12px"><div style="display:flex;flex-wrap:wrap;gap:10px;width:900px">';
  for (const group of [data.faces, data.variants, data.blockStates]) for (const [k, v] of Object.entries(group)) h += cell(v, k);
  fs.writeFileSync(`${out}/character-sheet.html`, h + '</div>');
}
