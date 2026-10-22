import { initializeKakaoSDK } from '@react-native-kakao/core';
import { login, logout } from '@react-native-kakao/user';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { KakaoSignInDeps } from './kakao';
import { KAKAO_NATIVE_APP_KEY } from './kakaoKey';
import { makeNonce } from './nonce';

let initialized = false;
function ensureInitialized() {
  if (initialized) return;
  void initializeKakaoSDK(KAKAO_NATIVE_APP_KEY);
  initialized = true;
}

/** 창 닫기(Cancelled)와 카카오톡 동의 화면에서 취소(AccessDenied). iOS와 Android 모두 SDK 오류 이유 이름이 code로 온다. */
const CANCEL_CODES = new Set(['Cancelled', 'AccessDenied']);

/** 실제 카카오 창과 Supabase로 signInWithKakao의 의존성을 채운다. 동의항목은 요청하지 않는다 (PRD 4.8). */
export function expoKakaoDeps(client: SupabaseClient): KakaoSignInDeps {
  return {
    makeNonce,
    requestKakao: async (nonce) => {
      ensureInitialized();
      try {
        // scopes를 넘기면 카카오톡 앱 로그인을 건너뛰고 계정 로그인만 한다. OpenID Connect가 켜져 있으면 ID 토큰은 그냥 온다.
        const token = await login({ nonce });
        return { idToken: token.idToken ?? null };
      } catch (e) {
        if (CANCEL_CODES.has(String((e as { code?: unknown } | null)?.code))) return 'canceled';
        throw e;
      }
    },
    signInWithIdToken: async (token, nonce) => {
      const { data, error } = await client.auth.signInWithIdToken({ provider: 'kakao', token, nonce });
      return { user: data.user, error };
    },
  };
}

/** 이 기기의 카카오 토큰을 지운다 — 다음 로그인에서 다른 카카오 계정을 고를 수 있게. 실패해도 로그아웃은 계속한다. */
export async function signOutKakao(): Promise<void> {
  try {
    ensureInitialized();
    await logout();
  } catch {
    // 카카오 로그인을 한 적이 없거나 토큰이 이미 없다
  }
}
