// 개발 앱과 출시 앱을 한 폰에 따로 깔기 위한 설정 (2026-11-04). 고정 값은 app.json에 두고 여기서는 개발 앱만 바꾼다.
// APP_VARIANT=development이면 이름, 번들 ID, scheme, 아이콘, Google iOS 클라이언트, 카카오 네이티브 앱 키가 개발용이 된다.
// EAS는 eas.json development 프로필이 넣고, 이 맥에서 빌드할 때는 npm run prebuild:dev가 넣는다. 없으면 출시 앱 그대로다.
// Expo 안내: https://docs.expo.dev/tutorial/eas/multiple-app-variants/
const IS_DEV = process.env.APP_VARIANT === 'development';

// 개발 앱 Google iOS 클라이언트(Cloud 프로젝트 chagok). src/sync/signIn/googleKeys.ts GOOGLE_IOS_CLIENT_ID_DEV와 같은 값이다.
const GOOGLE_IOS_CLIENT_ID_DEV = '569281636863-dh9esjca8348dc9v34nrhjuco3smr5qe.apps.googleusercontent.com';
// 개발 앱 카카오 네이티브 앱 키(Kakao Developers 앱 1618098의 「Dev Native AppKey」). 키 하나에 iOS 번들 ID를 하나만 넣을 수 있어 따로 만들었다.
// src/sync/signIn/kakaoKey.ts KAKAO_NATIVE_APP_KEY_DEV와 같은 값이다.
const KAKAO_NATIVE_APP_KEY_DEV = '09334c77cc1e1f358f027b1d1fbb1310';
const reversed = (id) => id.split('.').reverse().join('.');

module.exports = ({ config }) => {
  if (!IS_DEV) return config;
  const id = `${config.ios.bundleIdentifier}.dev`;
  return {
    ...config,
    name: '차곡 개발',
    // 출시 앱과 같은 scheme이면 위젯과 링크가 어느 앱을 열지 iOS가 정한다
    scheme: `${config.scheme}-dev`,
    icon: './assets/icon-dev.png',
    // 초대 링크는 개발 사이트에서만 받는다. 운영 주소까지 받으면 두 앱이 깔린 폰에서 운영 링크가 개발 앱으로 열린다(2026-11-06)
    ios: { ...config.ios, bundleIdentifier: id, associatedDomains: ['applinks:chagok-dev.novum-lab.com'] },
    android: { ...config.android, package: id },
    // 홈 화면 이름은 app.json이 아니라 언어별 CFBundleDisplayName이 정한다
    locales: {
      ko: { ...require('./locales/ko.json'), CFBundleDisplayName: '차곡 개발' },
      en: { ...require('./locales/en.json'), CFBundleDisplayName: 'Chagok Dev' },
    },
    plugins: config.plugins.map((p) => {
      if (!Array.isArray(p)) return p;
      if (p[0] === '@react-native-google-signin/google-signin') return [p[0], { ...p[1], iosUrlScheme: reversed(GOOGLE_IOS_CLIENT_ID_DEV) }];
      if (p[0] === '@react-native-kakao/core') return [p[0], { ...p[1], nativeAppKey: KAKAO_NATIVE_APP_KEY_DEV }];
      return p;
    }),
  };
};
