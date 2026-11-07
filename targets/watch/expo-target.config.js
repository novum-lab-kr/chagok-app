// 워치 앱 타깃 (PRD 4.14, 워치 계획 2). prebuild 때 @bacons/apple-targets가 읽는다.
// 스티커 그림은 위젯과 같은 assets/widget-art의 컬러 스티커를 그대로 싣는다. 이미지 이름은 파일 이름에서 「color-」를 뺀 것(basic-clover).
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
module.exports = (config) => ({
  type: 'watch',
  name: 'ChagokWatch',
  // 개발 앱(app.config.js)이면 이름과 앱 그룹도 개발용이 된다. 번들 ID는 앱 ID + .watch
  displayName: config.name,
  deploymentTarget: '10.0',
  // 앱 아이콘과 같은 그림(개발 앱이면 DEV 띠가 있는 것)
  icon: `../../${config.icon.replace(/^\.\//, '')}`,
  // 컴플리케이션(targets/watch-widget)과 차곡이 그림, 문구를 나눠 쓴다 (targets/watch/Logic/Complication.swift)
  entitlements: { 'com.apple.security.application-groups': [`group.${config.ios.bundleIdentifier}.watch`] },
  images,
});
