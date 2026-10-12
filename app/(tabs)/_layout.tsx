import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { FloatingTabBar, retro, type TabItem } from '../../src/design-system';

type TabKey = 'index' | 'records' | 'stickers' | 'settings';
const TABS: readonly TabItem<TabKey>[] = [
  { key: 'index', label: '목표', icon: 'goal' },
  { key: 'records', label: '기록', icon: 'record' },
  { key: 'stickers', label: '스티커', icon: 'sticker' },
  { key: 'settings', label: '설정', icon: 'settings' },
];

/**
 * 하단 탭 (2026-10-12 확정 시안: 떠 있는 바 + 살구색 아이콘, 목표·기록·스티커·설정).
 * 판·기록·묶음 화면은 루트 스택에서 이 위에 쌓이므로 탭 바가 보이지 않는다.
 * 첫 실행 시작 화면·튜토리얼 동안은 목표 탭이 tabBarStyle display none으로 숨긴다.
 */
function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const focused = state.routes[state.index];
  // 목표 탭은 애니메이션 없이 { display: 'none' }만 넘긴다
  const style = StyleSheet.flatten(descriptors[focused.key].options.tabBarStyle as StyleProp<ViewStyle>);
  if (style?.display === 'none') return null;
  return (
    <FloatingTabBar
      items={TABS}
      value={focused.name as TabKey}
      onChange={(key) => {
        const route = state.routes.find((r) => r.name === key);
        if (!route) return;
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (route.key !== focused.key && !event.defaultPrevented) navigation.navigate(route.name);
      }}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: retro.color.screen } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="records" />
      <Tabs.Screen name="stickers" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
