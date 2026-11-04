// 함께 목표 시안 페이지 만들기: 캡처 PNG와 Neo둥근모를 템플릿에 data URI로 넣고, 위젯 그림의 미니 판 칸을 채운다.
// 캡처는 임시 스토리 stories/_proposal/FriendsGoal.stories.tsx(커밋하지 않음, 기준 release/1.0.1)를 Storybook으로 띄워
// 크롬 헤드리스로 폭 500에서 찍고 왼쪽 25pt를 잘라 390으로 만든다.
// 사용법: node docs/design/proposals-2026-10/friends-goal.gen.mjs <캡처 폴더> <출력 html>
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const [shots, out] = process.argv.slice(2);
if (!shots || !out) throw new Error('사용법: friends-goal.gen.mjs <캡처 폴더> <출력 html>');
const font = path.resolve(here, '../../../src/design-system/assets/neodgm-1.601.ttf');
const cells = n => Array.from({length: 20}, (_, i) => i < n ? '<i class="f"></i>' : '<i></i>').join('');
let html = fs.readFileSync(path.join(here, 'friends-goal.template.html'), 'utf8')
  .replace('__FONT__', 'data:font/ttf;base64,' + fs.readFileSync(font).toString('base64'))
  .replace('__MINI_F__', cells(12)).replace('__MINI_S__', cells(6)).replace('__MINI_C__', cells(9));
html = html.replace(/__IMG_([a-z0-9-]+)__/g, (_, id) => 'data:image/png;base64,' + fs.readFileSync(path.join(shots, id + '.png')).toString('base64'));
const left = html.match(/__[A-Z_]+__/g);
if (left) throw new Error('채우지 못한 자리: ' + left.join(', '));
fs.writeFileSync(out, html);
console.log(out, Math.round(html.length / 1024) + 'KB');
