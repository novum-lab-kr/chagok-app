import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { LoadingScreen, RecordFeedScreen, useLoadRetry } from '../../src/design-system';
import { goBackOrHome, goHome } from '../../src/app-data/goBack';
import { feedFrom } from '../../src/app-data/recordTimeline';
import { feedPostViews } from '../../src/app-data/recordTimelineView';
import { listRecordTimeline, type TimelineEntry } from '../../src/repositories/recordRepository';

/** 기록 탭 피드 → 펼친 화면 (2026-10-17, PRD 4.13). 누른 기록부터 사진과 메모를 이어 본다. goal이 있으면 그 목표만. */
export default function RecordFeed() {
  const router = useRouter();
  const { from, goal } = useLocalSearchParams<{ from: string; goal?: string }>();
  const [entries, setEntries] = useState<TimelineEntry[] | null>(null);
  const { failed, attempt, fail, retry } = useLoadRetry();

  // 기록 화면에서 고치거나 지우고 돌아오면 다시 읽는다.
  useFocusEffect(useCallback(() => {
    let alive = true;
    void listRecordTimeline()
      .then((next) => { if (alive) setEntries(next); })
      .catch(() => { if (alive) fail(); });
    return () => { alive = false; };
  // attempt는 [다시 시도] 때 다시 읽게 하는 신호라 콜백 안에서 쓰지 않는다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, fail]));

  if (!entries) return <LoadingScreen failed={failed} kind="records" onRetry={retry} onHome={goHome} />;
  return (
    <RecordFeedScreen
      posts={feedPostViews(feedFrom(entries, goal ?? null, from))}
      onBack={goBackOrHome}
      onOpen={(id) => router.push({ pathname: '/sticker/[id]', params: { id } })}
    />
  );
}
