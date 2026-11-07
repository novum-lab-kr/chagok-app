import appJson from '../app.json';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_IOS_CLIENT_ID_DEV, googleIosClientId } from '../src/sync/signIn/googleKeys';
import { KAKAO_NATIVE_APP_KEY, KAKAO_NATIVE_APP_KEY_DEV, kakaoNativeAppKey } from '../src/sync/signIn/kakaoKey';

type Plugin = [string, { iosUrlScheme: string }];
const googlePlugin = (plugins: unknown[]) =>
  plugins.find((p) => Array.isArray(p) && p[0] === '@react-native-google-signin/google-signin') as Plugin | undefined;
const reversed = (id: string) => id.split('.').reverse().join('.');

it('app.json Google 플러그인의 iosUrlScheme은 iOS 클라이언트 ID를 거꾸로 쓴 값이다', () => {
  expect(googlePlugin(appJson.expo.plugins)?.[1].iosUrlScheme).toBe(reversed(GOOGLE_IOS_CLIENT_ID));
});

describe('개발 앱 (app.config.js, APP_VARIANT=development)', () => {
  const load = (variant: string | undefined) => {
    const prev = process.env.APP_VARIANT;
    if (variant === undefined) delete process.env.APP_VARIANT; else process.env.APP_VARIANT = variant;
    try {
      let fn: (a: { config: typeof appJson.expo }) => typeof appJson.expo & Record<string, unknown> = () => { throw new Error('not loaded'); };
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- 변수마다 설정 파일을 새로 읽는다
      jest.isolateModules(() => { fn = require('../app.config.js'); });
      return fn({ config: JSON.parse(JSON.stringify(appJson.expo)) });
    } finally {
      if (prev === undefined) delete process.env.APP_VARIANT; else process.env.APP_VARIANT = prev;
    }
  };

  it('변수가 없으면 app.json 그대로다', () => {
    expect(load(undefined)).toEqual(appJson.expo);
  });

  it('번들 ID, scheme, 이름, Google URL scheme이 개발용이 된다', () => {
    const c = load('development');
    expect(c.ios.bundleIdentifier).toBe('com.novumlab.chagok.dev');
    expect(c.android.package).toBe('com.novumlab.chagok.dev');
    expect(c.scheme).toBe('chagok-dev');
    expect(c.name).toBe('차곡 개발');
    expect(googlePlugin(c.plugins)?.[1].iosUrlScheme).toBe(reversed(GOOGLE_IOS_CLIENT_ID_DEV));
    const kakao = c.plugins.find((p) => Array.isArray(p) && p[0] === '@react-native-kakao/core') as [string, { nativeAppKey: string }] | undefined;
    expect(kakao?.[1].nativeAppKey).toBe(KAKAO_NATIVE_APP_KEY_DEV);
  });

  it('앱 번들 ID에 맞는 Google iOS 클라이언트를 고른다', () => {
    expect(googleIosClientId('com.novumlab.chagok')).toBe(GOOGLE_IOS_CLIENT_ID);
    expect(googleIosClientId('com.novumlab.chagok.dev')).toBe(GOOGLE_IOS_CLIENT_ID_DEV);
    expect(googleIosClientId(null)).toBe(GOOGLE_IOS_CLIENT_ID);
  });

  it('앱 번들 ID에 맞는 카카오 네이티브 앱 키를 고른다', () => {
    expect(kakaoNativeAppKey('com.novumlab.chagok')).toBe(KAKAO_NATIVE_APP_KEY);
    expect(kakaoNativeAppKey('com.novumlab.chagok.dev')).toBe(KAKAO_NATIVE_APP_KEY_DEV);
  });
});
