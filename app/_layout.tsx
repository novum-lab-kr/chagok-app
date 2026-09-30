import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { tokens } from '../src/theme/tokens';

/**
 * 네비게이터 헤더는 끈다. 화면마다 레트로 헤더(`ScreenHeader`, 홈의 브랜드 줄)를 직접 그리기
 * 때문에, 켜두면 제목과 뒤로가기가 두 벌씩 나온다. 상단 여백은 `RetroScreen`이 세이프에어리어로
 * 처리한다.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tokens.color.paper },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="goal/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="goal/[id]" />
        <Stack.Screen name="sticker/[id]" />
      </Stack>
    </SafeAreaProvider>
  );
}
