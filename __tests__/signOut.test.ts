import { clearSignInSessions, signOutAndWipe, type SignOutDeps } from '../src/app-data/signOut';

/** 부른 순서를 적는 가짜 모듈. fail에 이름을 주면 그 단계에서 던진다. */
function recorder(fail?: keyof SignOutDeps) {
  const calls: string[] = [];
  const step = (name: keyof SignOutDeps) => async () => {
    calls.push(name);
    if (name === fail) throw new Error(name);
  };
  const deps: SignOutDeps = {
    clearSession: step('clearSession'),
    signOutKakao: step('signOutKakao'),
    signOutGoogle: step('signOutGoogle'),
    signOutPurchases: step('signOutPurchases'),
    wipeDevice: step('wipeDevice'),
  };
  return { calls, deps };
}

describe('로그아웃과 계정 삭제의 기기 정리 순서', () => {
  it('세션을 지우고, 결제 계정을 익명으로 돌린 뒤에 기기를 비운다 (보안 검토 L1)', async () => {
    const { calls, deps } = recorder();
    await signOutAndWipe(deps);
    expect(calls).toEqual(['clearSession', 'signOutKakao', 'signOutGoogle', 'signOutPurchases', 'wipeDevice']);
  });

  it('결제 계정 전환이 실패하면 기기를 비우지 않고 실패를 알린다', async () => {
    const { calls, deps } = recorder('signOutPurchases');
    await expect(signOutAndWipe(deps)).rejects.toThrow('signOutPurchases');
    expect(calls).not.toContain('wipeDevice');
  });

  it('연결 취소는 로그인 세션만 지우고 기기 기록과 결제 계정은 그대로 둔다', async () => {
    const { calls, deps } = recorder();
    await clearSignInSessions(deps);
    expect(calls).toEqual(['clearSession', 'signOutKakao', 'signOutGoogle']);
  });
});
