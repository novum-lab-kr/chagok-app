import type { RpcClient } from './supabaseServer';

export type FunctionsClient = { functions: { invoke(name: string): PromiseLike<{ error: { message: string } | null }> } };

/** 서버의 계정·사진·기록을 지운다 (계정·백업 설계 ③). 실패하면 던진다 — 기기에서는 아무것도 지우지 않는다. */
export async function deleteAccountOnServer(client: FunctionsClient): Promise<void> {
  const { error } = await client.functions.invoke('delete-account');
  if (error) throw new Error(error.message);
}

/** 동의 이력 (약관 설계). 만 14세 이상 확인도 같은 시각으로 남긴다. */
export async function recordConsent(client: RpcClient, termsVersion: number, privacyVersion: number): Promise<void> {
  const { error } = await client.rpc('record_consent', { p_terms_version: termsVersion, p_privacy_version: privacyVersion });
  if (error) throw new Error(error.message);
}
