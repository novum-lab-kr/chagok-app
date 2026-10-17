import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import type { SupabaseClient } from '@supabase/supabase-js';
import { linkAppleToken } from '../account';
import type { AppleSignInDeps } from './apple';
import { makeNonce } from './nonce';

/** Apple 버튼을 보일지. Android에는 없다 (PRD 4.8). */
export async function appleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

/** 실제 Apple 창과 Supabase로 signInWithApple의 의존성을 채운다. 이름은 요청하지 않는다 (PRD 4.8). */
export function expoAppleDeps(client: SupabaseClient): AppleSignInDeps {
  return {
    makeNonce,
    requestApple: (nonce) => AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL], nonce }),
    signInWithIdToken: async (token, nonce) => {
      const { data, error } = await client.auth.signInWithIdToken({ provider: 'apple', token, nonce });
      return { user: data.user, error };
    },
    linkToken: (code) => linkAppleToken(client, code),
  };
}
