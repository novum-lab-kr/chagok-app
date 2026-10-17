// 친구와 함께 쓰기 시안 페이지 만들기: 앱의 실제 스티커 그림, 차곡이 표정, Neo둥근모 폰트를 템플릿에 넣는다.
// 사용법: node docs/design/proposals-2026-10/friends-ideas.gen.mjs <출력 폴더>
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const repo = path.resolve(here, '../../..');
const out = process.argv[2];
if (!out) throw new Error('사용법: node friends-ideas.gen.mjs <출력 폴더>');

const src = fs.readFileSync(path.join(repo, 'src/stickers/color/stickers.generated.ts'), 'utf8');
const arr = src.slice(src.indexOf('=[') + 1, src.lastIndexOf(']') + 1);
const stickers = Function(`return ${arr.replace(/\]\s*as const[\s\S]*$/, ']')}`)();
const want = ['basic.sprout', 'basic.star', 'basic.book', 'basic.flower', 'animals_normal.cat', 'animals_normal.dog', 'animals_normal.rabbit',
  'sports_normal.run', 'sports_normal.walk', 'emotions_normal.love', 'weather_normal.sun', 'snack_normal.milk', 'objects_normal.letter'];
const art = {};
for (const id of want) {
  const s = stickers.find(x => x.id === id);
  if (!s) throw new Error('missing ' + id);
  art[id] = s.layers.map(l => `<path fill="${l.color}" d="${l.d}"/>`).join('');
}

const ch = JSON.parse(fs.readFileSync(path.join(repo, 'docs/design/character/character-data.json'), 'utf8'));
const pal = {'#': '#06261C', g: '#C7DE94', o: '#FD855F', w: '#FEF1D1', m: '#AFE1CB'};
const faces = {};
for (const k of ['smile', 'sparkle', 'excited', 'grin']) {
  const byColor = {};
  ch.faces[k].forEach((r, y) => [...r].forEach((c, x) => { if (pal[c]) (byColor[pal[c]] ||= []).push(`M${x} ${y}h1v1h-1Z`); }));
  faces[k] = Object.entries(byColor).map(([c, d]) => `<path fill="${c}" d="${d.join('')}"/>`).join('');
}

const font = fs.readFileSync(path.join(repo, 'src/design-system/assets/neodgm-1.601.ttf')).toString('base64');
let html = fs.readFileSync(path.join(here, 'friends-ideas.template.html'), 'utf8');
html = html.replace('__FONT__', font).replace('/*__ART__*/', `const ART=${JSON.stringify(art)};const FACE=${JSON.stringify(faces)};`);
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, 'friends-ideas.html'), html);
console.log('ok', (html.length / 1024).toFixed(0) + 'KB');
