// 워치 앱 타깃 (PRD 4.14, 워치 계획 2). prebuild 때 @bacons/apple-targets가 읽는다.
// 스티커 그림은 위젯과 같은 assets/widget-art의 컬러 스티커를 그대로 싣는다. 이미지 이름은 파일 이름에서 「color-」를 뺀 것(basic-sprout).
const fs = require('node:fs');
const path = require('node:path');

// __dirname 대신: 이 파일의 자리에서 assets/widget-art를 찾는다(린트가 Node 전역을 모른다)
const ART = path.join(path.dirname(require.resolve('./expo-target.config.js')), '../../assets/widget-art');
const images = Object.fromEntries(
  fs.readdirSync(ART)
    .filter((f) => /^color-.+\.png$/.test(f))
    .map((f) => [f.slice('color-'.length, -'.png'.length), `../../assets/widget-art/${f}`]),
);

/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'watch',
  name: 'ChagokWatch',
  displayName: '차곡차곡',
  deploymentTarget: '10.0',
  icon: '../../assets/icon.png',
  // 컴플리케이션(targets/watch-widget)과 차곡이 그림, 문구를 나눠 쓴다 (targets/watch/Logic/Complication.swift)
  entitlements: { 'com.apple.security.application-groups': ['group.com.novumlab.chagok.watch'] },
  images,
});
