// 워치 시계 화면 긴 칸 컴플리케이션 (2026-10-16 결정 5 K2). 워치 앱이 App Group에 둔 차곡이 그림과 문구를 그린다.
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'watch-widget',
  name: 'ChagokComplication',
  displayName: '차곡이',
  // 워치 앱 id 아래여야 설치된다(com.novumlab.chagok.watch.). 「.complication」은 Apple이 「not available」로 거절했다(2026-10-17)
  bundleIdentifier: 'com.novumlab.chagok.watch.widgets',
  deploymentTarget: '10.0',
  entitlements: { 'com.apple.security.application-groups': ['group.com.novumlab.chagok.watch'] },
});
