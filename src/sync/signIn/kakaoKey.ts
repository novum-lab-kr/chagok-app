/**
 * 카카오 네이티브 앱 키(Kakao Developers 앱 「차곡차곡」 1618098). 앱에 들어가는 공개 값이라 코드에 둔다.
 * 출시 앱 키. app.json 플러그인의 nativeAppKey와 같아야 한다(URL 스킴과 SDK 초기화가 같은 앱을 보게) — kakaoKey.test.ts가 맞춰 본다.
 */
export const KAKAO_NATIVE_APP_KEY = 'eee7d607ec43b07774b8eff6056dacfe';
/** 개발 앱(com.novumlab.chagok.dev) 키. 카카오는 키 하나에 iOS 번들 ID를 하나만 받아 따로 만들었다. app.config.js의 같은 이름 값과 같다. */
export const KAKAO_NATIVE_APP_KEY_DEV = '09334c77cc1e1f358f027b1d1fbb1310';

/** 지금 앱의 번들 ID에 맞는 네이티브 앱 키 */
export const kakaoNativeAppKey = (bundleId: string | null): string =>
  bundleId?.endsWith('.dev') ? KAKAO_NATIVE_APP_KEY_DEV : KAKAO_NATIVE_APP_KEY;
