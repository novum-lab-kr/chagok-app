import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect, useRouter } from 'expo-router';
import {
  AccountBackupPanel, PixelDialogModal, PixelPanel, PixelText, RetroScreen, ScreenHeader, SettingRow, accountDialogs,
  type AccountBackupStatus,
} from '../src/design-system';
import { goBackOrHome } from '../src/app-data/goBack';
import { removeAllManagedPhotos } from '../src/app-data/recordPhotos';
import { formatBackedUpAt, localOnlyCount, readAccountState } from '../src/sync/accountStatus';
import { syncDepsFor } from '../src/sync/appSync';
import { pendingCount } from '../src/sync/outbox';
import { pushOnce } from '../src/sync/push';
import { getSupabase } from '../src/sync/supabaseClient';
import { pauseSync, resumeSync, subscribeSyncStatus } from '../src/sync/syncGate';
import { wipeDevice } from '../src/sync/wipe';

type Logout = null | { step: 'confirm' | 'busy' | 'failed' } | { step: 'held'; count: number };

/** 앱 설정. 서버 설정이 있으면 「계정과 백업」 칸(시안 2C), 없으면 기기 저장 안내만. */
export default function AppSettings() {
  const nav = useRouter();
  const supabase = getSupabase();
  const [status, setStatus] = useState<AccountBackupStatus | null>(null);
  const [logout, setLogout] = useState<Logout>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const s = await readAccountState(data.session?.user.id ?? null);
    setStatus(s.state === 'synced'
      ? { state: 'synced', provider: s.provider, backedUpAt: s.lastSyncedAt ? formatBackedUpAt(s.lastSyncedAt, new Date()) : '방금' }
      : s);
  }, [supabase]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => subscribeSyncStatus(() => { void load(); }), [load]);

  /** 서버 쪽 일이 끝난 뒤에만 기기를 비운다 (계정·백업 설계 ①). */
  const finishLogout = async () => {
    await supabase?.auth.signOut();
    await wipeDevice(removeAllManagedPhotos);
    resumeSync();
    setLogout(null);
    router.replace('/');
  };

  /** 보내고 나서 남은 기록을 센다. 로그인이 풀렸으면 보낼 수 없으니 남은 기록 전부로 경고한다. */
  const runLogout = async () => {
    if (!supabase) return;
    setLogout({ step: 'busy' });
    pauseSync();
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    let left: number;
    if (user) {
      try {
        await pushOnce(await syncDepsFor(supabase, user.id));
      } catch {
        setLogout({ step: 'failed' });
        return;
      }
      left = (await pendingCount()).held;
    } else {
      left = await localOnlyCount();
    }
    if (left > 0) setLogout({ step: 'held', count: left });
    else await finishLogout();
  };

  const closeLogout = () => { resumeSync(); setLogout(null); };

  const logoutDialog = (() => {
    if (!logout) return null;
    if (logout.step === 'failed') {
      return { ...accountDialogs.logoutFailed, onPrimary: () => void runLogout(), onSecondary: closeLogout, onRequestClose: closeLogout };
    }
    if (logout.step === 'held') {
      return { ...accountDialogs.logoutHeld(logout.count), onPrimary: () => void finishLogout(), onSecondary: closeLogout, onRequestClose: closeLogout };
    }
    return {
      ...accountDialogs.logout, loading: logout.step === 'busy',
      onPrimary: () => void runLogout(), onSecondary: () => setLogout(null), onRequestClose: () => setLogout(null),
    };
  })();

  return (
    <>
      <RetroScreen style={{ gap: 16 }} header={<ScreenHeader title="앱 설정" onBack={goBackOrHome} />}>
        {supabase ? (
          status && (
            <AccountBackupPanel
              status={status}
              onConnect={() => nav.push({ pathname: '/account/connect', params: { from: 'settings' } })}
              onLogin={() => nav.push({ pathname: '/account/connect', params: { from: 'relogin' } })}
              onLogout={() => setLogout({ step: 'confirm' })}
              onDelete={() => nav.push('/account/delete')}
            />
          )
        ) : (
          <PixelPanel title="이 기기의 기록">
            <PixelText>지금은 이 기기에만 저장하고 있어요.</PixelText>
          </PixelPanel>
        )}
        <PixelPanel title="도움말">
          <SettingRow label="사용법 다시 보기" onPress={() => nav.push('/tutorial')} />
        </PixelPanel>
        <PixelPanel title="정보">
          <SettingRow label="약관과 라이선스" onPress={() => nav.push('/policies')} />
        </PixelPanel>
        {__DEV__ && supabase && (
          <PixelPanel title="개발">
            <SettingRow label="서버 동기화 (개발)" onPress={() => nav.push('/dev/sync')} />
          </PixelPanel>
        )}
      </RetroScreen>
      {logoutDialog && <PixelDialogModal visible {...logoutDialog} />}
    </>
  );
}
