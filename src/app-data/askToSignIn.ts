import type { useRouter } from 'expo-router';
import { togetherDialogs } from '../design-system';
import type { DialogChoice, DialogSpec } from './useDialog';

/**
 * 「로그인이 필요해요」 창. [로그인]이면 계정 연결을 연다. from은 다시 로그인(relogin, 돌아오면 입력이 그대로)
 * 또는 목표 탭 [친구와 함께](together, 로그인이 끝나면 만들기로 간다).
 */
export async function askToSignIn(
  ask: (spec: DialogSpec) => Promise<DialogChoice>,
  router: Pick<ReturnType<typeof useRouter>, 'push'>,
  from: 'relogin' | 'together' = 'relogin',
): Promise<void> {
  if ((await ask(togetherDialogs.login)) === 'primary') router.push({ pathname: '/account/connect', params: { from } });
}
