// Google OAuth 클라이언트 ID (Cloud 프로젝트 chagok, 2026-10-22). 앱에 들어가는 공개 값이라 코드에 둔다.
// 웹 ID는 ID 토큰의 받는 쪽(aud)이고 Supabase Google 공급자에도 들어 있다. 웹 시크릿은 .secrets/google.env에만 둔다.
export const GOOGLE_WEB_CLIENT_ID = '569281636863-qeo5fpl82foq9aaa5mvf8h8l60rqttle.apps.googleusercontent.com';
/** app.json 플러그인의 iosUrlScheme은 이 값을 거꾸로 쓴 것이다. */
export const GOOGLE_IOS_CLIENT_ID = '569281636863-jmu9re3f6u38ajadbpl97nccabmi8fh2.apps.googleusercontent.com';
