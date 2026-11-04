import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Platform, StyleSheet, View } from 'react-native';
import { Stack, useSegments, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { identifyUser, resetUser, screen, track } from '../src/analytics';
import { startAnalytics } from '../src/analytics/posthog';
import { reportScreenError, setErrorUser, startSentry, wrapRoot } from '../src/analytics/sentry';
import { LoadingScreen, SheetSafeArea, SplashAnimation, retro } from '../src/design-system';
import { goHome } from '../src/app-data/goBack';
import { removeManagedRecordPhoto } from '../src/app-data/recordPhotos';
import { applyDeviceLanguage, useDeviceLanguage } from '../src/i18n/device';
import { RetroFontProvider } from '../src/design-system/RetroFontProvider';
import { configureAds } from '../src/purchases/admob';
import { configureRevenueCat, linkPurchaseAccount } from '../src/purchases/revenueCat';
import { setDevPurchaseChooser } from '../src/purchases/devStore';
import { loadPrices, refreshSubscription } from '../src/purchases';
import { signOutLocal } from '../src/sync/account';
import { recordSyncFailure, recordSyncSuccess } from '../src/sync/accountStatus';
import { syncDepsFor } from '../src/sync/appSync';
import { subscribeLocalChange } from '../src/sync/changes';
import { connectSync, syncRound } from '../src/sync/connect';
import { AccountChanged } from '../src/sync/pull';
import { recoverInterruptedConnect, rememberAccount } from '../src/sync/connectMarker';
import { clearStoredSession, getSupabase } from '../src/sync/supabaseClient';
import { isSyncPaused, requestSync, subscribeResume } from '../src/sync/syncGate';
import { startWidgetSync } from '../src/widgets/syncWidgets';
import { startWatchSync } from '../src/watch/syncWatch';

// 어떤 화면이 문구를 읽기 전에 언어부터 정한다.
applyDeviceLanguage();
// OS 스플래시(윤곽선만 있는 차곡이)를 앱이 그릴 때까지 잡아 둔다. 같은 자리의 애니메이션 첫 장면이
// 그려지는 순간 페이드 없이 내려서 끊김 없이 이어지게 한다 (docs/design/character/README.md 「스플래시」).
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 0, fade: false });
// 오류 수집은 다른 준비보다 먼저 켠다 — 그 준비에서 나는 오류도 받는다.
startSentry();
startAnalytics().catch(() => { /* 기록 실패가 앱을 막으면 안 된다 */ });
// 결제는 화면보다 먼저 준비한다. 키나 결제 모듈이 없으면 개발용 대역 그대로 (src/purchases/revenueCat.ts).
configureRevenueCat();
// 결제 키가 없는 빌드(개발, preview)는 개발용 대역을 쓴다. 결제마다 결과를 고르는 창을 띄워 몰래 공짜로 열리지 않게 한다
setDevPurchaseChooser((what) => new Promise((resolve) => {
  Alert.alert('시험 결제', `${what}: 결과를 고르세요. 실제 결제는 일어나지 않아요.`, [
    { text: '성공', onPress: () => resolve('success') },
    { text: '실패', onPress: () => resolve('failed') },
    { text: '보호자 승인 대기', onPress: () => resolve('pending') },
    { text: '취소', style: 'cancel', onPress: () => resolve('cancelled') },
  ], { cancelable: true, onDismiss: () => resolve('cancelled') });
}));
// 가격은 앱을 켤 때 한 번 받아 둔다 — 상점 화면이 처음부터 가격을 그린다
void loadPrices();
// 구독 상태를 스토어에 물어 기기에 맞춘다. 못 물으면 저장한 값으로 판단한다 (구독 설계 4.3)
void refreshSubscription();
void configureAds();

/**
 * 애니메이션 첫 장면이 그려지면 OS 스플래시를 내린다. 새 아키텍처는 기기가 바쁠 때 첫 layout 이벤트를 버리므로
 * (useLayoutSize 참고) 다음 프레임에도 한 번 더 내린다 — 그러지 않으면 OS 스플래시가 내려가지 않는다.
 */
function SplashOverlay({ onShown, onDone }: { onShown: () => void; onDone: () => void }) {
  useEffect(() => {
    const id = requestAnimationFrame(onShown);
    return () => cancelAnimationFrame(id);
  }, [onShown]);
  return (
    <View style={StyleSheet.absoluteFill} onLayout={onShown}>
      <SplashAnimation onDone={onDone} />
    </View>
  );
}

/**
 * 네비게이터 헤더는 끈다. 화면마다 레트로 헤더(`ScreenHeader`, 홈의 브랜드 줄)를 직접 그리기
 * 때문에, 켜두면 제목과 뒤로가기가 두 벌씩 나온다. 상단 여백은 `RetroScreen`이 세이프에어리어로
 * 처리한다. 픽셀 폰트를 불러오기 전에는 대체 폰트로 그리지 않는다 (DESIGN-SYSTEM.md).
 */
/**
 * 어느 화면으로 시작하든(링크로 켜짐, 개발 중 다시 불러오기) 홈을 맨 아래에 둔다. 없으면 새 목표 같은 시트 화면이
 * 첫 화면이 되어 전체 화면으로 뜨고, 시트용으로 0으로 둔 위쪽 여백 때문에 헤더가 시계와 겹쳤다 (2026-10-10 실기기).
 */
export const unstable_settings = { anchor: '(tabs)' };

/**
 * 화면을 그리다 예외가 나면 빈 화면 대신 같은 안내를 보인다 (PRD 7절). [다시 시도]는 그 화면을 다시 그린다.
 * https://docs.expo.dev/versions/v57.0.0/sdk/router/ 「ErrorBoundary」
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => { reportScreenError(error); }, [error]);
  return (
    <SafeAreaProvider>
      <LoadingScreen failed kind="screen" onRetry={() => { void retry(); }} onHome={goHome} />
    </SafeAreaProvider>
  );
}

/** 이벤트 기록과 오류 수집에 지금 계정을 알린다. null이면 로그아웃이다. */
function setAnalyticsAccount(userId: string | null): void {
  if (userId) identifyUser(userId);
  else resetUser();
  setErrorUser(userId).catch(() => { /* 기록 실패가 앱을 막으면 안 된다 */ });
}

function RootLayout() {
  const language = useDeviceLanguage();
  // 화면 이름은 라우트 패턴(goal/[id])이라 목표 ID가 나가지 않는다.
  const segments = useSegments();
  const screenName = `/${segments.join('/')}`;
  useEffect(() => { screen(screenName); }, [screenName]);
  useEffect(() => {
    track('app_open', { source: 'cold' });
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      track('app_open', { source: 'foreground' });
      void refreshSubscription();
    });
    return () => sub.remove();
  }, []);
  // 앱을 처음 켤 때만 재생한다. 백그라운드에서 돌아올 때는 이 레이아웃이 다시 만들어지지 않는다.
  const [splashDone, setSplashDone] = useState(false);
  const finishSplash = useCallback(() => setSplashDone(true), []);
  const handOff = useCallback(() => { SplashScreen.hideAsync().catch(() => {}); }, []);
  // 위젯과 워치에서 누른 스티커를 기록에 반영하고 위젯과 워치를 맞춘다 (위젯 설계 「위젯에서 붙이기」, PRD 4.14). DB 준비가 끝난 뒤.
  useEffect(() => {
    if (!splashDone) return;
    const stopWidgets = startWidgetSync();
    const stopWatch = startWatchSync();
    return () => { stopWidgets(); stopWatch(); };
  }, [splashDone]);
  // 구매를 로그인한 계정에 묶는다 — 다른 기기에서 [구매 복원]하면 되살아난다 (2026-10-13).
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    const onAccount = (userId: string | null) => {
      void linkPurchaseAccount(userId);
      setAnalyticsAccount(userId);
    };
    void supabase.auth.getSession().then(({ data }) => onAccount(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { onAccount(session?.user.id ?? null); });
    return () => data.subscription.unsubscribe();
  }, []);
  // 로그인해 있는 동안만 백업을 올린다 (계정·백업 설계 ②). 서버 설정이 없으면 기기에서만 쓴다.
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let stop: (() => void) | null = null;
    let alive = true;
    /** 끝나지 않은 연결을 되돌리지 못했다(저장소 오류). 되돌릴 때까지 전송을 따로 잠근다 — 다른 흐름의 resumeSync로 풀리지 않게. */
    let recoveryFailed = false;
    // 연결 도중 꺼졌으면 그 연결을 먼저 되돌린다 — 전송을 켜기 전에 (connectMarker)
    const recover = () => recoverInterruptedConnect(() => signOutLocal(supabase, clearStoredSession))
      .then(() => {
        const wasFailed = recoveryFailed;
        recoveryFailed = false;
        if (wasFailed) requestSync(); // 잠긴 동안 미룬 전송을 보낸다
      })
      .catch(() => { recoveryFailed = true; });
    // 되돌리지 못했으면 앱이 앞으로 올 때 다시 되돌려 본다. 사용자가 연결하는 중이면(잠금) 그 연결을 건드리지 않는다.
    const retry = AppState.addEventListener('change', (state) => {
      if (state === 'active' && recoveryFailed && !isSyncPaused()) void recover();
    });
    void recover().finally(() => {
      if (!alive) return;
      stop = connectSync({
        onAuthChange: (fn) => {
          void supabase.auth.getSession().then(({ data }) => fn(data.session?.user.id ?? null));
          const { data } = supabase.auth.onAuthStateChange((_event, session) => fn(session?.user.id ?? null));
          return () => data.subscription.unsubscribe();
        },
        onAppActive: (fn) => {
          const sub = AppState.addEventListener('change', (state) => fn(state === 'active'));
          return () => sub.remove();
        },
        isAppActive: () => AppState.currentState === 'active',
        onLocalChange: subscribeLocalChange,
        makeRun: (userId) => async () => {
          try {
            // 토큰을 갱신하지 못했으면(오프라인) 실패로 남겨 스케줄러가 다시 시도하게 한다
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            // 로그아웃이 실패해 세션 정리만 했으면 이 스케줄러는 지난 사용자 것이다 — 보내지 않는다
            if (data.session?.user.id !== userId) return;
            // 도는 사이 연결 화면이 계정을 바꾸면 받은 것을 쓰기 전에 멈춘다(AccountChanged)
            const currentUserId = async () => (await supabase.auth.getSession()).data.session?.user.id ?? null;
            await syncRound({ ...await syncDepsFor(supabase, userId), currentUserId }, userId, removeManagedRecordPhoto);
          } catch (error) {
            // 지난 계정의 회차다. 실패도 성공도 남기지 않는다 — 새 계정 스케줄러가 다시 돈다
            if (error instanceof AccountChanged) return;
            await recordSyncFailure();
            throw error; // 스케줄러가 다시 시도한다
          }
          await recordSyncSuccess();
        },
        rememberUser: rememberAccount,
        isPaused: () => isSyncPaused() || recoveryFailed,
        onResume: subscribeResume,
      });
    });
    return () => { alive = false; retry.remove(); stop?.(); };
  }, []);

  return (
    <SafeAreaProvider>
      <RetroFontProvider loading={<View style={{ flex: 1, backgroundColor: retro.color.screen }} />}>
        <Stack
          key={language}
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: retro.color.screen },
          }}
          // iOS 시트는 상태 표시줄 아래에서 시작한다. Android 모달은 화면 전체라 위쪽 여백이 필요하다.
          screenLayout={({ options, children }) =>
            options.presentation === 'modal' && Platform.OS === 'ios'
              ? <SheetSafeArea>{children}</SheetSafeArea>
              : <>{children}</>}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="goal/new" options={{ presentation: 'modal' }} />
          {/* 판을 좌우로 밀어 쪽과 달을 넘긴다. iOS 26은 화면 안쪽에서 오른쪽으로 밀어도 뒤로 가서 판 밀기를 가로챈다. 가장자리 뒤로 가기는 남긴다 (2026-11-03) */}
          <Stack.Screen name="goal/[id]/index" options={{ fullScreenGestureEnabled: false }} />
          <Stack.Screen name="goal/[id]/settings" />
          <Stack.Screen name="goal/[id]/extend" />
          <Stack.Screen name="sticker/[id]" />
          <Stack.Screen name="records/feed" />
          <Stack.Screen name="stickers/choose" options={{ presentation: 'modal' }} />
          <Stack.Screen name="stickers/pack/[packId]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="subscription" options={{ presentation: 'modal' }} />
          <Stack.Screen name="tutorial" />
          <Stack.Screen name="send-info" />
          <Stack.Screen name="policies/index" />
          <Stack.Screen name="policies/[license]" />
          <Stack.Screen name="account/connect" />
          <Stack.Screen name="account/delete" />
          <Stack.Screen name="dev/sync" />
        </Stack>
        {/* 글꼴이 준비된 뒤에 그려야 "차곡차곡" 글자가 대체 글꼴로 나오지 않는다 — 그동안은 OS 스플래시가 남아 있다. */}
        {splashDone ? null : (
          <SplashOverlay onShown={handOff} onDone={finishSplash} />
        )}
      </RetroFontProvider>
    </SafeAreaProvider>
  );
}

export default wrapRoot(RootLayout);
