import { useEffect } from 'react';
import { AppState, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { retro } from '../src/design-system';
import { RetroFontProvider } from '../src/design-system/RetroFontProvider';
import { signOutLocal } from '../src/sync/account';
import { recordSyncFailure, recordSyncSuccess } from '../src/sync/accountStatus';
import { syncDepsFor } from '../src/sync/appSync';
import { subscribeLocalChange } from '../src/sync/changes';
import { connectSync } from '../src/sync/connect';
import { recoverInterruptedConnect, rememberAccount } from '../src/sync/connectMarker';
import { pushOnce } from '../src/sync/push';
import { clearStoredSession, getSupabase } from '../src/sync/supabaseClient';
import { isSyncPaused, kickSync, subscribeResume } from '../src/sync/syncGate';

/**
 * 네비게이터 헤더는 끈다. 화면마다 레트로 헤더(`ScreenHeader`, 홈의 브랜드 줄)를 직접 그리기
 * 때문에, 켜두면 제목과 뒤로가기가 두 벌씩 나온다. 상단 여백은 `RetroScreen`이 세이프에어리어로
 * 처리한다. 픽셀 폰트를 불러오기 전에는 대체 폰트로 그리지 않는다 (DESIGN-SYSTEM.md).
 */
export default function RootLayout() {
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
        if (wasFailed) kickSync(); // 잠긴 동안 미룬 전송을 보낸다
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
        onLocalChange: subscribeLocalChange,
        makeRun: (userId) => async () => {
          try {
            // 토큰을 갱신하지 못했으면(오프라인) 실패로 남겨 스케줄러가 다시 시도하게 한다
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            // 로그아웃이 실패해 세션 정리만 했으면 이 스케줄러는 지난 사용자 것이다 — 보내지 않는다
            if (data.session?.user.id !== userId) return;
            await pushOnce(await syncDepsFor(supabase, userId));
          } catch (error) {
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
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: retro.color.screen },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="goal/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="goal/[id]/index" />
          <Stack.Screen name="goal/[id]/settings" />
          <Stack.Screen name="goal/[id]/extend" />
          <Stack.Screen name="sticker/[id]" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="tutorial" />
          <Stack.Screen name="policies/index" />
          <Stack.Screen name="policies/[license]" />
          <Stack.Screen name="account/connect" />
          <Stack.Screen name="account/delete" options={{ gestureEnabled: false }} />
          <Stack.Screen name="dev/sync" />
        </Stack>
      </RetroFontProvider>
    </SafeAreaProvider>
  );
}
