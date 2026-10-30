import { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { AccountDeletedScreen, DeleteAccountScreen, PixelDialogModal, accountDialogs } from '../../src/design-system';
import { goBackOrHome } from '../../src/app-data/goBack';
import { removeAllManagedPhotos } from '../../src/app-data/recordPhotos';
import { deleteAccountOnServer, NeedsLoginError, signOutLocal } from '../../src/sync/account';
import { revokeGoogle, signOutGoogle } from '../../src/sync/signIn/expoGoogle';
import { signOutKakao } from '../../src/sync/signIn/expoKakao';
import { clearStoredSession, getSupabase } from '../../src/sync/supabaseClient';
import { pauseSync, resumeSync } from '../../src/sync/syncGate';
import { wipeDevice } from '../../src/sync/wipe';

type Step = 'review' | 'confirm' | 'busy' | 'failed' | 'needsLogin' | 'done';

/** 닫히는 애니메이션(fade)보다 넉넉하게 (useDialog와 같은 값) */
const DISMISS_FALLBACK_MS = 700;

/**
 * 계정 삭제 (시안 6A, 계정·백업 설계 ①). 내용 확인 → 최종 확인 → 삭제 중 → 완료.
 * 서버 삭제가 성공한 뒤에만 기기를 지운다. 실패하면 아무것도 지우지 않고 알린다.
 * 삭제 중에는 전송을 멈춘다 — 지워진 계정으로 보내면 서버가 거부해 항목이 보류된다.
 */
export default function DeleteAccount() {
  const supabase = getSupabase();
  const [step, setStep] = useState<Step>('review');
  /** 서버 삭제가 끝났다. 그 뒤 기기 정리만 실패했으면 [다시 시도]는 기기 정리만 한다 — 세션이 이미 없다. */
  const serverDone = useRef(false);
  const navigation = useNavigation();
  /** [로그인]을 눌렀다. 창이 다 닫힌 뒤 로그인 화면으로 간다 — 닫히는 창과 화면 이동이 겹치지 않게 */
  const loginAfterClose = useRef(false);

  // [계정 삭제하기]를 누른 뒤에는 iOS 스와이프로 빠져나가지 않는다. 안내만 보는 동안은 스와이프로 나갈 수 있다 (2026-10-11)
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: step === 'review' });
  }, [navigation, step]);

  // 삭제 중·완료 뒤에는 Android 뒤로가기로 빠져나가지 않는다
  useEffect(() => {
    if (step !== 'busy' && step !== 'done') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [step]);

  if (!supabase) return null;

  const run = async () => {
    setStep('busy');
    pauseSync();
    try {
      // 서버 삭제는 다시 불러도 남은 단계부터 이어서 한다(멱등). 기기 정리가 실패해도 [다시 시도]로 끝까지 간다.
      if (!serverDone.current) {
        await deleteAccountOnServer(supabase);
        serverDone.current = true;
        // Google은 서버에 토큰이 없어 앱이 연결을 끊는다. 서버 삭제가 끝난 뒤에만, 실패해도 계속한다
        await revokeGoogle();
      }
      // 지운 계정의 토큰은 갱신되지 않아 로그아웃이 오류를 돌려줄 수 있다 — 저장된 세션을 직접 지운다
      await signOutLocal(supabase, clearStoredSession);
      await signOutKakao();
      await signOutGoogle();
      await wipeDevice(removeAllManagedPhotos);
    } catch (error) {
      // 로그인이 풀려 있으면 다시 시도해도 같다 — 로그인을 안내한다 (2026-10-29)
      setStep(error instanceof NeedsLoginError ? 'needsLogin' : 'failed');
      return;
    }
    resumeSync();
    setStep('done');
  };

  const close = () => { resumeSync(); setStep('review'); };
  const openLogin = () => {
    if (!loginAfterClose.current) return;
    loginAfterClose.current = false;
    router.push({ pathname: '/account/connect', params: { from: 'relogin' } });
  };
  /** 창이 다 닫힌 뒤 로그인 화면으로 간다(iOS onDismiss). 닫힘 신호가 안 오면 잠시 뒤 간다 */
  const login = () => {
    loginAfterClose.current = true;
    close();
    if (Platform.OS === 'ios') setTimeout(openLogin, DISMISS_FALLBACK_MS);
    else openLogin();
  };
  const cancel = () => setStep('review');
  const dialog = (() => {
    if (step === 'failed') return { ...accountDialogs.deleteFailed, onPrimary: () => void run(), onSecondary: close, onRequestClose: close };
    if (step === 'needsLogin') return { ...accountDialogs.deleteNeedsLogin, onPrimary: login, onSecondary: close, onRequestClose: close };
    return { ...accountDialogs.deleteAccount, onPrimary: () => void run(), onSecondary: cancel, onRequestClose: cancel };
  })();

  if (step === 'done') return <AccountDeletedScreen onDone={() => router.replace('/')} />;

  return (
    <>
      <DeleteAccountScreen onDelete={() => setStep('confirm')} onCancel={goBackOrHome} onBack={goBackOrHome} />
      {/* 확인, 삭제 중, 실패, 로그인 안내를 창 하나에서 내용만 바꿔 보여 준다. 창 둘을 동시에 닫고 열면 iOS가 새 창을 띄우지 못하고
          보이지 않는 창이 화면을 덮어 앱 전체가 터치되지 않았다 (2026-10-29 TestFlight 6, 실패 뒤 [다시 시도]) */}
      <PixelDialogModal visible={step !== 'review'} {...dialog} loading={step === 'busy'} onDismiss={openLogin} />
    </>
  );
}
