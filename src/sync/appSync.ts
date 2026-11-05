import type { SupabaseClient } from '@supabase/supabase-js';
import { removeManagedRecordPhoto } from '../app-data/recordPhotos';
import { getDeviceId } from '../repositories/appSettingsRepository';
import { notifyLocalChange } from './changes';
import { expoPhotoIO } from './expoPhotoIO';
import type { PushDeps } from './push';
import { notifySlotTaken } from './slotTaken';
import { SupabasePhotoStore } from './supabasePhotos';
import { SupabaseSyncServer } from './supabaseServer';

/**
 * 이 사용자로 서버와 주고받을 구성. 자동 전송(_layout), 함께 목표 동작(나가기 전 올리기), 개발용 화면이 같은 것을 쓴다.
 * 한 판에서 남이 먼저 붙인 칸(slot_taken)은 어디서 올리든 지운 기록의 기기 사진을 지우고 보고 있는 판 화면에 알린다.
 * 기간 밖 날짜로 거절된 칸(out_of_period)은 알리지 않고 기기 사진만 지운 뒤 화면이 다시 읽게 한다.
 */
export async function syncDepsFor(supabase: SupabaseClient, userId: string): Promise<PushDeps> {
  return {
    server: new SupabaseSyncServer({ rpc: (fn, args) => supabase.rpc(fn, args) }),
    photos: new SupabasePhotoStore(supabase.storage.from('record-photos'), userId, expoPhotoIO),
    deviceId: await getDeviceId(),
    onSlotTaken: (_stickerId, photoUri, goalId) => {
      try { removeManagedRecordPhoto(photoUri); } catch { /* 고아 파일로 남는다. 칸은 이미 기기에서 지워졌다 */ }
      notifySlotTaken(goalId);
    },
    // 기간 밖 날짜로 거절된 칸(out_of_period): 알리지 않고, 기기 사진을 지운 뒤 열린 판 화면과 위젯이 다시 읽게 한다.
    onOutOfPeriod: (_stickerId, photoUri) => {
      try { removeManagedRecordPhoto(photoUri); } catch { /* 고아 파일로 남는다. 칸은 이미 기기에서 지워졌다 */ }
      notifyLocalChange();
    },
  };
}
