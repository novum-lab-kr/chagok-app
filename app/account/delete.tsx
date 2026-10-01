import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { router } from 'expo-router';
import { AccountDeletedScreen, DeleteAccountScreen, PixelDialogModal, accountDialogs } from '../../src/design-system';
import { goBackOrHome } from '../../src/app-data/goBack';
import { removeAllManagedPhotos } from '../../src/app-data/recordPhotos';
import { deleteAccountOnServer } from '../../src/sync/account';
import { getSupabase } from '../../src/sync/supabaseClient';
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
      await deleteAccountOnServer(supabase);
    } catch {
      setStep('failed');
      return;
    }
    await supabase.auth.signOut({ scope: 'local' });
    await wipeDevice(removeAllManagedPhotos);
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
