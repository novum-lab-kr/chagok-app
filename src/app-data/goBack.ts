import { router } from 'expo-router';

/**
 * 링크로 바로 들어온 화면은 아래에 쌓인 화면이 없어 `router.back()`이 아무것도 하지 않는다.
 * 돌아갈 곳이 없으면 홈으로 보낸다.
 */
export function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
