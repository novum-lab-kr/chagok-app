// 직접 만든 Apple 로그인 버튼의 로고를 만든다 (2026-10-22).
// 로고는 Apple 디자인 리소스(Sign in with Apple Logo, Left-aligned Black Medium SVG)다. HIG가 직접 만든 버튼에 쓰라고 하지만
// 사용권상 공개 저장소에 두지 않는다. 그래서 git 밖의 파일에서 읽어 git 제외 파일(src/design-system/apple-siwa-logo.generated.ts)로 만든다.
// 파일 위치: APPLE_SIWA_LOGO_SVG(EAS secret 파일 변수가 주는 경로) 또는 .secrets/apple-siwa-logo.svg.
// 파일이 없으면 null을 쓰고, 앱은 Apple 기본 버튼으로 돌아간다. postinstall에서 돈다.
import fs from 'node:fs';

const src=process.env.APPLE_SIWA_LOGO_SVG||'.secrets/apple-siwa-logo.svg';
const out='src/design-system/apple-siwa-logo.generated.ts';
let value='null';
if (fs.existsSync(src)) {
  const svg=fs.readFileSync(src,'utf8');
  const box=svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  // 흰 바탕 사각형은 버튼 바탕과 같아서 빼고 사과 그림만 쓴다. 여백(viewBox)은 그대로 둔다.
  const path=svg.match(/<path d="([^"]+)"[^>]*fill="#000000"/)??svg.match(/<path d="([^"]+)"/);
  if (!box||!path) throw new Error(`apple-logo: unexpected SVG in ${src}`);
  value=JSON.stringify({width:Number(box[1]),height:Number(box[2]),d:path[1]});
}
fs.writeFileSync(out,`// scripts/apple-logo.mjs가 만든다. 커밋하지 않는다.\nexport const APPLE_SIWA_LOGO: {width:number;height:number;d:string}|null=${value};\n`);
console.log(`apple-logo: ${value==='null'?'없음, 기본 버튼 사용':'만듦'} (${src})`);
