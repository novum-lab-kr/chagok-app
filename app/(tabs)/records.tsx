import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { LoadingScreen, RecordTimelineScreen, TabSafeArea, useLoadRetry, type RecordView } from '../../src/design-system';
import { timelineGoals } from '../../src/app-data/recordTimeline';
import { timelineDayViews } from '../../src/app-data/recordTimelineView';
import { getSetting, setSetting } from '../../src/repositories/appSettingsRepository';
import { listRecordTimeline, type TimelineEntry } from '../../src/repositories/recordRepository';
import { normalizeStickerId } from '../../src/stickers/stickerIds';

/** 기록 탭 (2026-10-12): 사진이나 메모가 있는 칸만 날짜별로. 누르면 그 칸의 기록 화면. 2026-10-17: 피드 보기, 고른 보기는 이 기기에 기억한다. */
export default function Records() {
  const router = useRouter();
  const [entries, setEntries] = useState<TimelineEntry[] | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [view, setView] = useState<RecordView | null>(null);
  const { failed, attempt, fail, retry } = useLoadRetry();

  // 옆 탭에서 밀어 올 때 빈 화면이 보이지 않게 처음 그릴 때도 한 번 읽는다. 들어오면 아래에서 다시 읽는다.
  useEffect(() => {
    let alive = true;
    void Promise.all([listRecordTimeline(), getSetting('recordsView')]).then(([next, saved]) => {
      if (!alive) return;
      setEntries((e) => e ?? next);
      setView((current) => current ?? (saved === 'feed' ? 'feed' : 'timeline'));
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // 기록 화면에서 고치고 돌아오거나 다른 탭에서 붙이고 오면 다시 읽는다.
  useFocusEffect(useCallback(() => {
    let alive = true;
    void Promise.all([listRecordTimeline(), getSetting('recordsView')])
      .then(([next, saved]) => {
        if (!alive) return;
        setEntries(next);
        setView((current) => current ?? (saved === 'feed' ? 'feed' : 'timeline'));
      })
      .catch(() => { if (alive) fail(); });
    return () => { alive = false; };
  // attempt는 [다시 시도] 때 다시 읽게 하는 신호라 콜백 안에서 쓰지 않는다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, fail]));

  if (!entries || !view) return <TabSafeArea><LoadingScreen failed={failed} kind="records" onRetry={retry} /></TabSafeArea>;
  const goals = timelineGoals(entries).map((g) => ({ ...g, sticker: normalizeStickerId(g.sticker) }));
  // 고른 목표의 기록을 모두 지웠으면 전체로 돌아간다
  const picked = goal && goals.some((g) => g.id === goal) ? goal : null;
  const days = timelineDayViews(entries, picked);
  return (
    <TabSafeArea>
      <RecordTimelineScreen
        days={days}
        goals={goals}
        goal={picked}
        onGoal={setGoal}
        onOpen={(id) => router.push({ pathname: '/sticker/[id]', params: { id } })}
        view={view}
        onView={(next) => {
          setView(next);
          // 기억하지 못해도 지금 보기는 바뀐다. 다음에 열 때만 타임라인으로 돌아간다
          void setSetting('recordsView', next === 'feed' ? 'feed' : null).catch(() => {});
        }}
        onOpenFeed={(id) => router.push({ pathname: '/records/feed', params: picked ? { from: id, goal: picked } : { from: id } })}
      />
    </TabSafeArea>
  );
}
