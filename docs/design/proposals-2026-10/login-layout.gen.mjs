// 사용: node docs/design/proposals-2026-10/login-layout.gen.mjs <캡처 폴더> <출력 html>
// 캡처 폴더에는 w-1~3 .png (Storybook Proposal/Login welcome을 390x844, 2배로 찍은 것). 1판과 2판은 git 기록에
import fs from 'node:fs'; import path from 'node:path';
const [dir,out]=process.argv.slice(2);
let html=fs.readFileSync(new URL('./login-layout.template.html',import.meta.url),'utf8');
for(const id of ['w-1','w-2','w-3']){
  const b64=fs.readFileSync(path.join(dir,`${id}.png`)).toString('base64');
  html=html.replace(`__IMG_${id}__`,`data:image/png;base64,${b64}`);
}
fs.writeFileSync(out,html);
console.log(out, Math.round(html.length/1024)+'KB');
