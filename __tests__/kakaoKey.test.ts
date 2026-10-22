import appJson from '../app.json';
import { KAKAO_NATIVE_APP_KEY } from '../src/sync/signIn/kakaoKey';

it('app.json 카카오 플러그인의 앱 키와 코드의 앱 키가 같다', () => {
  const plugin = appJson.expo.plugins.find((p) => Array.isArray(p) && p[0] === '@react-native-kakao/core') as [string, { nativeAppKey: string }] | undefined;
  expect(plugin?.[1].nativeAppKey).toBe(KAKAO_NATIVE_APP_KEY);
});
