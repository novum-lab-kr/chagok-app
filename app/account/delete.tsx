import { useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { AccountDeletedScreen, DeleteAccountScreen, PixelDialogModal, accountDialogs } from '../../src/design-system';
import { goBackOrHome } from '../../src/app-data/goBack';
import { removeAllManagedPhotos } from '../../src/app-data/recordPhotos';
import { deleteAccountOnServer, signOutLocal } from '../../src/sync/account';
import { clearStoredSession, getSupabase } from '../../src/sync/supabaseClient';
import { pauseSync, resumeSync } from '../../src/sync/syncGate';
import { wipeDevice } from '../../src/sync/wipe';

type Step = 'review' | 'confirm' | 'busy' | 'failed' | 'done';

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
      }
      // 지운 계정의 토큰은 갱신되지 않아 로그아웃이 오류를 돌려줄 수 있다 — 저장된 세션을 직접 지운다
      await signOutLocal(supabase, clearStoredSession);
      await wipeDevice(removeAllManagedPhotos);
    } catch {
      setStep('failed');
      return;
    }
    resumeSync();
    setStep('done');
  };

  const close = () => { resumeSync(); setStep('review'); };

  if (step === 'done') return <AccountDeletedScreen onDone={() => router.replace('/')} />;

  return (
    <>
      <DeleteAccountScreen onDelete={() => setStep('confirm')} onCancel={goBackOrHome} onBack={goBackOrHome} />
      <PixelDialogModal
        visible={step === 'confirm' || step === 'busy'}
        {...accountDialogs.deleteAccount}
        loading={step === 'busy'}
        onRequestClose={() => setStep('review')}
        onPrimary={() => void run()}
        onSecondary={() => setStep('review')}
      />
      <PixelDialogModal
        visible={step === 'failed'}
        {...accountDialogs.deleteFailed}
        onRequestClose={close}
        onPrimary={() => void run()}
        onSecondary={close}
      />
    </>
  );
}
