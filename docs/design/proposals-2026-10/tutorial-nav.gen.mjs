// 튜토리얼 건너뛰기 자리 시안 페이지 만들기: 캡처 3장(tutorial-nav-*.png)과 Neo둥근모 폰트를 템플릿에 넣는다.
// 캡처는 임시 스토리 stories/_proposal/TutorialNav.stories.tsx(커밋하지 않음)를 Storybook에서 찍은 것이다.
// 사용법: node docs/design/proposals-2026-10/tutorial-nav.gen.mjs <출력 폴더>
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const repo = path.resolve(here, '../../..');
const out = process.argv[2];
if (!out) throw new Error('출력 폴더를 주세요');

const shots = Object.fromEntries(['text-link', 'small-button', 'close-icon'].map(n =>
  [n, 'data:image/png;base64,' + fs.readFileSync(path.join(here, `tutorial-nav-${n}.png`)).toString('base64')]));
const html = fs.readFileSync(path.join(here, 'tutorial-nav.template.html'), 'utf8')
  .replace('/*__SHOTS__*/', JSON.stringify(shots).slice(1, -1))
  .replace('__FONT__', fs.readFileSync(path.join(repo, 'src/design-system/assets/neodgm-1.601.ttf')).toString('base64'));
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, 'tutorial-nav.html'), html);
console.log('발행용', path.join(out, 'tutorial-nav.html'), (html.length / 1024).toFixed(0) + 'KB');
