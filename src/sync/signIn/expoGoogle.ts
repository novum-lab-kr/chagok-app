import { Platform } from 'react-native';
import { GoogleSignin, isCancelledResponse } from '@react-native-google-signin/google-signin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { GoogleSignInDeps } from './google';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from './googleKeys';

let configured = false;
function ensureConfigured() {
  if (configured) return;
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID });
  configured = true;
}

/** 실제 Google 창과 Supabase로 signInWithGoogle의 의존성을 채운다. 범위는 라이브러리 기본값(email, profile)이다. */
export function expoGoogleDeps(client: SupabaseClient): GoogleSignInDeps {
  return {
    requestGoogle: async () => {
      ensureConfigured();
      // Play 서비스가 없거나 낡았으면 Android가 업데이트 안내를 띄우고, 쓸 수 없으면 던진다
      if (Platform.OS === 'android') await GoogleSignin.hasPlayServices();
      const res = await GoogleSignin.signIn();
      if (isCancelledResponse(res)) return 'canceled';
      return { idToken: res.data.idToken };
    },
    signInWithIdToken: async (token) => {
      const { data, error } = await client.auth.signInWithIdToken({ provider: 'google', token });
      return { user: data.user, error };
    },
  };
}

/** 이 기기의 Google 로그인을 지운다 — 다음 로그인에서 다른 계정을 고를 수 있게. 실패해도 로그아웃은 계속한다. */
export async function signOutGoogle(): Promise<void> {
  try {
    ensureConfigured();
    await GoogleSignin.signOut();
  } catch {
    // Google 로그인을 한 적이 없다
  }
}

/** Google 계정의 「서드파티 연결」에서 차곡차곡을 뺀다 (계정 삭제). Google이 요구하는 단계가 아니라 실패해도 삭제는 계속한다. */
export async function revokeGoogle(): Promise<void> {
  try {
    ensureConfigured();
    // 앱을 다시 켜면 SDK가 로그인한 사용자를 들고 있지 않다 — 저장된 로그인을 되살린 뒤 끊는다 (2026-10-22 보안 검토)
    if (!GoogleSignin.getCurrentUser() && GoogleSignin.hasPreviousSignIn()) await GoogleSignin.signInSilently();
    await GoogleSignin.revokeAccess();
  } catch {
    // Google로 로그인한 계정이 아니거나 이 기기에 Google 로그인이 없다
  }
}
