import 'expo-sqlite/localStorage/install';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;

/**
 * 앱용 Supabase 클라이언트. 서버 주소·키(.env.local의 EXPO_PUBLIC_SUPABASE_URL/ANON_KEY)가 없으면 null이고,
 * 앱은 지금처럼 기기에서만 쓴다. 세션은 expo-sqlite localStorage에 둔다 (계정·백업 설계 ② 세션).
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key
    ? createClient(url, key, { auth: { storage: localStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })
    : null;
  return client;
}
