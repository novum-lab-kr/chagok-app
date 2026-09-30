// 개발 프로젝트에 개발용 계정을 만든다(이미 있으면 그대로 둔다). .secrets/server-test.env의 service 키를 쓴다.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  ['.secrets/server-test.env', '.env.local'].flatMap((file) => {
    try { return readFileSync(file, 'utf8').split('\n'); } catch { return []; }
  }).filter((line) => line.includes('=') && !line.startsWith('#')).map((line) => {
    const i = line.indexOf('=');
    return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
  }),
);
const { SUPABASE_TEST_URL: url, SUPABASE_TEST_SERVICE_KEY: key, EXPO_PUBLIC_DEV_EMAIL: email, EXPO_PUBLIC_DEV_PASSWORD: password } = env;
if (!url || !key || !email || !password) {
  console.error('.secrets/server-test.env(주소·service 키)과 .env.local(EXPO_PUBLIC_DEV_EMAIL/PASSWORD)이 필요합니다.');
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error && !/already/i.test(error.message)) { console.error(error.message); process.exit(1); }
console.log(error ? `이미 있습니다: ${email}` : `만들었습니다: ${email}`);
