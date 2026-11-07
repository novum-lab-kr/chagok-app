import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import type { RpcClient } from './supabaseServer';

export type FunctionsClient = {
  auth: { getSession(): PromiseLike<{ data: { session: unknown }; error: unknown }> };
  functions: { invoke(name: string): PromiseLike<{ error: { message: string } | null }> };
};

/** 이 기기에 로그인 세션이 없다. 다시 로그인해야 서버 일을 할 수 있다. */
export class NeedsLoginError extends Error {
  constructor() {
    super('needs login');
    this.name = 'NeedsLoginError';
  }
}

/**
 * 서버의 계정·사진·기록을 지운다 (계정·백업 설계 ③). 실패하면 던진다 — 기기에서는 아무것도 지우지 않는다.
 * 세션이 없으면 보내지 않고 NeedsLoginError를 던진다. supabase-js는 세션이 없으면 anon 키를 실어 보내 함수가 401을 낸다
 * (2026-10-29 TestFlight 6: 서버에 없는 refresh token으로 갱신이 실패해 세션이 지워진 기기). 오프라인이라 확인하지 못한 것은 연결 실패다.
 */
export async function deleteAccountOnServer(client: FunctionsClient): Promise<void> {
  const session = await client.auth.getSession();
  if (!session.data.session) {
    if (isAuthRetryableFetchError(session.error)) throw session.error;
    throw new NeedsLoginError();
  }
  const { error } = await client.functions.invoke('delete-account');
  if (error) throw new Error(error.message);
}

/** 함수가 2xx가 아니면 supabase-js는 응답을 `context`에 담는다. 본문에 실패 단계와 이유가 있다. */
type FunctionsError = { message: string; context?: { text?(): Promise<string> } };

export type FunctionsBodyClient = { functions: { invoke(name: string, options: { body: Record<string, string> }): PromiseLike<{ error: FunctionsError | null }> } };

/** Apple 로그인 직후 refresh token을 서버에 맡긴다 — 계정 삭제 때 Apple 연결을 폐기하는 데 쓴다. 실패하면 던진다. */
export async function linkAppleToken(client: FunctionsBodyClient, authorizationCode: string): Promise<void> {
  const { error } = await client.functions.invoke('apple-link', { body: { code: authorizationCode } });
  if (error) {
    const body = await error.context?.text?.().catch(() => '');
    throw new Error(body ? `${error.message}: ${body}` : error.message);
  }
}

/** `accounts`에서 내 행의 agreed_at을 읽은 결과 (`from('accounts').select('agreed_at').eq('user_id', id).maybeSingle()`) */
export type ConsentRow = PromiseLike<{ data: { agreed_at: number | null } | null; error: { message: string } | null }>;

/**
 * 이 계정이 약관에 동의한 적이 있다(`accounts.agreed_at`). 처음 만든 계정은 행이 없다 — 로그인 뒤 동의를 받는다 (2026-10-21).
 * 읽지 못하면 던진다. 모르는 채로 동의를 건너뛰거나 다시 묻지 않게.
 */
export async function hasConsented(row: ConsentRow): Promise<boolean> {
  const { data, error } = await row;
  if (error) throw new Error(error.message);
  return data?.agreed_at != null;
}

/** 동의 이력 (약관 설계). 만 14세 이상 확인도 같은 시각으로 남긴다. */
export async function recordConsent(client: RpcClient, termsVersion: number, privacyVersion: number): Promise<void> {
  const { error } = await client.rpc('record_consent', { p_terms_version: termsVersion, p_privacy_version: privacyVersion });
  if (error) throw new Error(error.message);
}

export type SignOutClient = { auth: { signOut(options: { scope: 'local' }): PromiseLike<{ error: { message: string } | null }> } };

/**
 * 이 기기 세션만 지운다. 로그아웃 결과와 상관없이 저장된 세션을 직접 지운다 — supabase는 만료된 토큰을
 * 갱신하지 못하면(오프라인, 이미 지운 계정) 세션을 남긴 채 오류만 돌려준다. 그대로 두면 기기는 비웠는데
 * 로그인이 남아 다시 연결되고 기록이 그 계정으로 올라간다 (2026-10-02 리뷰).
 */
export async function signOutLocal(client: SignOutClient, clearStoredSession: () => void): Promise<void> {
  try {
    await client.auth.signOut({ scope: 'local' });
  } catch {
    // 아래에서 저장된 세션을 지운다
  }
  clearStoredSession();
}
