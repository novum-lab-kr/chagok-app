import type { SupabaseClient } from '@supabase/supabase-js';
import { resetUser } from '../analytics';
import { setErrorUser } from '../analytics/sentry';
import { signOutPurchases } from '../purchases';
import { signOutLocal } from '../sync/account';
import { signOutGoogle } from '../sync/signIn/expoGoogle';
import { signOutKakao } from '../sync/signIn/expoKakao';
import { clearStoredSession } from '../sync/supabaseClient';
import { resumeSync } from '../sync/syncGate';
import { wipeDevice } from '../sync/wipe';
import { removeAllManagedPhotos } from './recordPhotos';
import type { SignOutDeps } from './signOut';

/** signOut.ts에 넣을 실제 모듈. 서버 설정이 없는 빌드(supabase null)는 세션 지우기를 건너뛴다. */
export function signOutDeps(supabase: SupabaseClient | null): SignOutDeps {
  return {
    clearSession: async () => { if (supabase) await signOutLocal(supabase, clearStoredSession); },
    signOutKakao,
    signOutGoogle,
    signOutPurchases,
    wipeDevice: () => wipeDevice(removeAllManagedPhotos),
  };
}

/** 로그아웃이나 계정 삭제가 끝난 뒤. 로그아웃 신호가 오지 않아도 계정 ID를 남기지 않고, 멈춰 둔 동기화를 푼다. */
export function afterSignedOut(): void {
  resetUser();
  setErrorUser(null).catch(() => {});
  resumeSync();
}
