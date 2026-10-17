import { StyleSheet, type Animated, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { TopTabs, type MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import { FloatingTabBar, retro, type TabItem } from '../../src/design-system';
import { GoalsAdBanner } from '../../src/purchases/GoalsAdBanner';

type TabKey = 'index' | 'records' | 'stickers' | 'settings';
const TABS: readonly TabItem<TabKey>[] = [
  { key: 'index', label: '목표', icon: 'goal' },
  { key: 'records', label: '기록', icon: 'record' },
  { key: 'stickers', label: '스티커', icon: 'sticker' },
  { key: 'settings', label: '설정', icon: 'settings' },
];

/** 탭 바가 쓰는 만큼만. expo-router의 MaterialTopTabBarProps는 any라 직접 적는다 */
type AppTabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { tabBarStyle?: StyleProp<ViewStyle> } }>;
  navigation: MaterialTopTabBarProps['navigation'];
  position: Animated.AnimatedInterpolation<number>;
};

/**
 * 하단 탭 (2026-10-12 확정 시안: 떠 있는 바 + 살구색 아이콘, 목표·기록·스티커·설정).
 * 2026-10-15: 글자 없이 아이콘만, 누른 채 끌어서 고르기(탭 경계마다 가벼운 진동).
 * 판·기록·묶음 화면은 루트 스택에서 이 위에 쌓이므로 탭 바가 보이지 않는다.
 * 첫 실행 시작 화면·튜토리얼 동안은 목표 탭이 tabBarStyle display none으로 숨긴다(광고 배너도 같이).
 * 2026-10-17: 화면을 옆으로 밀어도 탭이 바뀐다. 화면이 손가락을 따라오고 바의 칸도 position을 따라 움직인다.
 * 화면 안의 가로 스크롤(기록 탭 목표 줄)은 그 줄만 움직인다.
 */
function AppTabBar({ state, descriptors, navigation, position }: AppTabBarProps) {
  const focused = state.routes[state.index];
  // 목표 탭은 애니메이션 없이 { display: 'none' }만 넘긴다
  const style = StyleSheet.flatten(descriptors[focused.key].options.tabBarStyle);
  if (style?.display === 'none') return null;
  return (
    <>
      <GoalsAdBanner visible={focused.name === 'index'} />
      <FloatingTabBar
        items={TABS}
        value={focused.name as TabKey}
        position={position}
        onTick={() => { void Haptics.selectionAsync().catch(() => {}); }}
        onChange={(key) => {
          const route = state.routes.find((r) => r.name === key);
          if (!route) return;
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (route.key !== focused.key && !event.defaultPrevented) navigation.navigate(route.name);
        }}
      />
    </>
  );
}

export default function TabLayout() {
  return (
    <TopTabs
      tabBarPosition="bottom"
      tabBar={(props: MaterialTopTabBarProps) => <AppTabBar {...props} />}
      // 네 탭을 처음부터 다 그려 둔다. 밀 때 옆 탭이 비어 보이지 않게(lazyPreloadDistance로는 처음 미는 옆 탭이 비었다)
      // 바를 누르거나 끌어 고르면 화면은 미끄러지지 않고 바로 바뀐다(밀기는 그대로 손가락을 따라온다).
      // 미끄러지게 두면 놓는 순간 넘김 위치가 이전 탭에서 출발해 바의 칸이 이전 자리로 튕겼다가 왔다 (2026-10-17 실기기 녹화)
      screenOptions={{ sceneStyle: { backgroundColor: retro.color.screen }, animationEnabled: false }}
    >
      <TopTabs.Screen name="index" />
      <TopTabs.Screen name="records" />
      <TopTabs.Screen name="stickers" />
      <TopTabs.Screen name="settings" />
    </TopTabs>
  );
}
