// 문의하기와 광고 신고 시안 페이지 만들기: 캡처 PNG를 템플릿에 data URI로 넣는다.
// 캡처는 임시 스토리 stories/_proposal/SettingsContact.stories.tsx(커밋하지 않음)를 Storybook으로 띄워 찍는다.
// 사용법: node docs/design/proposals-2026-10/settings-contact.gen.mjs <캡처 폴더> <출력 html>
// 캡처 폴더에는 t-1.png, t-2.png, t-3.png, no-mail.png가 있어야 한다(2판, 1판은 a, b-sheet, c).
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const [shots, out] = process.argv.slice(2);
if (!shots || !out) throw new Error('사용법: settings-contact.gen.mjs <캡처 폴더> <출력 html>');
const uri = f => 'data:image/png;base64,' + fs.readFileSync(path.join(shots, f)).toString('base64');
const html = fs.readFileSync(path.join(here, 'settings-contact.template.html'), 'utf8')
  .replace('__SHOT_T1__', uri('t-1.png')).replace('__SHOT_T2__', uri('t-2.png'))
  .replace('__SHOT_T3__', uri('t-3.png')).replace('__SHOT_NOMAIL__', uri('no-mail.png'));
fs.writeFileSync(out, html);
console.log(out, Math.round(html.length / 1024) + 'KB');
