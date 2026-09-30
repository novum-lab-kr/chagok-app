import type { SupabaseClient } from '@supabase/supabase-js';
import { getDeviceId } from '../repositories/appSettingsRepository';
import { expoPhotoIO } from './expoPhotoIO';
import type { PushDeps } from './push';
import { SupabasePhotoStore } from './supabasePhotos';
import { SupabaseSyncServer } from './supabaseServer';

/** 이 사용자로 서버와 주고받을 구성. 자동 전송(_layout)과 개발용 화면이 같은 것을 쓴다. */
export async function syncDepsFor(supabase: SupabaseClient, userId: string): Promise<PushDeps> {
  return {
    server: new SupabaseSyncServer({ rpc: (fn, args) => supabase.rpc(fn, args) }),
    photos: new SupabasePhotoStore(supabase.storage.from('record-photos'), userId, expoPhotoIO),
    deviceId: await getDeviceId(),
  };
}
