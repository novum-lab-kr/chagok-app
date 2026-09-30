import { View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { retro } from '../src/design-system';
import { RetroFontProvider } from '../src/design-system/RetroFontProvider';

/**
 * 네비게이터 헤더는 끈다. 화면마다 레트로 헤더(`ScreenHeader`, 홈의 브랜드 줄)를 직접 그리기
 * 때문에, 켜두면 제목과 뒤로가기가 두 벌씩 나온다. 상단 여백은 `RetroScreen`이 세이프에어리어로
 * 처리한다. 픽셀 폰트를 불러오기 전에는 대체 폰트로 그리지 않는다 (DESIGN-SYSTEM.md).
 */
export default function RootLayout() {
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
        </Stack>
      </RetroFontProvider>
    </SafeAreaProvider>
  );
}
