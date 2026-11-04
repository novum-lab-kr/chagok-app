// 번들과 소스맵에 같은 Debug ID를 넣어 Sentry 오류 위치를 원래 코드 줄로 본다.
// https://docs.sentry.io/platforms/react-native/guides/expo/ 「Add the Sentry Metro Plugin」
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
