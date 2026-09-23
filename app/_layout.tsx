import { Stack } from 'expo-router';
import { tokens } from '../src/theme/tokens';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tokens.color.paper },
        headerTintColor: tokens.color.ink,
        contentStyle: { backgroundColor: tokens.color.paper },
      }}
    >
      <Stack.Screen name="index" options={{ title: '차곡차곡' }} />
      <Stack.Screen name="goal/new" options={{ title: '새 목표', presentation: 'modal' }} />
      <Stack.Screen name="goal/[id]" options={{ title: '목표 설정' }} />
      <Stack.Screen name="sticker/[id]" options={{ title: '기록' }} />
    </Stack>
  );
}
