import 'expo-sqlite/localStorage/install';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;

/** 세션 저장 키. 고정해 두어 로그아웃이 실패해도 직접 지울 수 있게 한다 (signOutLocal). */
const AUTH_STORAGE_KEY = 'chagok-auth';

/** 저장된 로그인 세션을 지운다. supabase가 쓰는 키(-user, -code-verifier 포함)를 모두 지운다. */
export function clearStoredSession(): void {
  for (const key of [AUTH_STORAGE_KEY, `${AUTH_STORAGE_KEY}-user`, `${AUTH_STORAGE_KEY}-code-verifier`]) localStorage.removeItem(key);
}

/**
 * 앱용 Supabase 클라이언트. 서버 주소·키(.env.local의 EXPO_PUBLIC_SUPABASE_URL/ANON_KEY)가 없으면 null이고,
 * 앱은 지금처럼 기기에서만 쓴다. 세션은 expo-sqlite localStorage에 둔다 (계정·백업 설계 ② 세션).
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key
    ? createClient(url, key, { auth: { storage: localStorage, storageKey: AUTH_STORAGE_KEY, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })
    : null;
  return client;
}
