import { useEffect } from 'react';
import { AppState, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { retro } from '../src/design-system';
import { RetroFontProvider } from '../src/design-system/RetroFontProvider';
import { setSetting } from '../src/repositories/appSettingsRepository';
import { recordSyncFailure, recordSyncSuccess } from '../src/sync/accountStatus';
import { syncDepsFor } from '../src/sync/appSync';
import { subscribeLocalChange } from '../src/sync/changes';
import { connectSync } from '../src/sync/connect';
import { pushOnce } from '../src/sync/push';
import { getSupabase } from '../src/sync/supabaseClient';
import { isSyncPaused, subscribeResume } from '../src/sync/syncGate';

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
    return connectSync({
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
          await pushOnce(await syncDepsFor(supabase, userId));
        } catch (error) {
          await recordSyncFailure();
          throw error; // 스케줄러가 다시 시도한다
        }
        await recordSyncSuccess();
      },
      rememberUser: (userId) => setSetting('accountUserId', userId),
      isPaused: isSyncPaused,
      onResume: subscribeResume,
    });
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
