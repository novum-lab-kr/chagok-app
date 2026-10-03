import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { AccountStartScreen, FirstRunTutorial, GoalListScreen, PixelLoadingIndicator, RetroScreen, accountDialogs } from '../src/design-system';
import type { AccountStartChoice, GoalListTab } from '../src/design-system';
import { listGoalSummaries, settleExpiredPeriods } from '../src/repositories/goalRepository';
import type { GoalSummary } from '../src/repositories/goalRepository';
import { getFlag, getSetting, setFlag, setSetting } from '../src/repositories/appSettingsRepository';
import { useDialog } from '../src/app-data/useDialog';
import { readAccountState } from '../src/sync/accountStatus';
import { getSupabase } from '../src/sync/supabaseClient';
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
  /** 첫 실행 시작 화면 (시안 1B). 로그아웃·계정 삭제 뒤에도 기기가 비워져 다시 나온다. */
  const [showStart, setShowStart] = useState<boolean | undefined>(undefined);
  const [startChoice, setStartChoice] = useState<AccountStartChoice>('account');
  const { ask, dialog } = useDialog();

  // 연결 화면에서 돌아오거나 로그아웃 뒤 홈으로 오면 다시 읽는다
  useFocusEffect(useCallback(() => {
    let alive = true;
    void (async () => {
      const tutorialDone = await getFlag('tutorialDone');
      // 튜토리얼을 마친 기존 설치에는 띄우지 않는다. 서버 설정이 없으면 계정을 연결할 수 없으니 건너뛴다.
      const start = Boolean(getSupabase()) && !(await getFlag('startDone')) && !tutorialDone;
      if (!alive) return;
      setShowStart(start);
      setShowTutorial(!tutorialDone);
    })();
    return () => { alive = false; };
  }, []));

  // 로그인이 풀렸으면 앱을 열 때 한 번만 묻는다. 그 뒤로는 앱 설정의 계정 칸이 안내한다 (시안 2C).
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let alive = true;
    void (async () => {
      const { data, error } = await supabase.auth.getSession();
      // 오프라인에서 토큰을 갱신하지 못한 것은 로그인이 풀린 게 아니다 — 한 번뿐인 안내를 쓰지 않는다
      if (error) return;
      const state = await readAccountState(data.session?.user.id ?? null);
      const userId = await getSetting('accountUserId');
      if (!alive || state.state !== 'needsLogin' || !userId || (await getSetting('sessionPrompted')) === userId) return;
      await setSetting('sessionPrompted', userId);
      if ((await ask(accountDialogs.session)) === 'primary') {
        router.push({ pathname: '/account/connect', params: { from: 'relogin' } });
      }
    })();
    return () => { alive = false; };
  }, [ask, router]);

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

  if (!summaries || showTutorial === undefined || showStart === undefined) {
    return (
      <RetroScreen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <PixelLoadingIndicator label="불러오는 중" />
        </View>
      </RetroScreen>
    );
  }

  if (showStart) {
    return (
      <AccountStartScreen
        value={startChoice}
        onChange={setStartChoice}
        onContinue={() => {
          if (startChoice === 'account') {
            router.push({ pathname: '/account/connect', params: { from: 'start' } });
            return;
          }
          setShowStart(false);
          void setFlag('startDone', true);
        }}
      />
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
    <>
      <GoalListScreen
        tab={tab}
        onTab={setTab}
        active={cards(active)}
        completed={cards(completed)}
        onOpen={(id) => router.push({ pathname: '/goal/[id]', params: { id } })}
        onAdd={() => router.push('/goal/new')}
        onSettings={() => router.push('/settings')}
      />
      {dialog}
    </>
  );
}
