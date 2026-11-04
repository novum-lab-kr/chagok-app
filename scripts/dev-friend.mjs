// 개발 전용: 두 번째 개발 계정(dev2@chagok.test)으로 함께 목표의 「친구」 쪽을 맡는다. 앱 번들에 들어가지 않는다.
// 로그인한 클라이언트로 앱이 쓰는 공개 RPC만 부른다(service 키로 표를 직접 고치지 않는다).
// service 키는 `setup`(계정 만들기)에서만 쓴다. 비밀번호와 키는 출력하지 않는다.
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const HELP = `사용: node scripts/dev-friend.mjs <명령> [인자]   (npm run server:dev-friend -- <명령>)

  setup                                  dev2 계정이 없으면 만든다(service 키 사용, 이 명령에서만)
  join <코드> <이름> <스티커>             join_goal. 실패하면 {"error": 낱말}
  place <goalId> <칸 번호|YYYY-MM-DD> [스티커]
                                         sync_push로 스티커 한 장. 칸 번호는 화면 번호(1부터), 날짜면 달력판(그 날짜 칸).
                                         스티커는 basic.cat 같은 값(기본 basic.clover, 멤버 스티커를 쓰지 않는다)
  rename <goalId> <이름> [스티커]         update_member
  leave <goalId>                         leave_goal
  block <userId> / unblock <userId>      block_user / unblock_user
  show <goalId>                          pull_goal 요약(멤버 이름과 user id, 칸)
  cleanup                                dev2가 든 함께 목표에서 나가고 차단을 모두 푼다
  whoami                                 dev2의 user id

환경(.secrets/server-test.env, .env.local 또는 셸):
  SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY(없으면 EXPO_PUBLIC_SUPABASE_ANON_KEY)
  DEV2_PASSWORD (dev2 비밀번호, 저장소에 넣지 않는다. EXPO_PUBLIC_이 아니라 앱 번들에 들어가지 않는다)
  EXPO_PUBLIC_DEV2_EMAIL (선택, 기본 dev2@chagok.test)
  SUPABASE_TEST_SERVICE_KEY (setup에서만)
`;

const [cmd, ...args] = process.argv.slice(2);
if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') {
  console.log(HELP);
  process.exit(0);
}

const fileEnv = Object.fromEntries(
  ['.secrets/server-test.env', '.env.local'].flatMap((file) => {
    try { return readFileSync(file, 'utf8').split('\n'); } catch { return []; }
  }).filter((line) => line.includes('=') && !line.startsWith('#')).map((line) => {
    const i = line.indexOf('=');
    return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
  }),
);
const env = { ...fileEnv, ...process.env };
const url = env.SUPABASE_TEST_URL ?? env.EXPO_PUBLIC_SUPABASE_URL;
const anon = env.SUPABASE_TEST_ANON_KEY ?? env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const email = env.EXPO_PUBLIC_DEV2_EMAIL ?? 'dev2@chagok.test';
const password = env.DEV2_PASSWORD;

const fail = (message) => { console.error(message); process.exit(1); };
const out = (value) => console.log(JSON.stringify(value, null, 2));
if (!url || !anon) fail('서버 주소와 anon 키가 필요합니다(.secrets/server-test.env).');
if (!password) fail('DEV2_PASSWORD가 필요합니다(.env.local 또는 셸). dev2 계정을 먼저 만들어야 하면 비밀번호를 정해 넣고 setup을 돌리세요.');

if (cmd === 'setup') {
  const key = env.SUPABASE_TEST_SERVICE_KEY;
  if (!key) fail('setup은 SUPABASE_TEST_SERVICE_KEY가 필요합니다(.secrets/server-test.env).');
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error && !/already/i.test(error.message)) fail(error.message);
  console.log(error ? `이미 있습니다: ${email}` : `만들었습니다: ${email}`);
  process.exit(0);
}

const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: session, error: signInError } = await client.auth.signInWithPassword({ email, password });
if (signInError) fail(`dev2 로그인 실패: ${signInError.message}`);
const me = session.user.id;

/** RPC 호출. 서버 낱말(P0001 메시지)을 {error}로 돌려준다. */
async function rpc(fn, params) {
  const { data, error } = await client.rpc(fn, params);
  if (error) return { error: error.message, code: error.code };
  return { data };
}
const must = async (fn, params) => {
  const r = await rpc(fn, params);
  if (r.error) { out(r); process.exit(1); }
  return r.data;
};

const need = (n) => { if (args.length < n) fail(`인자가 모자랍니다.\n\n${HELP}`); };
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

switch (cmd) {
  case 'whoami':
    out({ userId: me, email });
    break;
  case 'join': {
    need(3);
    const r = await rpc('join_goal', { p_code: args[0], p_display_name: args[1], p_sticker_id: args[2] });
    out(r.error ? { error: r.error } : r.data);
    break;
  }
  case 'place': {
    need(2);
    const [goalId, where] = args;
    const isDate = /^\d{4}-\d{2}-\d{2}$/.test(where);
    // 적립판은 앱과 같은 slot_index(화면 번호 - 1). 달력판은 앱이 칸을 date_key로 고르고(stickerDate) 서버 cell_key도 날짜라 0을 보낸다
    const slotIndex = isDate ? 0 : Number(where) - 1;
    if (!Number.isInteger(slotIndex) || slotIndex < 0) fail(`칸 번호는 1부터입니다: ${where}`);
    const now = Date.now();
    const row = {
      id: randomUUID(), goal_id: goalId, placed_at: now, slot_index: slotIndex,
      sticker_type: args[2] ?? 'basic.clover', updated_at: now, date_key: isDate ? where : today(), tz_offset_min: 540,
    };
    const r = await rpc('sync_push', { p_device_id: 'dev-friend', p_changes: [{ entity: 'sticker', op: 'upsert', row }] });
    out(r.error ? { error: r.error } : { stickerId: row.id, rejected: r.data.rejected });
    break;
  }
  case 'rename': {
    need(2);
    const r = await rpc('update_member', { p_goal_id: args[0], p_display_name: args[1], p_sticker_id: args[2] ?? 'basic.clover' });
    out(r.error ? { error: r.error } : { ok: true });
    break;
  }
  case 'leave': {
    need(1);
    const r = await rpc('leave_goal', { p_goal_id: args[0] });
    out(r.error ? { error: r.error } : r.data);
    break;
  }
  case 'block':
  case 'unblock': {
    need(1);
    const r = await rpc(`${cmd}_user`, { p_user_id: args[0] });
    out(r.error ? { error: r.error } : { ok: true });
    break;
  }
  case 'show': {
    need(1);
    const r = await rpc('pull_goal', { p_goal_id: args[0] });
    if (r.error) { out({ error: r.error }); break; }
    const d = r.data ?? {};
    out({
      keys: Object.keys(d),
      members: (d.members ?? []).map((m) => ({ userId: m.user_id, name: m.display_name, role: m.role, left: m.left_at != null })),
      stickers: (d.stickers ?? []).map((s) => ({ slot: s.slot_index, date: s.date_key, by: s.placed_by ?? null, hasSticker: s.sticker_type != null })),
    });
    break;
  }
  case 'cleanup': {
    // sync_pull로 dev2가 든 함께 목표를 찾는다(내 멤버 행이 있고 나가지 않았고 목표가 혼자 목표가 아닌 것).
    const shared = new Set();
    const seen = new Map();
    let since = 0;
    for (let guard = 0; guard < 100; guard += 1) {
      const page = await must('sync_pull', { p_since: since, p_limit: 500 });
      for (const entry of page.rows ?? []) {
        if (entry.entity === 'goal' && entry.row) seen.set(entry.row.id, entry.row.mode);
        if (entry.entity === 'member' && entry.row?.user_id === me && entry.row.left_at == null) shared.add(entry.row.goal_id);
      }
      since = page.cursor ?? since;
      if (!page.more) break;
    }
    const left = [];
    for (const goalId of shared) {
      if (seen.get(goalId) === 'solo') continue;
      const r = await rpc('leave_goal', { p_goal_id: goalId });
      left.push(r.error ? { goalId, error: r.error } : { goalId });
    }
    const blocks = await must('my_blocks', {});
    for (const b of blocks) await rpc('unblock_user', { p_user_id: b.user_id });
    out({ left, unblocked: blocks.length });
    break;
  }
  default:
    fail(`모르는 명령: ${cmd}\n\n${HELP}`);
}
