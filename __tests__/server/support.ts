import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_TEST_URL;
const anon = process.env.SUPABASE_TEST_ANON_KEY;
const service = process.env.SUPABASE_TEST_SERVICE_KEY;

/** 서버 설정이 없으면(평소 npm test) 서버 테스트를 건너뛴다. */
export const describeIfServer = url && anon && service ? describe : describe.skip;

const options = { auth: { persistSession: false, autoRefreshToken: false } };
export const adminClient = (): SupabaseClient => createClient(url!, service!, options);
export const anonClient = (): SupabaseClient => createClient(url!, anon!, options);

let n = 0;
const createdIds: string[] = [];
/** 테스트마다 새 사용자를 만든다. 사용자끼리 데이터가 섞이지 않는다. 파일이 끝나면 지운다(개발 프로젝트에 쌓이지 않게). */
export async function newUser(): Promise<{ client: SupabaseClient; userId: string }> {
  const email = `t${Date.now()}-${n++}@chagok.test`;
  const password = 'test-password-1234';
  const created = await adminClient().auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error('createUser failed');
  createdIds.push(created.data.user.id);
  const client = anonClient();
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  return { client, userId: created.data.user.id };
}

// 이 파일에서 만든 사용자의 사진과 계정을 지운다. 행은 auth.users 삭제에 딸려 지워진다(on delete cascade).
if (url && anon && service) {
  afterAll(async () => {
    const admin = adminClient();
    for (const id of createdIds.splice(0)) {
      const listed = await admin.storage.from('record-photos').list(id);
      if (listed.data?.length) await admin.storage.from('record-photos').remove(listed.data.map((f) => `${id}/${f.name}`));
      await admin.auth.admin.deleteUser(id);
    }
  });
}
