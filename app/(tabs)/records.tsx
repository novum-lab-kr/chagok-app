import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { LoadingScreen, RecordTimelineScreen, TabSafeArea, useLoadRetry } from '../../src/design-system';
import { groupTimeline, timelineGoals } from '../../src/app-data/recordTimeline';
import { displayRecordPhotoUri, recordPhotoExists } from '../../src/app-data/recordPhotos';
import { listRecordTimeline, type TimelineEntry } from '../../src/repositories/recordRepository';
import { normalizeStickerId } from '../../src/stickers/stickerIds';

/** 기록 탭 (2026-10-12): 사진이나 메모가 있는 칸만 날짜별로. 누르면 그 칸의 기록 화면. */
export default function Records() {
  const router = useRouter();
  const [entries, setEntries] = useState<TimelineEntry[] | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const { failed, attempt, fail, retry } = useLoadRetry();

  // 기록 화면에서 고치고 돌아오거나 다른 탭에서 붙이고 오면 다시 읽는다.
  useFocusEffect(useCallback(() => {
    let alive = true;
    void listRecordTimeline()
      .then((next) => { if (alive) setEntries(next); })
      .catch(() => { if (alive) fail(); });
    return () => { alive = false; };
  // attempt는 [다시 시도] 때 다시 읽게 하는 신호라 콜백 안에서 쓰지 않는다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, fail]));

  if (!entries) return <TabSafeArea><LoadingScreen failed={failed} kind="records" onRetry={retry} /></TabSafeArea>;
  const goals = timelineGoals(entries);
  // 고른 목표의 기록을 모두 지웠으면 전체로 돌아간다
  const picked = goal && goals.some((g) => g.id === goal) ? goal : null;
  const days = groupTimeline(entries, picked).map((day) => ({
    key: day.key,
    label: day.label,
    entries: day.entries.map((e) => ({
      id: e.stickerId,
      goalName: e.goalName,
      sticker: normalizeStickerId(e.sticker),
      memo: e.memo,
      // 기기에 없는 사진(복원 뒤 아직 못 받음)은 칸을 비운다 — 기록 화면이 안내한다
      photo: e.photoUri?.trim() && recordPhotoExists(e.photoUri) ? { uri: displayRecordPhotoUri(e.photoUri) } : undefined,
    })),
  }));
  return (
    <TabSafeArea>
      <RecordTimelineScreen
        days={days}
        goals={goals}
        goal={picked}
        onGoal={setGoal}
        onOpen={(id) => router.push({ pathname: '/sticker/[id]', params: { id } })}
      />
    </TabSafeArea>
  );
}
