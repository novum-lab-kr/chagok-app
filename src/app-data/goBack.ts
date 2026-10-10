import { router } from 'expo-router';

/**
 * 링크로 바로 들어온 화면은 아래에 쌓인 화면이 없어 `router.back()`이 아무것도 하지 않는다.
 * 돌아갈 곳이 없으면 홈으로 보낸다.
 */
export function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** 홈으로. 아래에 홈이 있으면 그 사이 화면을 모두 닫고, 없으면 홈을 연다(화면을 보여 주지 못했을 때의 [홈으로]). */
export function goHome() {
  router.dismissTo('/');
}
