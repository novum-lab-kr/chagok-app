// 함께 목표 화면 확인 페이지 만들기: 캡처 PNG와 Neo둥근모를 템플릿에 data URI로 넣고, 글자 자리(__REC_*__, __CELL_*__)를 채운다.
// 고를 안(t1~t3)은 임시 스토리(stories/_proposal/, 커밋 안 함)를 정적 Storybook으로 찍은 것, 확인할 화면은 iOS 26.5 시뮬레이터 캡처(qa)다.
// 사용법: node docs/design/proposals-2026-10/friends-goal-screens.gen.mjs <캡처 폴더> <글자 JSON> <출력 html>
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const [shots, textsPath, out] = process.argv.slice(2);
if (!shots || !textsPath || !out) throw new Error('사용법: friends-goal-screens.gen.mjs <캡처 폴더> <글자 JSON> <출력 html>');
const texts = JSON.parse(fs.readFileSync(textsPath, 'utf8'));
const font = path.resolve(here, '../../../src/design-system/assets/neodgm-1.601.ttf');
let html = fs.readFileSync(path.join(here, 'friends-goal-screens.template.html'), 'utf8')
  .replace('__FONT__', 'data:font/ttf;base64,' + fs.readFileSync(font).toString('base64'));
html = html.replace(/__IMG_([a-z0-9-]+)__/g, (_, id) => 'data:image/png;base64,' + fs.readFileSync(path.join(shots, id + '.png')).toString('base64'));
html = html.replace(/__((?:REC|CELL)_[A-Z]+)__/g, (_, k) => {
  if (!(k in texts)) throw new Error('글자 JSON에 없는 자리: ' + k);
  return texts[k];
});
const left = html.match(/__[A-Z_]+__/g);
if (left) throw new Error('채우지 못한 자리: ' + left.join(', '));
fs.writeFileSync(out, html);
console.log(out, Math.round(html.length / 1024) + 'KB');
