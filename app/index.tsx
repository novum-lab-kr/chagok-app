import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { FirstRunTutorial, GoalListScreen, PixelLoadingIndicator, RetroScreen } from '../src/design-system';
import type { GoalListTab } from '../src/design-system';
import { listGoalSummaries, settleExpiredPeriods } from '../src/repositories/goalRepository';
import type { GoalSummary } from '../src/repositories/goalRepository';
import { getFlag, setFlag } from '../src/repositories/appSettingsRepository';
import { orderGoals } from '../src/domain/board';
import { goalCard } from '../src/app-data/pocketAdapter';

/** 홈 = 목표 목록 (PRD 4.1). 목표를 누르면 판 상세를 연다. 목표가 1개여도 목록을 거친다. */
export default function GoalList() {
  const router = useRouter();
  const { tab: initialTab } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<GoalListTab>(initialTab === 'completed' ? 'completed' : 'active');
  const [summaries, setSummaries] = useState<GoalSummary[] | null>(null);
  /** undefined = 아직 모름. 값을 읽기 전에 튜토리얼을 띄우지 않는다. */
  const [showTutorial, setShowTutorial] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    void (async () => setShowTutorial(!(await getFlag('tutorialDone'))))();
  }, []);

  // 판 상세·새 목표에서 돌아올 때마다 다시 읽는다. 떠난 뒤 도착한 응답은 버린다.
  useFocusEffect(useCallback(() => {
    let alive = true;
    void (async () => {
      const now = new Date();
      await settleExpiredPeriods(now);
      const next = await listGoalSummaries(now);
      if (alive) setSummaries(next);
    })();
    return () => { alive = false; };
  }, []));

  if (!summaries || showTutorial === undefined) {
    return (
      <RetroScreen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <PixelLoadingIndicator label="불러오는 중" />
        </View>
      </RetroScreen>
    );
  }

  if (showTutorial) {
    return <FirstRunTutorial onFinish={() => { setShowTutorial(false); void setFlag('tutorialDone', true); }} />;
  }

  const now = new Date();
  const byId = new Map(summaries.map((s) => [s.goal.id, s]));
  const { active, completed } = orderGoals(summaries.map((s) => s.goal));
  const cards = (goals: typeof active) => goals.map((g) => goalCard(byId.get(g.id)!, now));

  return (
    <GoalListScreen
      tab={tab}
      onTab={setTab}
      active={cards(active)}
      completed={cards(completed)}
      onOpen={(id) => router.push({ pathname: '/goal/[id]', params: { id } })}
      onAdd={() => router.push('/goal/new')}
      onSettings={() => router.push('/settings')}
    />
  );
}
