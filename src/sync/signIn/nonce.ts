import * as Crypto from 'expo-crypto';

/** ID 토큰 로그인용 nonce. 로그인 창(Apple·카카오)에는 hashed를, Supabase에는 raw를 준다 (Supabase는 SHA-256 16진수로 맞춰 본다). */
export async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = Crypto.randomUUID();
  return { raw, hashed: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw) };
}
