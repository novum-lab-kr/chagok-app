import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { AccountStartScreen, FirstRunTutorial, GoalListScreen, LoadingScreen, TabSafeArea, TrialReadyCard, accountDialogs, useLoadRetry } from '../../src/design-system';
import type { AccountStartChoice, GoalListTab } from '../../src/design-system';
import { listGoalSummaries, settleExpiredPeriods } from '../../src/repositories/goalRepository';
import type { GoalSummary } from '../../src/repositories/goalRepository';
import { getFlag, getSetting, setFlag, setSetting } from '../../src/repositories/appSettingsRepository';
import { useDialog } from '../../src/app-data/useDialog';
import { readAccountState } from '../../src/sync/accountStatus';
import { getSupabase } from '../../src/sync/supabaseClient';
import { orderGoals } from '../../src/domain/board';
import { goalCard } from '../../src/app-data/pocketAdapter';
import { localDateKey } from '../../src/domain/dates';
import { fetchPolicyManifest } from '../../src/policy/manifest';
import { openPolicy } from '../../src/policy/openPolicy';
import { monthDayLabel, upcomingChange } from '../../src/policy/versions';
import { subscribeWidgetApplied } from '../../src/widgets/applied';
import { loadPackState } from '../../src/repositories/packRepository';
import { reachedThreshold, showTrialReadyCard } from '../../src/domain/packs';

/** 홈 = 목표 탭 (PRD 4.1, 2026-10-12 하단 탭). 목표를 누르면 판 상세를 연다. 목표가 1개여도 목록을 거친다. */
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
  const { failed, attempt, fail, retry } = useLoadRetry();
  /** 로그인 풀림 안내가 끝났는지. true면 연결 화면으로 떠났다. 약관 안내가 그 뒤에 이어 묻도록 기다린다. */
  const sessionCheck = useRef<Promise<boolean>>(Promise.resolve(false));
  /** 체험 열림 카드에 보일 문턱(7, 14…). null이면 숨긴다 (2026-10-12). */
  const [trial, setTrial] = useState<number | null>(null);
  const navigation = useNavigation();

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
    })().catch(() => { if (alive) fail(); });
    return () => { alive = false; };
  // attempt는 [다시 시도] 때 다시 읽게 하는 신호라 콜백 안에서 쓰지 않는다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, fail]));

  // 로그인이 풀렸으면 앱을 열 때 한 번만 묻는다. 그 뒤로는 앱 설정의 계정 칸이 안내한다 (시안 2C).
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let alive = true;
    sessionCheck.current = (async () => {
      const { data, error } = await supabase.auth.getSession();
      // 오프라인에서 토큰을 갱신하지 못한 것은 로그인이 풀린 게 아니다 — 한 번뿐인 안내를 쓰지 않는다
      if (error) return false;
      const state = await readAccountState(data.session?.user.id ?? null);
      const userId = await getSetting('accountUserId');
      if (!alive || state.state !== 'needsLogin' || !userId || (await getSetting('sessionPrompted')) === userId) return false;
      await setSetting('sessionPrompted', userId);
      if ((await ask(accountDialogs.session)) === 'primary') {
        router.push({ pathname: '/account/connect', params: { from: 'relogin' } });
        return true;
      }
      return false;
    })().catch(() => false);
    return () => { alive = false; };
  }, [ask, router]);

  // 약관이 바뀌기 전(게시일~시행일 전날)에 앱을 열면 한 번 알린다. 목록을 받지 못하면 건너뛴다 — 앱 사용을 막지 않는다.
  // 시작 화면·튜토리얼 중에는 띄우지 않는다. 처음 쓰는 사람에게 「바뀌어요」는 맞지 않는다.
  const firstRun = showStart !== false || showTutorial !== false;
  useEffect(() => {
    if (firstRun) return;
    let alive = true;
    void (async () => {
      try {
        if (await sessionCheck.current) return;
        const today = localDateKey(Date.now());
        const change = upcomingChange((await fetchPolicyManifest()).terms, today, Number(await getSetting('termsNoticeSeen') ?? 0));
        if (!alive || !change) return;
        await setSetting('termsNoticeSeen', String(change.version));
        if ((await ask(accountDialogs.termsChanged(monthDayLabel(change.effectiveAt)))) === 'secondary') {
          await openPolicy('terms', ask);
        }
      } catch {
        // 오프라인·사이트 오류: 다음에 열 때 다시 본다
      }
    })();
    return () => { alive = false; };
  }, [ask, firstRun]);

  // 판 상세·새 목표에서 돌아올 때마다 다시 읽는다. 떠난 뒤 도착한 응답은 버린다.
  useFocusEffect(useCallback(() => {
    let alive = true;
    void (async () => {
      const now = new Date();
      await settleExpiredPeriods(now);
      const next = await listGoalSummaries(now);
      if (alive) setSummaries(next);
      const pack = await loadPackState();
      const dismissed = Number(await getSetting('trialCardDismissed') ?? 0);
      if (alive) setTrial(showTrialReadyCard(pack.days, pack.claimed, dismissed) ? reachedThreshold(pack.days) : null);
    })().catch(() => { if (alive) fail(); });
    return () => { alive = false; };
  // attempt는 [다시 시도] 때 다시 읽게 하는 신호라 콜백 안에서 쓰지 않는다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, fail]));

  // 앱이 앞으로 올 때 위젯 탭이 기록에 반영되면 포커스가 바뀌지 않아도 다시 읽는다 — 진행률·오늘 붙임 표시가 이전 값으로 남지 않게.
  useEffect(() => subscribeWidgetApplied(() => {
    void listGoalSummaries(new Date()).then(setSummaries);
  }), []);

  // 시작 화면·튜토리얼·불러오는 동안은 하단 탭을 숨긴다. 첫 실행은 탭보다 먼저 끝내야 한다.
  const hideTabBar = !summaries || showTutorial !== false || showStart !== false;
  useEffect(() => {
    navigation.setOptions({ tabBarStyle: hideTabBar ? { display: 'none' } : undefined });
  }, [navigation, hideTabBar]);

  if (!summaries || showTutorial === undefined || showStart === undefined) {
    return <LoadingScreen failed={failed} kind="goals" onRetry={retry} />;
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

  const closeTrial = () => {
    if (trial === null) return;
    setTrial(null);
    void setSetting('trialCardDismissed', String(trial));
  };

  return (
    <TabSafeArea>
      <GoalListScreen
        tab={tab}
        onTab={setTab}
        active={cards(active)}
        completed={cards(completed)}
        onOpen={(id) => router.push({ pathname: '/goal/[id]', params: { id } })}
        onAdd={() => router.push('/goal/new')}
        notice={tab === 'active' && trial !== null
          ? <TrialReadyCard days={trial} onChoose={() => router.navigate('/stickers')} onClose={closeTrial} />
          : undefined}
      />
      {dialog}
    </TabSafeArea>
  );
}
