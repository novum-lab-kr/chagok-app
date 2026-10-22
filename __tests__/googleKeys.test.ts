import appJson from '../app.json';
import { GOOGLE_IOS_CLIENT_ID } from '../src/sync/signIn/googleKeys';

it('app.json Google 플러그인의 iosUrlScheme은 iOS 클라이언트 ID를 거꾸로 쓴 값이다', () => {
  const plugin = appJson.expo.plugins.find((p) => Array.isArray(p) && p[0] === '@react-native-google-signin/google-signin') as [string, { iosUrlScheme: string }] | undefined;
  expect(plugin?.[1].iosUrlScheme).toBe(GOOGLE_IOS_CLIENT_ID.split('.').reverse().join('.'));
});
