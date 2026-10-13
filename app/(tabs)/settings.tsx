import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect, useRouter } from 'expo-router';
import {
  AccountBackupPanel, PixelDialogModal, PixelPanel, PixelText, PurchasePanel, RetroScreen, SettingRow, TabSafeArea, TabTitle, accountDialogs,
  stickerShopDialogs,
  type AccountBackupStatus,
} from '../../src/design-system';
import { removeAllManagedPhotos } from '../../src/app-data/recordPhotos';
import { signOutLocal } from '../../src/sync/account';
import { formatBackedUpAt, localOnlyCount, readAccountState } from '../../src/sync/accountStatus';
import { syncDepsFor } from '../../src/sync/appSync';
import { pendingCount } from '../../src/sync/outbox';
import { pushOnce } from '../../src/sync/push';
import { clearStoredSession, getSupabase } from '../../src/sync/supabaseClient';
import { pauseSync, resumeSync, subscribeSyncStatus } from '../../src/sync/syncGate';
import { wipeDevice } from '../../src/sync/wipe';
import { getSetting } from '../../src/repositories/appSettingsRepository';
import { loadPackState } from '../../src/repositories/packRepository';
import { buyAdFree, restorePurchases } from '../../src/purchases';
import { useDialog } from '../../src/app-data/useDialog';
import { usePrices } from '../../src/app-data/usePrices';
import { createSingleFlight } from '../../src/app-data/singleFlight';

type Logout = null | { step: 'confirm' | 'busy' | 'failed' } | { step: 'held'; count: number };

/** 앱 설정 (하단 탭 「설정」, 2026-10-12). 서버 설정이 있으면 「계정과 백업」 칸(시안 2C), 없으면 기기 저장 안내만. */
export default function AppSettings() {
  const nav = useRouter();
  const supabase = getSupabase();
  const [status, setStatus] = useState<AccountBackupStatus | null>(null);
  const [logout, setLogout] = useState<Logout>(null);
  /** 「구매」 블럭 (PRD 4.9·4.12). 키가 있으면 RevenueCat, 없으면 개발용 대역 (src/purchases). */
  const [adFree, setAdFree] = useState(false);
  const prices = usePrices();
  const [buyOnce] = useState(createSingleFlight);
  /** 기다리는 동안 누른 버튼에 로딩 점 (2026-10-13) */
  const [purchaseBusy, setPurchaseBusy] = useState<'adFree' | 'restore'>();
  const { ask, confirm, dialog: purchaseDialog } = useDialog();
  useFocusEffect(useCallback(() => {
    let alive = true;
    void loadPackState().then((p) => { if (alive) setAdFree(p.adFree); });
    return () => { alive = false; };
  }, []));
  /** 사기 전에 환불 안내 확인 창을 먼저 띄운다. 결제 창을 닫은 취소에는 알리지 않는다. */
  async function removeAds() {
    if (!(await confirm(stickerShopDialogs.confirmAdFree))) return;
    setPurchaseBusy('adFree');
    const r = await buyAdFree().finally(() => setPurchaseBusy(undefined));
    if (r.ok) setAdFree(true);
    else if (r.reason !== 'cancelled') await ask(r.reason === 'pending' ? stickerShopDialogs.purchasePending : stickerShopDialogs.adFreeFailed);
  }
  async function restore() {
    setPurchaseBusy('restore');
    let names: string[];
    try {
      names = await restorePurchases();
    } catch {
      await ask(stickerShopDialogs.restoreFailed);
      return;
    } finally {
      setPurchaseBusy(undefined);
    }
    if (names.includes('광고 제거')) setAdFree(true);
    await ask(names.length > 0 ? stickerShopDialogs.restoreDone(names) : stickerShopDialogs.restoreNone);
  }

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.auth.getSession();
    // 오프라인에서 토큰을 갱신하지 못한 것은 로그인이 풀린 게 아니다 — 연결한 계정 그대로 보여준다
    const sessionUser = error ? await getSetting('accountUserId') : data.session?.user.id ?? null;
    const s = await readAccountState(sessionUser);
    setStatus(s.state === 'synced'
      ? { state: 'synced', provider: s.provider, backedUpAt: formatBackedUpAt(s.lastSyncedAt, new Date()) }
      : s);
  }, [supabase]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => subscribeSyncStatus(() => { void load(); }), [load]);

  /** 서버 쪽 일이 끝난 뒤에만 기기를 비운다 (계정·백업 설계 ①). */
  const finishLogout = async () => {
    try {
      // 이 기기의 세션만 지우고, 로그아웃이 실패해도 저장된 세션을 지운다 (signOutLocal)
      if (supabase) await signOutLocal(supabase, clearStoredSession);
      await wipeDevice(removeAllManagedPhotos);
    } catch {
      setLogout({ step: 'failed' });
      return;
    }
    resumeSync();
    setLogout(null);
    router.replace('/');
  };

  /** 보내고 나서 남은 기록을 센다. 로그인이 풀렸으면 보낼 수 없으니 남은 기록 전부로 경고한다. */
  const runLogout = async () => {
    if (!supabase) return;
    setLogout({ step: 'busy' });
    pauseSync();
    let left: number;
    try {
      const { data, error } = await supabase.auth.getSession();
      // 오프라인이라 확인하지 못했으면 실패로 알린다 — 남은 기록을 전부 지운다고 잘못 경고하지 않게
      if (error) throw error;
      const user = data.session?.user;
      if (user) {
        await pushOnce(await syncDepsFor(supabase, user.id));
        left = (await pendingCount()).held;
      } else {
        left = await localOnlyCount();
      }
    } catch {
      // 실패 다이얼로그의 [닫기]가 잠금을 푼다 — 진행 중 다이얼로그에 갇히지 않게
      setLogout({ step: 'failed' });
      return;
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
    <TabSafeArea>
      <RetroScreen style={{ gap: 16 }} header={<TabTitle title="설정" />}>
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
        <PurchasePanel adFree={adFree} price={prices.adFree} busy={purchaseBusy} onRemoveAds={() => { void buyOnce(removeAds); }} onRestore={() => { void buyOnce(restore); }} />
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
      {purchaseDialog}
    </TabSafeArea>
  );
}
