import type { FeedPostView, TimelineDayView, TimelineEntryView } from '../design-system';
import type { TimelineEntry } from '../repositories/recordRepository';
import { normalizeStickerId } from '../stickers/stickerIds';
import { dayLabel, groupTimeline } from './recordTimeline';
import { displayRecordPhotoUri, recordPhotoExists } from './recordPhotos';

/** 기록 탭과 펼친 화면이 같이 쓰는 한 칸. */
function entryView(e: TimelineEntry): TimelineEntryView {
  return {
    id: e.stickerId,
    goalName: e.goalName,
    sticker: normalizeStickerId(e.sticker),
    memo: e.memo,
    // 기기에 없는 사진(복원 뒤 아직 못 받음)은 칸을 비운다 — 기록 화면이 안내한다
    photo: e.photoUri?.trim() && recordPhotoExists(e.photoUri) ? { uri: displayRecordPhotoUri(e.photoUri) } : undefined,
  };
}

export function timelineDayViews(entries: readonly TimelineEntry[], goalId: string | null): TimelineDayView[] {
  return groupTimeline(entries, goalId).map((day) => ({ key: day.key, label: day.label, entries: day.entries.map(entryView) }));
}

/** 날짜는 요일을 뺀 「10월 12일」. */
export function feedPostViews(entries: readonly TimelineEntry[]): FeedPostView[] {
  return entries.map((e) => {
    const label = dayLabel(e.dateKey);
    return { ...entryView(e), date: label.slice(0, label.lastIndexOf(' ')) };
  });
}
