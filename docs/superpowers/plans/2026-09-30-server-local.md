# 서버 단계 (Supabase 클라우드 개발 프로젝트) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supabase 클라우드의 개발용 무료 프로젝트(서울 리전)에 백업 서버(테이블·RLS·RPC·사진 저장소·계정 삭제 함수)를 만들고, 앱의 `SyncServer`·`PhotoStore` 실구현과 개발용 로그인으로 Expo Go에서 실제 백업·복원을 돌린다.

**Architecture:** 서버 로직은 `supabase/migrations/`의 SQL 함수(plpgsql)에 모두 둔다 — 운영을 VPS 셀프 호스팅·Supabase 클라우드·일반 Postgres 중 어디로 해도 그대로 옮겨진다. 앱은 지금처럼 `src/sync/contract.ts`의 `SyncServer`·`PhotoStore`만 알고, Supabase 구현은 그 뒤에 끼운다. 가짜 서버(`FakeServer`)와 실제 서버에 **같은 계약 테스트**를 돌려 둘이 어긋나지 않게 한다.

**Tech Stack:** Supabase CLI(Homebrew, Docker 없이 클라우드 프로젝트에 연결), PostgreSQL plpgsql, Supabase Storage, Edge Functions(Deno), `@supabase/supabase-js`, `expo-image-manipulator`, `expo-file-system`, `expo-sqlite/localStorage`, jest + ts-jest.

**Spec:** [docs/superpowers/specs/2026-09-30-account-backup-design.md](../specs/2026-09-30-account-backup-design.md) (③ 서버, ④ 실패 처리, 테스트 표)

## Global Constraints

- Expo 57. API는 https://docs.expo.dev/versions/v57.0.0/ 에서 확인한다. 추측하지 않는다.
- `package.json`의 `overrides: { "react-dom": "19.2.3" }`를 건드리지 않는다. 의존성 추가 전 `package.json`·`package-lock.json`을 백업하고, 설치 뒤 `npm ls react-dom --all`이 `19.2.3` 하나만 내놓는지 확인한다.
- `jest-expo`를 들이지 않는다. `jest` + `ts-jest`.
- Supabase CLI는 Homebrew로 설치한다. 앱 의존성에 넣지 않는다.
- **개발 서버는 Supabase 클라우드 무료 프로젝트**(서울 리전, 2026-09-30 사용자 결정 — 맥을 켜 두지 않아도 되고 Docker가 필요 없다). 운영은 같은 마이그레이션·함수를 별도 프로젝트(또는 VPS)에 올린다. 개발 프로젝트에는 테스트 데이터만 둔다.
- 서버 설정은 `supabase db push`로 올린다. **이미 올린 마이그레이션 파일은 고치지 않고 새 파일을 더한다**(올린 뒤 고쳐야 하면 `supabase db reset --linked`로 개발 DB를 비우고 다시 올린다 — 개발 프로젝트에서만).
- `service_role` 키와 DB 비밀번호는 커밋하지 않는다. 테스트용은 `.env.server.local`, 앱용은 `.env.local`(anon 키만). 둘 다 git-ignore.
- 서버 규칙(스펙 ③): 모든 테이블은 `user_id = auth.uid()`인 행만 SELECT, **테이블 직접 쓰기는 막고 RPC로만 쓴다.** `push_changes`는 더 최근 `updated_at` 우선, 목표 삭제는 딸린 행까지 표식, 멱등.
- 사진: 비공개 버킷 `record-photos`, 경로 `{user_id}/{record_id}.jpg`, 긴 변 1600px · JPEG 80%.
- `delete-account` 순서: Apple 토큰 폐기 → 사진 폴더 삭제 → 데이터 행 삭제 → 인증 계정 삭제. 실패하면 멈추고, 다시 부르면 남은 단계부터(멱등).
- 개발용 로그인(이메일·비밀번호)은 `__DEV__`에서만 보인다. 실제 로그인(Apple·Google)과 계정 화면은 이 계획 밖이다.
- 이식성: Supabase 전용 기능은 Auth·Storage·Edge Functions까지만 쓴다. 동기화 규칙은 SQL 함수에만 있다.
- 사용자 문구는 한국어. 디자인 시스템 토큰·프레임 값은 바꾸지 않는다.
- 브랜치 `feat/server-local`. 커밋은 계획 승인 뒤에만.

## Review Focus

1. **부모가 서버에 없는 자식 행**(목표 전송이 보류된 채 스티커가 올라감) — 그 스티커만 거부·보류되고 나머지 묶음은 진행돼야 한다. → Task 3 `security.test.ts` "부모 없는 스티커는 SyncRejected".
2. **다른 사용자가 같은 id를 보냄** — 각자 자기 행이 생기고 남의 행은 바뀌지 않아야 한다. → Task 3 "같은 id를 다른 사용자가 보내도 서로 영향 없다".
3. **세션이 없거나 만료된 상태의 전송** — 거부(보류)가 아니라 재시도 대상이어야 한다. 보류되면 로그인 뒤에도 올라가지 않는다. → Task 6 `isRejection('42501') === false`, Task 3 "로그인 없이 부르면 거부가 아닌 오류".
4. **계정 삭제가 중간에 실패한 뒤 다시 누름** — 남은 단계부터 끝나야 한다. → Task 5 "두 번 불러도 성공한다".
5. **사진이 너무 크거나 형식이 틀림** — 그 사진만 보류(`PhotoRejected`), 네트워크 오류는 재시도. → Task 7 상태 코드 매핑 테스트.

**알려진 한계(1차 허용):** `pull_changes`의 커서는 시퀀스 값이라, 두 트랜잭션이 동시에 커밋하면 늦게 커밋한 낮은 번호를 놓칠 수 있다. 한 기기 백업에서는 복원이 `pull(0)`부터 전부 받으므로 문제없다. 패드 지원(여러 기기 받아오기) 때 커밋 순서 기반 커서로 바꾼다.

---

## 파일 구조

| 파일 | 책임 |
| --- | --- |
| `supabase/config.toml` | `supabase init`이 만든다 |
| `supabase/migrations/20260930000001_sync_tables.sql` | 테이블 3개 + accounts + private.apple_tokens, 변경 시퀀스, RLS |
| `supabase/migrations/20260930000002_sync_rpc.sql` | `server_state`·`push_changes`·`pull_changes`·`replace_all`·`record_consent`, 내부 upsert 함수 |
| `supabase/migrations/20260930000003_photos.sql` | `record-photos` 버킷·정책 |
| `supabase/migrations/20260930000004_account_admin.sql` | 계정 삭제용 관리 함수 |
| `supabase/functions/delete-account/index.ts` | 계정 삭제 Edge Function |
| `scripts/test-server.sh` | `.env.server.local`의 주소·키로 서버 테스트 실행 |
| `scripts/dev-user.mjs` | 개발 프로젝트에 개발용 계정을 만든다 |
| `__tests__/support/syncServerContract.ts` | 가짜·실제 서버 공용 계약 테스트 |
| `__tests__/fakeServerContract.test.ts` | 계약을 FakeServer에 (평소 `npm test`) |
| `__tests__/server/support.ts` | 테스트 사용자·클라이언트 만들기와 끝난 뒤 정리, 서버 설정이 없으면 건너뛰기 |
| `__tests__/server/*.test.ts` | 실제 서버 테스트 (`npm run test:server`) |
| `src/sync/supabaseServer.ts` | `SyncServer` 실구현 + 오류 분류 |
| `src/sync/supabasePhotos.ts` | `PhotoStore` 실구현 (입출력은 주입) |
| `src/sync/expoPhotoIO.ts` | 기기 사진 줄이기·받기 (expo 모듈) |
| `src/sync/supabaseClient.ts` | 앱용 Supabase 클라이언트 (환경 변수 없으면 null) |
| `src/sync/connect.ts` | 로그인 상태에 따라 전송 스케줄러를 켜고 끈다 |
| `src/sync/account.ts` | `deleteAccountOnServer`, `recordConsent` |
| `src/app-data/recordPhotos.ts` | `newManagedPhotoFile` 추가 |
| `app/dev/sync.tsx` | 개발용 동기화 화면 (`__DEV__`) |
| `app/settings.tsx` | 개발 패널 진입 줄 (`__DEV__`) |
| `app/_layout.tsx` | 앱 시작 때 `connectSync` |
| `docs/DEV-SETUP.md`, `docs/HANDOFF.md`, 스펙 | 개발 서버 연결법, 운영 결정 보류, 이식성 원칙 |

---

### Task 1: 개발 프로젝트 연결과 테이블·RLS

**Files:**
- Create: `supabase/` (`supabase init`), `supabase/migrations/20260930000001_sync_tables.sql`
- Create: `scripts/test-server.sh`, `__tests__/server/support.ts`, `__tests__/server/tables.test.ts`
- Modify: `package.json` (의존성 `@supabase/supabase-js`, 스크립트 `test:server`), `.gitignore`

**Interfaces:**
- Produces: 테이블 `public.goals/stickers/records`(PK `(user_id, id)`, 컬럼 = 기기 컬럼 + `user_id uuid`, `deleted_at bigint`, `device_id text`, `seq bigint`), `public.accounts`, `private.apple_tokens`, 시퀀스 `public.change_seq`.
- Produces (테스트): `describeIfServer`, `newUser(): Promise<{ client: SupabaseClient; userId: string }>`, `adminClient(): SupabaseClient`, `anonClient(): SupabaseClient`.

- [ ] **Step 1: 사용자 준비물 확인과 CLI 설치**

사용자가 먼저 한다: https://supabase.com 가입 → New project(이름 `chagok-dev`, Region **Northeast Asia (Seoul)**, DB 비밀번호 기록). 만든 뒤 Project Settings에서 세 값을 받는다: Project URL, anon(publishable) 키, service_role(secret) 키, 그리고 Project ref(주소의 `xxxx` 부분).

Run: `brew install supabase/tap/supabase && supabase --version`
Expected: CLI 버전이 나온다.

- [ ] **Step 2: 프로젝트 초기화와 연결**

Run: `supabase init` (VS Code 설정 질문은 N)
사용자가 실행(브라우저 로그인·비밀번호 입력이 필요하다): `! supabase login` → `! supabase link --project-ref <ref>`
Run: `supabase migration list`
Expected: 오류 없이 빈 목록(Local·Remote 모두 없음). 연결이 안 됐으면 멈추고 사용자에게 알린다.

`.env.server.local`을 만든다(커밋하지 않는다. 값은 사용자가 준 것으로 채운다):
```
SUPABASE_TEST_URL=https://<ref>.supabase.co
SUPABASE_TEST_ANON_KEY=<anon 또는 publishable 키>
SUPABASE_TEST_SERVICE_KEY=<service_role 또는 secret 키>
```

- [ ] **Step 3: 의존성 추가 (백업·검증 절차)**

```bash
cp package.json /tmp/package.json.bak && cp package-lock.json /tmp/package-lock.json.bak
npm install @supabase/supabase-js
npm ls react-dom --all
```
Expected: `react-dom@19.2.3`만 나온다. 다르면 백업으로 되돌리고 멈춘다.

- [ ] **Step 4: 서버 테스트 실행기**

`scripts/test-server.sh`:
```sh
#!/bin/sh
# 개발 프로젝트(.env.server.local)에 대고 __tests__/server를 돌린다. 평소 npm test에서는 이 테스트들이 건너뛰어진다.
set -e
[ -f .env.server.local ] || { echo ".env.server.local이 없습니다 (docs/DEV-SETUP.md 참고)"; exit 1; }
set -a
. ./.env.server.local
set +a
npx jest __tests__/server --runInBand "$@"
```
`package.json` scripts에 `"test:server": "sh scripts/test-server.sh"`.
`.gitignore`에 추가:
```
# Supabase CLI 상태·환경 변수(키는 커밋하지 않는다)
supabase/.temp/
supabase/.branches/
.env*.local
```

`__tests__/server/support.ts`:
```ts
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
```

- [ ] **Step 5: 실패하는 테스트**

`__tests__/server/tables.test.ts`:
```ts
import { describeIfServer, newUser } from './support';

describeIfServer('서버 테이블과 RLS', () => {
  it('로그인한 사용자는 자기 목표를 읽을 수 있다(처음엔 비어 있음)', async () => {
    const { client } = await newUser();
    const { data, error } = await client.from('goals').select('id');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('테이블에 직접 쓸 수 없다 (RPC로만 쓴다)', async () => {
    const { client, userId } = await newUser();
    const { error } = await client.from('goals').insert({
      user_id: userId, id: 'g1', name: 'x', board_type: 'tally', default_sticker_id: 'sprout', created_at: 1, updated_at: 1,
    });
    expect(error).not.toBeNull();
  });

  it('private 스키마(Apple 토큰)는 API로 보이지 않는다', async () => {
    const { client } = await newUser();
    const { error } = await client.schema('private').from('apple_tokens').select('user_id');
    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 6: 실패 확인**

Run: `npm run test:server -- tables`
Expected: 첫 테스트가 `relation "public.goals" does not exist`(또는 PGRST205)로 FAIL.

- [ ] **Step 7: 마이그레이션**

`supabase/migrations/20260930000001_sync_tables.sql`:
```sql
-- 백업 서버 테이블 (계정·백업 설계 ③). 컬럼은 기기 DB와 같다. 시각은 모두 ms epoch(bigint).
-- PK는 (user_id, id): 기기가 만든 id가 다른 사용자와 겹쳐도 서로 건드리지 않는다.
-- seq는 pull_changes 커서다. 행이 바뀔 때마다 새 번호를 받는다.

create sequence public.change_seq;

create table public.goals (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  board_type text not null check (board_type in ('calendar', 'tally')),
  total_slots integer,
  default_sticker_id text not null,
  created_at bigint not null,
  end_date text,
  completed_at bigint,
  completion_seen integer not null default 0,
  last_placed_at bigint,
  initial_slots integer,
  updated_at bigint not null,
  deleted_at bigint,
  device_id text,
  seq bigint not null default nextval('public.change_seq'),
  primary key (user_id, id)
);

create table public.stickers (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  goal_id text not null,
  placed_at bigint not null,
  slot_index integer not null,
  sticker_type text not null,
  updated_at bigint not null,
  deleted_at bigint,
  device_id text,
  seq bigint not null default nextval('public.change_seq'),
  primary key (user_id, id),
  -- 한 묶음 안에서는 순서와 상관없이 묶음 끝에 검사한다
  foreign key (user_id, goal_id) references public.goals (user_id, id) deferrable initially deferred
);

create table public.records (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  sticker_id text not null,
  memo text,
  photo_remote_path text,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  device_id text,
  seq bigint not null default nextval('public.change_seq'),
  primary key (user_id, id),
  foreign key (user_id, sticker_id) references public.stickers (user_id, id) deferrable initially deferred
);

create index goals_user_seq on public.goals (user_id, seq);
create index stickers_user_seq on public.stickers (user_id, seq);
create index records_user_seq on public.records (user_id, seq);
create index stickers_user_goal on public.stickers (user_id, goal_id);
create index records_user_sticker on public.records (user_id, sticker_id);

create function public.bump_seq() returns trigger language plpgsql set search_path = '' as $$
begin
  new.seq := nextval('public.change_seq');
  return new;
end $$;

create trigger goals_bump_seq before update on public.goals for each row execute function public.bump_seq();
create trigger stickers_bump_seq before update on public.stickers for each row execute function public.bump_seq();
create trigger records_bump_seq before update on public.records for each row execute function public.bump_seq();

create table public.accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text,
  terms_version integer,
  privacy_version integer,
  agreed_at bigint,
  age_confirmed_at bigint,
  created_at bigint not null
);

create schema if not exists private;
create table private.apple_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null
);
revoke all on schema private from anon, authenticated;

-- 읽기는 자기 행만. 쓰기 정책을 만들지 않고 권한도 거둬 테이블 직접 쓰기를 막는다(RPC만 쓴다).
alter table public.goals enable row level security;
alter table public.stickers enable row level security;
alter table public.records enable row level security;
alter table public.accounts enable row level security;
create policy goals_own on public.goals for select to authenticated using (user_id = (select auth.uid()));
create policy stickers_own on public.stickers for select to authenticated using (user_id = (select auth.uid()));
create policy records_own on public.records for select to authenticated using (user_id = (select auth.uid()));
create policy accounts_own on public.accounts for select to authenticated using (user_id = (select auth.uid()));
-- 권한을 직접 준다(프로젝트의 "새 테이블 자동 공개"를 꺼 둔다). 로그인한 사용자는 읽기만, 쓰기는 RPC로만.
revoke all on public.goals, public.stickers, public.records, public.accounts from anon, authenticated;
grant select on public.goals, public.stickers, public.records, public.accounts to authenticated;
grant select, insert, update, delete on public.goals, public.stickers, public.records, public.accounts to service_role;
```

Run: `supabase db push`
Expected: `20260930000001_sync_tables.sql` 적용 완료, 오류 없음.

- [ ] **Step 8: 통과 확인**

Run: `npm run test:server -- tables` → PASS 3/3.
Run: `npm test` → 기존 201개 PASS, 서버 테스트 3개는 skipped.

- [ ] **Step 9: Commit**

```bash
git add supabase scripts/test-server.sh __tests__/server package.json package-lock.json .gitignore
git commit -m "feat(server): Supabase project with sync tables and RLS"
```

---

### Task 2: 동기화 RPC와 계약 테스트

**Files:**
- Create: `supabase/migrations/20260930000002_sync_rpc.sql`
- Create: `__tests__/support/syncServerContract.ts`, `__tests__/fakeServerContract.test.ts`, `__tests__/server/syncServer.contract.test.ts`
- Create: `src/sync/supabaseServer.ts` (계약 테스트가 실제 서버를 부르는 데 필요하다. 오류 분류 단위 테스트는 Task 6)

**Interfaces:**
- Consumes: Task 1 테이블, `newUser`, `describeIfServer`.
- Produces: RPC `server_state() → jsonb {goals, lastUpdatedAt}`, `push_changes(p_device_id text, p_changes jsonb) → void`, `pull_changes(p_since bigint, p_limit int) → jsonb {rows, cursor, more}`, `replace_all(p_device_id text, p_rows jsonb) → void`, `record_consent(p_terms_version int, p_privacy_version int) → void`.
- Produces: `class SupabaseSyncServer implements SyncServer { constructor(client: RpcClient) }`, `type RpcClient`, `isRejection(code?: string): boolean`, `describeSyncServerContract(label, make, wrap?)`, 헬퍼 `goal`, `sticker`, `record`, `snapshot`, `liveIds`.

- [ ] **Step 1: 공용 계약 테스트 작성**

`__tests__/support/syncServerContract.ts`:
```ts
import type { GoalRow, PulledRow, RecordRow, StickerRow, SyncServer } from '../../src/sync/contract';

export const goal = (id: string, updatedAt = 1, name = `목표 ${id}`): GoalRow => ({
  id, name, board_type: 'tally', total_slots: 10, default_sticker_id: 'sprout', created_at: 1, end_date: null,
  completed_at: null, completion_seen: 0, last_placed_at: null, initial_slots: 10, updated_at: updatedAt,
});
export const sticker = (id: string, goalId: string, updatedAt = 1): StickerRow => ({
  id, goal_id: goalId, placed_at: 1, slot_index: 0, sticker_type: 'sprout', updated_at: updatedAt,
});
export const record = (id: string, stickerId: string, updatedAt = 1): RecordRow => ({
  id, sticker_id: stickerId, memo: '메모', photo_remote_path: null, created_at: 1, updated_at: updatedAt,
});

async function pullAll(server: SyncServer, pageSize = 100): Promise<PulledRow[]> {
  const out: PulledRow[] = [];
  let cursor = 0;
  for (;;) {
    const page = await server.pull(cursor, pageSize);
    out.push(...page.rows);
    cursor = page.cursor;
    if (!page.more) return out;
  }
}

/** 행마다 마지막 상태. 키는 'entity:id'. */
export async function snapshot(server: SyncServer): Promise<Map<string, { deletedAt: number | null; row: unknown }>> {
  const m = new Map<string, { deletedAt: number | null; row: unknown }>();
  for (const p of await pullAll(server)) m.set(`${p.entity}:${p.row.id}`, { deletedAt: p.deletedAt, row: p.row });
  return m;
}
export function liveIds(m: Map<string, { deletedAt: number | null }>, entity: string): string[] {
  return [...m].filter(([k, v]) => k.startsWith(`${entity}:`) && v.deletedAt === null).map(([k]) => k.slice(entity.length + 1)).sort();
}

/** 가짜 서버와 실제 서버가 같은 규칙인지 (계정·백업 설계 테스트 표 "계약 일치"). */
export function describeSyncServerContract(label: string, make: () => Promise<SyncServer>, wrap: jest.Describe = describe): void {
  wrap(`SyncServer 계약: ${label}`, () => {
    it('빈 서버는 목표 0개, 마지막 수정 없음', async () => {
      expect(await (await make()).state()).toEqual({ goals: 0, lastUpdatedAt: null });
    });

    it('올린 행을 그대로 돌려준다', async () => {
      const s = await make();
      await s.push('d1', [
        { entity: 'goal', op: 'upsert', row: goal('g1', 5) },
        { entity: 'sticker', op: 'upsert', row: sticker('s1', 'g1', 6) },
        { entity: 'record', op: 'upsert', row: record('r1', 's1', 7) },
      ]);
      const m = await snapshot(s);
      expect(m.get('goal:g1')).toEqual({ deletedAt: null, row: goal('g1', 5) });
      expect(m.get('sticker:s1')).toEqual({ deletedAt: null, row: sticker('s1', 'g1', 6) });
      expect(m.get('record:r1')).toEqual({ deletedAt: null, row: record('r1', 's1', 7) });
      expect(await s.state()).toEqual({ goals: 1, lastUpdatedAt: 7 });
    });

    it('더 오래된 updated_at은 덮어쓰지 않는다', async () => {
      const s = await make();
      await s.push('d1', [{ entity: 'goal', op: 'upsert', row: goal('g1', 10, '새 이름') }]);
      await s.push('d1', [{ entity: 'goal', op: 'upsert', row: goal('g1', 5, '옛 이름') }]);
      expect((await snapshot(s)).get('goal:g1')?.row).toEqual(goal('g1', 10, '새 이름'));
    });

    it('목표를 지우면 딸린 스티커·기록까지 표식한다', async () => {
      const s = await make();
      await s.push('d1', [
        { entity: 'goal', op: 'upsert', row: goal('g1') },
        { entity: 'sticker', op: 'upsert', row: sticker('s1', 'g1') },
        { entity: 'record', op: 'upsert', row: record('r1', 's1') },
      ]);
      await s.push('d1', [{ entity: 'goal', op: 'delete', id: 'g1', deletedAt: 20 }]);
      const m = await snapshot(s);
      expect([liveIds(m, 'goal'), liveIds(m, 'sticker'), liveIds(m, 'record')]).toEqual([[], [], []]);
      expect(m.get('record:r1')?.deletedAt).toBe(20);
      expect((await s.state()).goals).toBe(0);
    });

    it('스티커를 지우면 딸린 기록까지 표식한다', async () => {
      const s = await make();
      await s.push('d1', [
        { entity: 'goal', op: 'upsert', row: goal('g1') },
        { entity: 'sticker', op: 'upsert', row: sticker('s1', 'g1') },
        { entity: 'record', op: 'upsert', row: record('r1', 's1') },
      ]);
      await s.push('d1', [{ entity: 'sticker', op: 'delete', id: 's1', deletedAt: 9 }]);
      const m = await snapshot(s);
      expect([liveIds(m, 'goal'), liveIds(m, 'sticker'), liveIds(m, 'record')]).toEqual([['g1'], [], []]);
    });

    it('같은 변경을 다시 보내도 결과가 같다 (멱등)', async () => {
      const s = await make();
      const batch = [
        { entity: 'goal', op: 'upsert', row: goal('g1', 3) },
        { entity: 'goal', op: 'upsert', row: goal('g2', 3) },
        { entity: 'goal', op: 'delete', id: 'g2', deletedAt: 4 },
        { entity: 'record', op: 'delete', id: '없는-기록', deletedAt: 4 },
      ] as const;
      await s.push('d1', [...batch]);
      const first = await snapshot(s);
      await s.push('d1', [...batch]);
      const second = await snapshot(s);
      expect(liveIds(first, 'goal')).toEqual(['g1']);
      expect(liveIds(second, 'goal')).toEqual(['g1']);
      expect(second.get('goal:g1')?.row).toEqual(first.get('goal:g1')?.row);
    });

    it('나눠 받아도 모든 행을 한 번씩 받는다', async () => {
      const s = await make();
      await s.push('d1', ['a', 'b', 'c', 'd', 'e'].map((id) => ({ entity: 'goal' as const, op: 'upsert' as const, row: goal(id) })));
      await s.push('d1', [{ entity: 'goal', op: 'upsert', row: goal('c', 2) }]);
      const ids: string[] = [];
      let cursor = 0;
      for (;;) {
        const page = await s.pull(cursor, 2);
        ids.push(...page.rows.map((r) => r.row.id));
        cursor = page.cursor;
        if (!page.more) break;
      }
      expect(ids.sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('replaceAll은 기존 행을 표식하고 보낸 행만 남긴다 — 같은 id는 더 오래된 updated_at이어도 살아난다', async () => {
      const s = await make();
      await s.push('d1', [
        { entity: 'goal', op: 'upsert', row: goal('old', 50) },
        { entity: 'goal', op: 'upsert', row: goal('same', 50, '서버 것') },
      ]);
      await s.replaceAll('d2', { goals: [goal('same', 1, '기기 것'), goal('new', 1)], stickers: [], records: [] });
      const m = await snapshot(s);
      expect(liveIds(m, 'goal')).toEqual(['new', 'same']);
      expect(m.get('goal:same')?.row).toEqual(goal('same', 1, '기기 것'));
    });
  });
}
```

주의: "같은 변경을 다시 보내도" 테스트의 묶음은 g2를 올린 뒤 같은 묶음에서 지운다. 두 번째 전송에서 g2 upsert(`updated_at` 3, 기존도 3)가 g2를 되살린 뒤 delete가 다시 표식하므로 결과는 같다. FakeServer와 SQL 모두 이 순서를 따른다.

`__tests__/fakeServerContract.test.ts`:
```ts
import { FakeServer } from './support/fakeServer';
import { describeSyncServerContract } from './support/syncServerContract';

describeSyncServerContract('FakeServer', async () => new FakeServer());
```

`__tests__/server/syncServer.contract.test.ts`:
```ts
import { SupabaseSyncServer } from '../../src/sync/supabaseServer';
import { describeSyncServerContract } from '../support/syncServerContract';
import { describeIfServer, newUser } from './support';

describeSyncServerContract('Supabase 개발 프로젝트', async () => {
  const { client } = await newUser();
  return new SupabaseSyncServer({ rpc: (fn, args) => client.rpc(fn, args) });
}, describeIfServer);
```

`src/sync/supabaseServer.ts`:
```ts
import { SyncRejected } from './contract';
import type { Change, GoalRow, PulledRow, RecordRow, StickerRow, SyncServer } from './contract';

/** supabase-js에서 쓰는 부분. 테스트에서 바꿔 끼운다. */
export type RpcClient = {
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>;
};

/**
 * 서버가 내용 때문에 거부한 오류인가. 22xxx(형식·값), 23xxx(무결성: 부모 없음 등)만 보류 대상이다.
 * 인증(42501 등)·네트워크·서버 장애는 다시 시도한다 — 보류하면 로그인 뒤에도 올라가지 않는다.
 */
export function isRejection(code: string | undefined): boolean {
  return !!code && (code.startsWith('22') || code.startsWith('23'));
}

/** SyncServer를 Supabase RPC로 (계정·백업 설계 ③). 규칙은 모두 서버 SQL 함수에 있다. */
export class SupabaseSyncServer implements SyncServer {
  constructor(private readonly client: RpcClient) {}

  private async call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.client.rpc(fn, args);
    if (error) throw isRejection(error.code) ? new SyncRejected(error.message) : new Error(error.message);
    return data as T;
  }

  async push(deviceId: string, changes: Change[]): Promise<void> {
    await this.call('push_changes', { p_device_id: deviceId, p_changes: changes });
  }

  pull(since: number, limit: number): Promise<{ rows: PulledRow[]; cursor: number; more: boolean }> {
    return this.call('pull_changes', { p_since: since, p_limit: limit });
  }

  state(): Promise<{ goals: number; lastUpdatedAt: number | null }> {
    return this.call('server_state');
  }

  async replaceAll(deviceId: string, rows: { goals: GoalRow[]; stickers: StickerRow[]; records: RecordRow[] }): Promise<void> {
    await this.call('replace_all', { p_device_id: deviceId, p_rows: rows });
  }
}
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/fakeServerContract.test.ts`
Expected: PASS 8/8 (가짜 서버가 계약의 기준이다. 실패하면 계약 테스트가 FakeServer 동작을 잘못 적은 것이니 테스트를 고치고 ledger에 Ruling).
Run: `npm run test:server -- syncServer.contract`
Expected: FAIL — `Could not find the function public.server_state` (PGRST202).

- [ ] **Step 3: RPC 마이그레이션**

`supabase/migrations/20260930000002_sync_rpc.sql`:
```sql
-- 동기화 RPC (계정·백업 설계 ③). 규칙은 FakeServer(__tests__/support/fakeServer.ts)와 같다:
-- 더 최근 updated_at 우선(같으면 덮어씀), 목표·스티커 삭제는 딸린 행까지 표식, 멱등.
-- 형식이 틀리면 22xxx, 부모가 없으면 23503 — 앱은 이것만 "보류"로 본다.

create function private.require_user() returns uuid language plpgsql stable set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  return uid;
end $$;

-- 행 하나 upsert. force면 updated_at과 상관없이 쓴다(replace_all).
create function private.apply_upsert(uid uuid, device text, entity text, r jsonb, force boolean)
returns void language plpgsql set search_path = '' as $$
begin
  if entity = 'goal' then
    insert into public.goals as t (user_id, id, name, board_type, total_slots, default_sticker_id, created_at, end_date,
      completed_at, completion_seen, last_placed_at, initial_slots, updated_at, deleted_at, device_id)
    values (uid, r->>'id', r->>'name', r->>'board_type', (r->>'total_slots')::int, r->>'default_sticker_id',
      (r->>'created_at')::bigint, r->>'end_date', (r->>'completed_at')::bigint, (r->>'completion_seen')::int,
      (r->>'last_placed_at')::bigint, (r->>'initial_slots')::int, (r->>'updated_at')::bigint, null, device)
    on conflict (user_id, id) do update set
      name = excluded.name, board_type = excluded.board_type, total_slots = excluded.total_slots,
      default_sticker_id = excluded.default_sticker_id, created_at = excluded.created_at, end_date = excluded.end_date,
      completed_at = excluded.completed_at, completion_seen = excluded.completion_seen,
      last_placed_at = excluded.last_placed_at, initial_slots = excluded.initial_slots,
      updated_at = excluded.updated_at, deleted_at = null, device_id = excluded.device_id
    where force or t.updated_at <= excluded.updated_at;
  elsif entity = 'sticker' then
    insert into public.stickers as t (user_id, id, goal_id, placed_at, slot_index, sticker_type, updated_at, deleted_at, device_id)
    values (uid, r->>'id', r->>'goal_id', (r->>'placed_at')::bigint, (r->>'slot_index')::int, r->>'sticker_type',
      (r->>'updated_at')::bigint, null, device)
    on conflict (user_id, id) do update set
      goal_id = excluded.goal_id, placed_at = excluded.placed_at, slot_index = excluded.slot_index,
      sticker_type = excluded.sticker_type, updated_at = excluded.updated_at, deleted_at = null, device_id = excluded.device_id
    where force or t.updated_at <= excluded.updated_at;
  elsif entity = 'record' then
    insert into public.records as t (user_id, id, sticker_id, memo, photo_remote_path, created_at, updated_at, deleted_at, device_id)
    values (uid, r->>'id', r->>'sticker_id', r->>'memo', r->>'photo_remote_path', (r->>'created_at')::bigint,
      (r->>'updated_at')::bigint, null, device)
    on conflict (user_id, id) do update set
      sticker_id = excluded.sticker_id, memo = excluded.memo, photo_remote_path = excluded.photo_remote_path,
      created_at = excluded.created_at, updated_at = excluded.updated_at, deleted_at = null, device_id = excluded.device_id
    where force or t.updated_at <= excluded.updated_at;
  else
    raise exception 'unknown entity %', entity using errcode = '22023';
  end if;
end $$;

-- 삭제 표식. 이미 표식된 행은 건드리지 않아 다시 보내도 seq가 바뀌지 않는다.
create function private.apply_delete(uid uuid, device text, entity text, target text, at bigint)
returns void language plpgsql set search_path = '' as $$
begin
  if target is null or at is null then raise exception 'delete needs id and deletedAt' using errcode = '22023'; end if;
  if entity = 'goal' then
    update public.goals set deleted_at = at, device_id = device where user_id = uid and id = target and deleted_at is null;
    update public.records set deleted_at = at where user_id = uid and deleted_at is null
      and sticker_id in (select id from public.stickers where user_id = uid and goal_id = target);
    update public.stickers set deleted_at = at where user_id = uid and goal_id = target and deleted_at is null;
  elsif entity = 'sticker' then
    update public.stickers set deleted_at = at, device_id = device where user_id = uid and id = target and deleted_at is null;
    update public.records set deleted_at = at where user_id = uid and sticker_id = target and deleted_at is null;
  elsif entity = 'record' then
    update public.records set deleted_at = at, device_id = device where user_id = uid and id = target and deleted_at is null;
  else
    raise exception 'unknown entity %', entity using errcode = '22023';
  end if;
end $$;

create function public.push_changes(p_device_id text, p_changes jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  c jsonb;
begin
  if jsonb_typeof(p_changes) is distinct from 'array' then
    raise exception 'changes must be an array' using errcode = '22023';
  end if;
  for c in select value from jsonb_array_elements(p_changes) loop
    if c->>'op' = 'upsert' then
      perform private.apply_upsert(uid, p_device_id, c->>'entity', c->'row', false);
    elsif c->>'op' = 'delete' then
      perform private.apply_delete(uid, p_device_id, c->>'entity', c->>'id', (c->>'deletedAt')::bigint);
    else
      raise exception 'unknown op %', c->>'op' using errcode = '22023';
    end if;
  end loop;
  -- 부모 확인(외래키)을 이 호출 안에서 끝낸다. 오류가 23503으로 이 RPC의 응답에 실린다.
  set constraints all immediate;
end $$;

create function public.pull_changes(p_since bigint, p_limit int) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  lim int := least(greatest(coalesce(p_limit, 500), 1), 1000);
  result jsonb;
begin
  with changed as (
    select 'goal' as entity, seq, deleted_at, jsonb_build_object(
        'id', id, 'name', name, 'board_type', board_type, 'total_slots', total_slots,
        'default_sticker_id', default_sticker_id, 'created_at', created_at, 'end_date', end_date,
        'completed_at', completed_at, 'completion_seen', completion_seen, 'last_placed_at', last_placed_at,
        'initial_slots', initial_slots, 'updated_at', updated_at) as row
      from public.goals where user_id = uid and seq > p_since
    union all
    select 'sticker', seq, deleted_at, jsonb_build_object(
        'id', id, 'goal_id', goal_id, 'placed_at', placed_at, 'slot_index', slot_index,
        'sticker_type', sticker_type, 'updated_at', updated_at)
      from public.stickers where user_id = uid and seq > p_since
    union all
    select 'record', seq, deleted_at, jsonb_build_object(
        'id', id, 'sticker_id', sticker_id, 'memo', memo, 'photo_remote_path', photo_remote_path,
        'created_at', created_at, 'updated_at', updated_at)
      from public.records where user_id = uid and seq > p_since
  ),
  page as (select * from changed order by seq limit lim + 1),
  kept as (select * from page order by seq limit lim)
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(jsonb_build_object('entity', entity, 'row', row, 'deletedAt', deleted_at) order by seq) from kept), '[]'::jsonb),
    'cursor', coalesce((select max(seq) from kept), p_since),
    'more', (select count(*) from page) > lim
  ) into result;
  return result;
end $$;

create function public.server_state() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := private.require_user();
begin
  return jsonb_build_object(
    'goals', (select count(*) from public.goals where user_id = uid and deleted_at is null),
    'lastUpdatedAt', (select max(u) from (
      select max(updated_at) as u from public.goals where user_id = uid and deleted_at is null
      union all select max(updated_at) from public.stickers where user_id = uid and deleted_at is null
      union all select max(updated_at) from public.records where user_id = uid and deleted_at is null) t));
end $$;

create function public.replace_all(p_device_id text, p_rows jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  now_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  r jsonb;
begin
  update public.goals set deleted_at = now_ms where user_id = uid and deleted_at is null;
  update public.stickers set deleted_at = now_ms where user_id = uid and deleted_at is null;
  update public.records set deleted_at = now_ms where user_id = uid and deleted_at is null;
  for r in select value from jsonb_array_elements(coalesce(p_rows->'goals', '[]'::jsonb)) loop
    perform private.apply_upsert(uid, p_device_id, 'goal', r, true);
  end loop;
  for r in select value from jsonb_array_elements(coalesce(p_rows->'stickers', '[]'::jsonb)) loop
    perform private.apply_upsert(uid, p_device_id, 'sticker', r, true);
  end loop;
  for r in select value from jsonb_array_elements(coalesce(p_rows->'records', '[]'::jsonb)) loop
    perform private.apply_upsert(uid, p_device_id, 'record', r, true);
  end loop;
  set constraints all immediate;
end $$;

create function public.record_consent(p_terms_version int, p_privacy_version int) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  now_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  if p_terms_version is null or p_privacy_version is null then
    raise exception 'versions required' using errcode = '22023';
  end if;
  insert into public.accounts (user_id, provider, terms_version, privacy_version, agreed_at, age_confirmed_at, created_at)
  values (uid, (select raw_app_meta_data->>'provider' from auth.users where id = uid),
    p_terms_version, p_privacy_version, now_ms, now_ms, now_ms)
  on conflict (user_id) do update set
    terms_version = excluded.terms_version, privacy_version = excluded.privacy_version,
    agreed_at = excluded.agreed_at, age_confirmed_at = excluded.age_confirmed_at;
end $$;

revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on function public.push_changes(text, jsonb), public.pull_changes(bigint, int), public.server_state(),
  public.replace_all(text, jsonb), public.record_consent(int, int) from public, anon;
grant execute on function public.push_changes(text, jsonb), public.pull_changes(bigint, int), public.server_state(),
  public.replace_all(text, jsonb), public.record_consent(int, int) to authenticated;
```

Run: `supabase db push` → 오류 없음.

- [ ] **Step 4: 통과 확인**

Run: `npm run test:server -- syncServer.contract` → PASS 8/8.
Run: `npm test` → 전체 PASS (계약 8개 추가, 서버 테스트 skipped).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260930000002_sync_rpc.sql __tests__ src/sync/supabaseServer.ts
git commit -m "feat(server): sync RPCs held to the same contract as the fake server"
```

---

### Task 3: 보안·경계 테스트 (실제 서버 전용)

**Files:**
- Create: `__tests__/server/security.test.ts`
- Create: (실패 시) 고치는 새 마이그레이션 파일

**Interfaces:**
- Consumes: Task 2 RPC, `SupabaseSyncServer`, `newUser`, `anonClient`, 계약 헬퍼 `goal/sticker/record/snapshot/liveIds`.

- [ ] **Step 1: 테스트 작성**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { SyncRejected } from '../../src/sync/contract';
import { SupabaseSyncServer } from '../../src/sync/supabaseServer';
import { goal, liveIds, record, snapshot, sticker } from '../support/syncServerContract';
import { anonClient, describeIfServer, newUser } from './support';

const serverOf = (client: SupabaseClient) => new SupabaseSyncServer({ rpc: (fn, args) => client.rpc(fn, args) });

describeIfServer('서버 보안·경계', () => {
  it('다른 사용자의 행은 받을 수 없다', async () => {
    const a = await newUser(); const b = await newUser();
    await serverOf(a.client).push('d1', [{ entity: 'goal', op: 'upsert', row: goal('g1') }]);
    expect(liveIds(await snapshot(serverOf(b.client)), 'goal')).toEqual([]);
    expect((await b.client.from('goals').select('id')).data).toEqual([]);
  });

  it('같은 id를 다른 사용자가 보내도 서로 영향 없다', async () => {
    const a = await newUser(); const b = await newUser();
    await serverOf(a.client).push('d1', [{ entity: 'goal', op: 'upsert', row: goal('same', 1, 'A 것') }]);
    await serverOf(b.client).push('d2', [{ entity: 'goal', op: 'upsert', row: goal('same', 99, 'B 것') }]);
    await serverOf(b.client).push('d2', [{ entity: 'goal', op: 'delete', id: 'same', deletedAt: 100 }]);
    expect((await snapshot(serverOf(a.client))).get('goal:same')).toEqual({ deletedAt: null, row: goal('same', 1, 'A 것') });
  });

  it('부모 목표가 서버에 없는 스티커는 거부된다 (SyncRejected, 보류 대상)', async () => {
    const a = await newUser();
    await expect(serverOf(a.client).push('d1', [{ entity: 'sticker', op: 'upsert', row: sticker('s1', '없는-목표') }]))
      .rejects.toBeInstanceOf(SyncRejected);
    expect(liveIds(await snapshot(serverOf(a.client)), 'sticker')).toEqual([]);
  });

  it('형식이 틀린 행은 거부되고 묶음 전체가 반영되지 않는다', async () => {
    const a = await newUser();
    const bad = { ...record('r1', 's1'), created_at: '어제' } as unknown as ReturnType<typeof record>;
    await expect(serverOf(a.client).push('d1', [
      { entity: 'goal', op: 'upsert', row: goal('g1') },
      { entity: 'record', op: 'upsert', row: bad },
    ])).rejects.toBeInstanceOf(SyncRejected);
    expect(liveIds(await snapshot(serverOf(a.client)), 'goal')).toEqual([]);
  });

  it('로그인 없이 부르면 거부(보류)가 아닌 일반 오류다', async () => {
    const err = await serverOf(anonClient()).state().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(SyncRejected);
  });

  it('record_consent는 자기 동의 이력만 남긴다', async () => {
    const a = await newUser();
    expect((await a.client.rpc('record_consent', { p_terms_version: 1, p_privacy_version: 1 })).error).toBeNull();
    const { data } = await a.client.from('accounts').select('user_id, terms_version, privacy_version');
    expect(data).toEqual([{ user_id: a.userId, terms_version: 1, privacy_version: 1 }]);
  });
});
```

- [ ] **Step 2: 실행**

Run: `npm run test:server -- security`
Expected: PASS 6/6. Task 2 마이그레이션이 이미 규칙을 갖췄으므로 새 구현 없이 통과해야 한다 — 이 태스크의 테스트는 **회귀 방지**다. 하나라도 FAIL이면 원인을 찾아 **새 마이그레이션 파일**(`create or replace function ...`)로 고치고 `supabase db push`한다(예: 부모 없음이 `23503`이 아닌 코드로 오면 `set constraints all immediate` 확인).

- [ ] **Step 3: Commit**

```bash
git add __tests__/server/security.test.ts supabase/migrations
git commit -m "test(server): isolation, rejection and consent checks against the real server"
```

---

### Task 4: 사진 버킷과 정책

**Files:**
- Create: `supabase/migrations/20260930000003_photos.sql`
- Create: `__tests__/server/photos.test.ts`

**Interfaces:**
- Produces: 비공개 버킷 `record-photos` (최대 5MB, `image/jpeg`만), 경로 `{user_id}/{record_id}.jpg`.

- [ ] **Step 1: 실패하는 테스트**

```ts
import { describeIfServer, newUser } from './support';

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

describeIfServer('사진 저장소', () => {
  it('자기 폴더에 올리고 받고 지울 수 있다', async () => {
    const a = await newUser();
    const path = `${a.userId}/r1.jpg`;
    const bucket = a.client.storage.from('record-photos');
    expect((await bucket.upload(path, jpeg, { contentType: 'image/jpeg', upsert: true })).error).toBeNull();
    expect((await bucket.upload(path, jpeg, { contentType: 'image/jpeg', upsert: true })).error).toBeNull();
    expect((await bucket.createSignedUrl(path, 60)).data?.signedUrl).toContain('record-photos');
    expect((await bucket.remove([path])).error).toBeNull();
  });

  it('남의 폴더에는 올릴 수 없고 남의 사진은 받을 수 없다', async () => {
    const a = await newUser(); const b = await newUser();
    await a.client.storage.from('record-photos').upload(`${a.userId}/r1.jpg`, jpeg, { contentType: 'image/jpeg' });
    expect((await b.client.storage.from('record-photos').upload(`${a.userId}/x.jpg`, jpeg, { contentType: 'image/jpeg' })).error).not.toBeNull();
    expect((await b.client.storage.from('record-photos').createSignedUrl(`${a.userId}/r1.jpg`, 60)).error).not.toBeNull();
  });

  it('JPEG가 아니면 거부한다', async () => {
    const a = await newUser();
    const { error } = await a.client.storage.from('record-photos')
      .upload(`${a.userId}/r2.png`, jpeg, { contentType: 'image/png' });
    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:server -- photos` → FAIL (`Bucket not found`).

- [ ] **Step 3: 마이그레이션 (버킷·정책)**

`supabase/migrations/20260930000003_photos.sql`:
```sql
-- 기록 사진 (계정·백업 설계 ③ Storage). 비공개, 본인 폴더({user_id}/)만.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('record-photos', 'record-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create policy record_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy record_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'record-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy record_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'record-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy record_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
```

Run: `supabase db push`

- [ ] **Step 4: 통과 확인**

Run: `npm run test:server -- photos` → PASS 3/3.
이때 "JPEG가 아니면 거부" 오류의 상태 코드 필드 이름과 값을 출력해 확인한다(`console.log(error)` 한 번). Task 7의 `isPhotoRejection`이 읽는 필드(`statusCode`/`status`)와 코드(413·415·400)가 실제와 맞는지 ledger에 적는다.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260930000003_photos.sql __tests__/server/photos.test.ts
git commit -m "feat(server): private record-photos bucket scoped to each user's folder"
```

---

### Task 5: 계정 삭제 Edge Function

**Files:**
- Create: `supabase/migrations/20260930000004_account_admin.sql`
- Create: `supabase/functions/delete-account/index.ts`
- Create: `src/sync/account.ts`
- Create: `__tests__/server/deleteAccount.test.ts`

**Interfaces:**
- Consumes: `RpcClient`(Task 2).
- Produces: `deleteAccountOnServer(client: FunctionsClient): Promise<void>` — 실패하면 던진다. `type FunctionsClient = { functions: { invoke(name: string): PromiseLike<{ error: { message: string } | null }> } }`.
- Produces: `recordConsent(client: RpcClient, termsVersion: number, privacyVersion: number): Promise<void>`.
- Produces (SQL, service_role 전용): `public.admin_has_apple_token(p_user uuid) → boolean`, `public.admin_delete_user_rows(p_user uuid) → void`.

- [ ] **Step 1: 실패하는 테스트**

```ts
import { SupabaseSyncServer } from '../../src/sync/supabaseServer';
import { deleteAccountOnServer } from '../../src/sync/account';
import { goal } from '../support/syncServerContract';
import { adminClient, anonClient, describeIfServer, newUser } from './support';

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

describeIfServer('delete-account', () => {
  it('사진·행·인증 계정을 모두 지운다', async () => {
    const a = await newUser();
    await new SupabaseSyncServer({ rpc: (fn, args) => a.client.rpc(fn, args) })
      .push('d1', [{ entity: 'goal', op: 'upsert', row: goal('g1') }]);
    await a.client.storage.from('record-photos').upload(`${a.userId}/r1.jpg`, jpeg, { contentType: 'image/jpeg' });

    await deleteAccountOnServer(a.client);

    const admin = adminClient();
    expect((await admin.from('goals').select('id').eq('user_id', a.userId)).data).toEqual([]);
    expect((await admin.storage.from('record-photos').list(a.userId)).data).toEqual([]);
    expect((await admin.auth.admin.getUserById(a.userId)).data.user).toBeNull();
  });

  it('두 번 불러도 성공한다 (중간 실패 뒤 다시 누름)', async () => {
    const a = await newUser();
    await deleteAccountOnServer(a.client);
    await expect(deleteAccountOnServer(a.client)).resolves.toBeUndefined();
  });

  it('로그인 없이는 부를 수 없다', async () => {
    await expect(deleteAccountOnServer(anonClient())).rejects.toThrow();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:server -- deleteAccount` → FAIL (`Cannot find module '../../src/sync/account'`).

- [ ] **Step 3: 관리 함수**

`supabase/migrations/20260930000004_account_admin.sql`:
```sql
-- 계정 삭제용 (delete-account Edge Function만 service_role로 부른다).
create function public.admin_has_apple_token(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.apple_tokens where user_id = p_user);
$$;

create function public.admin_delete_user_rows(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.records where user_id = p_user;
  delete from public.stickers where user_id = p_user;
  delete from public.goals where user_id = p_user;
  delete from public.accounts where user_id = p_user;
end $$;

revoke execute on function public.admin_has_apple_token(uuid), public.admin_delete_user_rows(uuid) from public, anon, authenticated;
grant execute on function public.admin_has_apple_token(uuid), public.admin_delete_user_rows(uuid) to service_role;
```

- [ ] **Step 4: Edge Function과 앱 쪽 호출**

`supabase/functions/delete-account/index.ts`:
```ts
// 계정 삭제 (계정·백업 설계 ③). 순서: Apple 토큰 폐기 → 사진 폴더 → 데이터 행 → 인증 계정.
// 단계마다 이미 끝났으면 넘어가므로 다시 불러도 남은 단계부터 이어진다(멱등).
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** JWT의 sub만 읽는다. 서명은 게이트웨이(verify_jwt)가 이미 확인했다. 인증 계정이 지워진 뒤의 재시도도 받기 위해서다. */
function userIdFrom(req: Request): string | null {
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role === 'authenticated' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const uid = userIdFrom(req);
  if (!uid) return json({ error: 'unauthorized' }, 401);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Apple 토큰 폐기 — Apple 로그인(apple-link)을 붙일 때 구현한다. 그전에 토큰이 생기면 조용히 건너뛰지 않고 멈춘다.
  const apple = await admin.rpc('admin_has_apple_token', { p_user: uid });
  if (apple.error) return json({ error: apple.error.message, step: 'apple' }, 500);
  if (apple.data === true) return json({ error: 'apple revoke not configured', step: 'apple' }, 500);

  // 2. 사진 폴더
  const bucket = admin.storage.from('record-photos');
  for (;;) {
    const listed = await bucket.list(uid, { limit: 100 });
    if (listed.error) return json({ error: listed.error.message, step: 'photos' }, 500);
    if (!listed.data.length) break;
    const removed = await bucket.remove(listed.data.map((f) => `${uid}/${f.name}`));
    if (removed.error) return json({ error: removed.error.message, step: 'photos' }, 500);
  }

  // 3. 데이터 행
  const rows = await admin.rpc('admin_delete_user_rows', { p_user: uid });
  if (rows.error) return json({ error: rows.error.message, step: 'rows' }, 500);

  // 4. 인증 계정 (이미 없으면 끝난 것)
  const deleted = await admin.auth.admin.deleteUser(uid);
  if (deleted.error && deleted.error.status !== 404) return json({ error: deleted.error.message, step: 'auth' }, 500);

  return json({ ok: true });
});
```

`src/sync/account.ts`:
```ts
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
```

Run: `supabase db push` → `supabase functions deploy delete-account --use-api`
(`--use-api`는 Docker 없이 서버에서 묶는다. CLI가 이 옵션을 모르면 `supabase functions deploy --help`로 Docker 없이 올리는 방법을 확인하고 ledger에 Ruling.)
그다음 함수가 떠 있는지 확인: `. ./.env.server.local && curl -s -o /dev/null -w '%{http_code}' -X POST "$SUPABASE_TEST_URL/functions/v1/delete-account"`
Expected: `401` (게이트웨이가 JWT 없음을 거부).

- [ ] **Step 5: 통과 확인**

Run: `npm run test:server -- deleteAccount` → PASS 3/3.
두 번째 테스트가 게이트웨이 401로 실패하면(지워진 사용자의 JWT를 게이트웨이가 거부하는 경우), 함수는 그대로 두고 **앱 쪽 규칙**으로 멱등을 지킨다: `deleteAccountOnServer`가 401을 "이미 삭제됨"으로 보지 않도록, 테스트를 "삭제 도중 3단계까지만 끝난 상태에서 다시 부르면 끝난다"로 바꾼다(`admin_delete_user_rows`를 먼저 직접 부른 뒤 `deleteAccountOnServer` 호출). 어느 쪽을 택했는지 ledger에 Ruling.

- [ ] **Step 6: Commit**

```bash
git add supabase src/sync/account.ts __tests__/server/deleteAccount.test.ts
git commit -m "feat(server): delete-account removes photos, rows and the auth user, resumable"
```

---

### Task 6: 앱 SyncServer — 오류 분류와 실제 서버 왕복

**Files:**
- Create: `__tests__/supabaseServer.test.ts`, `__tests__/server/syncEndToEnd.test.ts`
- Modify: (필요 시) `src/sync/supabaseServer.ts`

**Interfaces:**
- Consumes: `SupabaseSyncServer`, `isRejection`, `pushOnce`, `restoreAll`, `withFreshDb`, `setDriverFactory`, `createNodeDriver`, `FakePhotos`, `newUser`.

- [ ] **Step 1: 단위 테스트 (서버 없이)**

`__tests__/supabaseServer.test.ts`:
```ts
import { SyncRejected } from '../src/sync/contract';
import { isRejection, SupabaseSyncServer } from '../src/sync/supabaseServer';

const serverReturning = (error: { code?: string; message: string } | null, data: unknown = null) => {
  const calls: { fn: string; args?: Record<string, unknown> }[] = [];
  const server = new SupabaseSyncServer({ rpc: async (fn, args) => { calls.push({ fn, args }); return { data, error }; } });
  return { server, calls };
};

describe('SupabaseSyncServer', () => {
  it('형식·무결성 오류만 보류 대상이다', () => {
    expect(isRejection('22023')).toBe(true);
    expect(isRejection('22P02')).toBe(true);
    expect(isRejection('23503')).toBe(true);
    expect(isRejection('42501')).toBe(false); // 로그인 안 됨 → 재시도
    expect(isRejection('PGRST301')).toBe(false); // JWT 만료 → 재시도
    expect(isRejection('')).toBe(false); // 네트워크
    expect(isRejection(undefined)).toBe(false);
  });

  it('거부는 SyncRejected, 나머지는 일반 오류로 던진다', async () => {
    await expect(serverReturning({ code: '23503', message: 'fk' }).server.push('d', [])).rejects.toBeInstanceOf(SyncRejected);
    const other = await serverReturning({ code: '42501', message: 'not signed in' }).server.push('d', []).catch((e: unknown) => e);
    expect(other).toBeInstanceOf(Error);
    expect(other).not.toBeInstanceOf(SyncRejected);
  });

  it('RPC 이름과 인자 이름이 서버 함수와 같다', async () => {
    const { server, calls } = serverReturning(null, { rows: [], cursor: 0, more: false });
    await server.push('dev', []);
    await server.pull(3, 50);
    await server.replaceAll('dev', { goals: [], stickers: [], records: [] });
    expect(calls).toEqual([
      { fn: 'push_changes', args: { p_device_id: 'dev', p_changes: [] } },
      { fn: 'pull_changes', args: { p_since: 3, p_limit: 50 } },
      { fn: 'replace_all', args: { p_device_id: 'dev', p_rows: { goals: [], stickers: [], records: [] } } },
    ]);
  });
});
```

Run: `npx jest __tests__/supabaseServer.test.ts`
Expected: PASS 3/3 (구현은 Task 2에 있다). 이 테스트가 잡는지 확인: `isRejection`을 잠깐 `return !!code`로 바꿔 첫 테스트가 FAIL하는지 보고 되돌린다.

- [ ] **Step 2: 실제 서버 왕복 테스트**

먼저 `src/repositories/recordRepository.ts`에서 `upsertRecord`의 인자 모양을 확인해 아래 호출을 맞춘다.

`__tests__/server/syncEndToEnd.test.ts`:
```ts
import { setDriverFactory } from '../../src/db/client';
import { createGoal, listGoals } from '../../src/repositories/goalRepository';
import { placeSticker } from '../../src/repositories/stickerRepository';
import { upsertRecord } from '../../src/repositories/recordRepository';
import { pendingCount } from '../../src/sync/outbox';
import { pushOnce } from '../../src/sync/push';
import { restoreAll } from '../../src/sync/restore';
import { SupabaseSyncServer } from '../../src/sync/supabaseServer';
import { FakePhotos } from '../support/fakeServer';
import { createNodeDriver } from '../support/nodeDriver';
import { withFreshDb } from '../support/setup';
import { describeIfServer, newUser } from './support';

withFreshDb();

describeIfServer('기기 ↔ 서버 왕복', () => {
  it('기기에서 올린 기록을 새 기기에서 복원한다', async () => {
    const { client } = await newUser();
    const server = new SupabaseSyncServer({ rpc: (fn, args) => client.rpc(fn, args) });
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 5 });
    const s = await placeSticker(g.id, 0);
    await upsertRecord({ stickerId: s.id, memo: '공원 한 바퀴', photoUri: null });

    await pushOnce({ server, photos: new FakePhotos(), deviceId: 'phone' });
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });

    setDriverFactory(async () => createNodeDriver()); // 새 기기
    expect(await listGoals()).toEqual([]);
    await restoreAll(server);
    expect((await listGoals()).map((x) => x.name)).toEqual(['산책']);
  });
});
```

- [ ] **Step 3: 실행**

Run: `npm run test:server -- syncEndToEnd` → PASS 1/1.
Run: `npm test` → 전체 PASS.

- [ ] **Step 4: Commit**

```bash
git add __tests__/supabaseServer.test.ts __tests__/server/syncEndToEnd.test.ts src/sync/supabaseServer.ts
git commit -m "test(sync): classify server errors and round-trip device data through the server"
```

---

### Task 7: 앱 PhotoStore

**Files:**
- Create: `src/sync/supabasePhotos.ts`, `src/sync/expoPhotoIO.ts`, `__tests__/supabasePhotos.test.ts`
- Modify: `src/app-data/recordPhotos.ts` (`newManagedPhotoFile`), `package.json` (`expo-image-manipulator`)

**Interfaces:**
- Produces: `class SupabasePhotoStore implements PhotoStore { constructor(bucket: StorageBucket, userId: string, io: PhotoIO) }`, `type StorageBucket`, `type PhotoIO`, `expoPhotoIO: PhotoIO`, `newManagedPhotoFile(name: string): { file: File; stored: string }`.

- [ ] **Step 1: 실패하는 테스트**

`__tests__/supabasePhotos.test.ts`:
```ts
import { PhotoRejected } from '../src/sync/contract';
import { SupabasePhotoStore } from '../src/sync/supabasePhotos';
import type { PhotoIO, StorageBucket } from '../src/sync/supabasePhotos';

function setup(opts: { uploadError?: { message: string; status?: number; statusCode?: string } } = {}) {
  const uploads: string[] = []; const removed: string[][] = []; const saved: string[] = [];
  const bucket: StorageBucket = {
    upload: async (path) => { uploads.push(path); return { error: opts.uploadError ?? null }; },
    remove: async (paths) => { removed.push(paths); return { error: null }; },
    createSignedUrl: async (path) => ({ data: { signedUrl: `https://x/${path}?t=1` }, error: null }),
  };
  const io: PhotoIO = {
    compress: async (uri) => (uri === 'record-photo:없음.jpg' ? null : new Uint8Array([1])),
    save: async (url, recordId) => { saved.push(url); return `record-photo:${recordId}-restored.jpg`; },
  };
  return { store: new SupabasePhotoStore(bucket, 'u1', io), uploads, removed, saved };
}

describe('SupabasePhotoStore', () => {
  it('자기 폴더 경로로 올리고 그 경로를 돌려준다', async () => {
    const t = setup();
    expect(await t.store.upload('r1', 'record-photo:a.jpg')).toBe('u1/r1.jpg');
    expect(t.uploads).toEqual(['u1/r1.jpg']);
  });

  it('기기 원본이 없으면 올리지 않고 null', async () => {
    const t = setup();
    expect(await t.store.upload('r1', 'record-photo:없음.jpg')).toBeNull();
    expect(t.uploads).toEqual([]);
  });

  it('크기·형식 거부는 PhotoRejected, 그 밖은 일반 오류', async () => {
    await expect(setup({ uploadError: { message: 'too large', status: 400, statusCode: '413' } }).store.upload('r1', 'record-photo:a.jpg'))
      .rejects.toBeInstanceOf(PhotoRejected);
    await expect(setup({ uploadError: { message: 'bad type', status: 400, statusCode: '415' } }).store.upload('r1', 'record-photo:a.jpg'))
      .rejects.toBeInstanceOf(PhotoRejected);
    for (const uploadError of [{ message: 'rls', status: 400, statusCode: '403' }, { message: 'Network request failed' }]) {
      const other = await setup({ uploadError }).store.upload('r1', 'record-photo:a.jpg').catch((e: unknown) => e);
      expect(other).toBeInstanceOf(Error);
      expect(other).not.toBeInstanceOf(PhotoRejected);
    }
  });

  it('지우기와 받기는 기록 id의 경로를 쓴다', async () => {
    const t = setup();
    await t.store.remove('r1');
    expect(t.removed).toEqual([['u1/r1.jpg']]);
    expect(await t.store.download('u1/r2.jpg', 'r2')).toBe('record-photo:r2-restored.jpg');
    expect(t.saved).toEqual(['https://x/u1/r2.jpg?t=1']);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/supabasePhotos.test.ts` → FAIL (`Cannot find module '../src/sync/supabasePhotos'`).

- [ ] **Step 3: 구현**

`src/sync/supabasePhotos.ts` (거부 코드는 Task 4 Step 4에서 확인한 실제 값으로 맞춘다):
```ts
import { PhotoRejected } from './contract';
import type { PhotoStore } from './contract';

type StorageError = { message: string; status?: number | string; statusCode?: number | string };
/** supabase-js storage.from(bucket)에서 쓰는 부분. 테스트에서 바꿔 끼운다. */
export type StorageBucket = {
  upload(path: string, body: Uint8Array, options: { contentType: string; upsert: boolean }): PromiseLike<{ error: StorageError | null }>;
  remove(paths: string[]): PromiseLike<{ error: StorageError | null }>;
  createSignedUrl(path: string, expiresIn: number): PromiseLike<{ data: { signedUrl: string } | null; error: StorageError | null }>;
};
/** 기기 쪽 사진 입출력. 실제 구현은 expoPhotoIO. */
export type PhotoIO = {
  /** 저장용 URI의 기기 파일을 긴 변 1600px·JPEG 80%로 줄인 바이트. 파일이 없으면 null. 못 읽으면 PhotoRejected. */
  compress(storedUri: string): Promise<Uint8Array | null>;
  /** URL에서 받아 앱 사진 폴더에 두고 저장용 URI('record-photo:...')를 돌려준다. */
  save(url: string, recordId: string): Promise<string>;
};

/**
 * 다시 보내도 같은 결과인 거부: 너무 큼(413), 형식(415).
 * Storage는 HTTP status를 늘 400으로 주고 실제 구분은 statusCode에 담는다(2026-09-30 개발 서버에서 확인).
 * 그래서 status는 보지 않는다 — 권한(403)·네트워크 오류는 다시 시도한다.
 */
function isPhotoRejection(error: StorageError): boolean {
  const code = String(error.statusCode ?? '');
  return code === '413' || code === '415';
}

/** PhotoStore를 Supabase Storage로 (계정·백업 설계 ③). 경로는 {user_id}/{record_id}.jpg. */
export class SupabasePhotoStore implements PhotoStore {
  constructor(private readonly bucket: StorageBucket, private readonly userId: string, private readonly io: PhotoIO) {}

  private path(recordId: string): string {
    return `${this.userId}/${recordId}.jpg`;
  }

  async upload(recordId: string, storedUri: string): Promise<string | null> {
    const bytes = await this.io.compress(storedUri);
    if (!bytes) return null;
    const { error } = await this.bucket.upload(this.path(recordId), bytes, { contentType: 'image/jpeg', upsert: true });
    if (error) throw isPhotoRejection(error) ? new PhotoRejected(error.message) : new Error(error.message);
    return this.path(recordId);
  }

  async remove(recordId: string): Promise<void> {
    const { error } = await this.bucket.remove([this.path(recordId)]);
    if (error) throw new Error(error.message);
  }

  async download(remotePath: string, recordId: string): Promise<string> {
    const { data, error } = await this.bucket.createSignedUrl(remotePath, 60);
    if (error || !data) throw new Error(error?.message ?? '사진 주소를 받지 못했어요');
    return this.io.save(data.signedUrl, recordId);
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest __tests__/supabasePhotos.test.ts` → PASS 4/4.

- [ ] **Step 5: 기기 입출력 (expo)**

의존성: `package.json`·`package-lock.json` 백업 → `npx expo install expo-image-manipulator` → `npm ls react-dom --all`이 `19.2.3` 하나인지 확인.
Expo 57 문서에서 확인한다(추측 금지): `expo-image-manipulator`의 `ImageManipulator.manipulate(uri)` → `.resize()` → `renderAsync()` → `saveAsync({ compress, format })`와 결과의 `width`/`height`/`uri`. `expo-file-system`의 `File.bytes()`와 `File.downloadFileAsync(url, destination)`. 시그니처가 다르면 아래 코드를 맞추고 ledger에 Ruling.

`src/app-data/recordPhotos.ts`에 추가:
```ts
/** 앱 사진 폴더의 새 파일과 DB에 둘 저장용 URI. 복원한 사진을 받을 때 쓴다. */
export function newManagedPhotoFile(name: string): { file: File; stored: string } {
  folder.create({ idempotent: true, intermediates: true });
  return { file: new File(folder, name), stored: PREFIX + name };
}
```

`src/sync/expoPhotoIO.ts`:
```ts
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { displayRecordPhotoUri, newManagedPhotoFile } from '../app-data/recordPhotos';
import { PhotoRejected } from './contract';
import type { PhotoIO } from './supabasePhotos';

/** 계정·백업 설계 결정: 긴 변 1600px · JPEG 80%. */
const LONG_SIDE = 1600;

export const expoPhotoIO: PhotoIO = {
  async compress(storedUri) {
    let source: File;
    try { source = new File(displayRecordPhotoUri(storedUri)); } catch { return null; }
    if (!source.exists) return null;
    let savedUri: string;
    try {
      const original = await ImageManipulator.manipulate(source.uri).renderAsync();
      const context = ImageManipulator.manipulate(source.uri);
      if (Math.max(original.width, original.height) > LONG_SIDE) {
        context.resize(original.width >= original.height ? { width: LONG_SIDE } : { height: LONG_SIDE });
      }
      savedUri = (await (await context.renderAsync()).saveAsync({ compress: 0.8, format: SaveFormat.JPEG })).uri;
    } catch (error) {
      throw new PhotoRejected(error instanceof Error ? error.message : '사진을 줄이지 못했어요');
    }
    const out = new File(savedUri);
    try {
      return await out.bytes();
    } finally {
      if (out.exists) out.delete();
    }
  },

  async save(url, recordId) {
    const { file, stored } = newManagedPhotoFile(`${recordId}-${Date.now()}.jpg`);
    await File.downloadFileAsync(url, file);
    return stored;
  },
};
```

Run: `npm run typecheck && npm run lint` → 오류 없음(기존 경고 3개만).

- [ ] **Step 6: Commit**

```bash
git add src/sync/supabasePhotos.ts src/sync/expoPhotoIO.ts src/app-data/recordPhotos.ts __tests__/supabasePhotos.test.ts package.json package-lock.json
git commit -m "feat(sync): photo store on Supabase Storage with 1600px JPEG uploads"
```

---

### Task 8: 앱 연결 — 클라이언트, 스케줄러, 개발용 화면

**Files:**
- Create: `src/sync/supabaseClient.ts`, `src/sync/connect.ts`, `__tests__/connect.test.ts`, `app/dev/sync.tsx`, `.env.example`, `scripts/dev-user.mjs`
- Modify: `app/_layout.tsx`, `app/settings.tsx`, `docs/DEV-SETUP.md`

**Interfaces:**
- Consumes: `createSyncScheduler`, `subscribeLocalChange`, `pushOnce`, `restoreAll`, `downloadRestoredPhotos`, `enqueueAll`, `pendingCount`, `getDeviceId`, `getSetting`, `setSetting`, `SupabaseSyncServer`, `SupabasePhotoStore`, `expoPhotoIO`.
- Produces: `getSupabase(): SupabaseClient | null`, `connectSync(deps: ConnectDeps): () => void`, `type ConnectDeps`.

- [ ] **Step 1: 실패하는 테스트**

`__tests__/connect.test.ts`:
```ts
import { connectSync } from '../src/sync/connect';

function harness() {
  let authFn: (userId: string | null) => void = () => {};
  let appFn: (active: boolean) => void = () => {};
  let localFn: () => void = () => {};
  const runs: string[] = [];
  const stop = connectSync({
    onAuthChange: (fn) => { authFn = fn; return () => { authFn = () => {}; }; },
    onAppActive: (fn) => { appFn = fn; return () => { appFn = () => {}; }; },
    onLocalChange: (fn) => { localFn = fn; return () => { localFn = () => {}; }; },
    makeRun: (userId) => async () => { runs.push(userId); },
    rememberUser: async () => {},
    debounceMs: 0,
  });
  return { stop, runs, signIn: (u: string | null) => authFn(u), active: () => appFn(true), local: () => localFn() };
}
const flush = () => new Promise((r) => setTimeout(r, 5));

describe('connectSync', () => {
  it('로그인 전에는 보내지 않는다', async () => {
    const h = harness();
    h.local(); h.active(); await flush();
    expect(h.runs).toEqual([]);
    h.stop();
  });

  it('로그인하면 바로 보내고, 기록이 바뀌거나 앱이 앞으로 오면 다시 보낸다', async () => {
    const h = harness();
    h.signIn('u1'); await flush();
    h.local(); await flush();
    h.active(); await flush();
    expect(h.runs).toEqual(['u1', 'u1', 'u1']);
    h.stop();
  });

  it('로그아웃하면 멈춘다', async () => {
    const h = harness();
    h.signIn('u1'); await flush();
    h.signIn(null); h.local(); h.active(); await flush();
    expect(h.runs).toEqual(['u1']);
    h.stop();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/connect.test.ts` → FAIL (`Cannot find module '../src/sync/connect'`).

- [ ] **Step 3: 구현**

`src/sync/connect.ts`:
```ts
import { createSyncScheduler } from './scheduler';

export type ConnectDeps = {
  /** 로그인한 사용자 id(없으면 null)를 알려준다. 구독 해제 함수를 돌려준다. */
  onAuthChange(fn: (userId: string | null) => void): () => void;
  onAppActive(fn: (active: boolean) => void): () => void;
  onLocalChange(fn: () => void): () => void;
  /** 이 사용자로 보내는 한 번(pushOnce)을 만든다. */
  makeRun(userId: string): () => Promise<void>;
  rememberUser(userId: string | null): Promise<void>;
  debounceMs?: number;
};

/**
 * 로그인해 있는 동안만 전송 스케줄러를 돌린다 (계정·백업 설계 ② 트리거).
 * 로그인 직후·앱이 앞으로 올 때 바로, 기록이 바뀌면 모아서 보낸다.
 */
export function connectSync(deps: ConnectDeps): () => void {
  let scheduler: ReturnType<typeof createSyncScheduler> | null = null;
  let current: string | null = null;

  const offAuth = deps.onAuthChange((userId) => {
    if (userId === current) return;
    scheduler?.stop();
    scheduler = null;
    current = userId;
    void deps.rememberUser(userId);
    if (!userId) return;
    scheduler = createSyncScheduler(deps.makeRun(userId), { debounceMs: deps.debounceMs });
    scheduler.foreground();
  });
  const offApp = deps.onAppActive((active) => { if (active) scheduler?.foreground(); });
  const offLocal = deps.onLocalChange(() => scheduler?.poke());

  return () => { offAuth(); offApp(); offLocal(); scheduler?.stop(); };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest __tests__/connect.test.ts` → PASS 3/3.

- [ ] **Step 5: 앱 클라이언트와 시작 연결**

Expo 57 문서에서 `expo-sqlite/localStorage/install`이 있는지 확인한다(Supabase의 Expo 가이드가 권하는 세션 저장소, 스펙 ② 세션). 없으면 `expo-sqlite`의 kv-store로 `getItem/setItem/removeItem` 어댑터를 만들어 넘기고 ledger에 Ruling.

`src/sync/supabaseClient.ts`:
```ts
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
```

`app/_layout.tsx`의 루트 컴포넌트에 effect를 추가한다(기존 구조·import 순서에 맞춘다):
```tsx
useEffect(() => {
  const supabase = getSupabase();
  if (!supabase) return;
  return connectSync({
    onAuthChange: (fn) => {
      void supabase.auth.getSession().then(({ data }) => fn(data.session?.user.id ?? null));
      const { data } = supabase.auth.onAuthStateChange((_event, session) => fn(session?.user.id ?? null));
      return () => data.subscription.unsubscribe();
    },
    onAppActive: (fn) => {
      const sub = AppState.addEventListener('change', (s) => fn(s === 'active'));
      return () => sub.remove();
    },
    onLocalChange: subscribeLocalChange,
    makeRun: (userId) => async () => {
      await pushOnce({
        server: new SupabaseSyncServer({ rpc: (fn, args) => supabase.rpc(fn, args) }),
        photos: new SupabasePhotoStore(supabase.storage.from('record-photos'), userId, expoPhotoIO),
        deviceId: await getDeviceId(),
      });
      await setSetting('lastSyncedAt', String(Date.now()));
    },
    rememberUser: (userId) => setSetting('accountUserId', userId),
  });
}, []);
```

- [ ] **Step 6: 개발용 동기화 화면**

`app/dev/sync.tsx` — `__DEV__`가 아니거나 `getSupabase()`가 null이면 `goBackOrHome()`으로 돌아간다. 기존 디자인 시스템(`RetroScreen` + `header={<ScreenHeader title="서버 동기화 (개발)" onBack={goBackOrHome}/>}`, `PixelPanel`, `PixelText`, `PixelButton`)과 `useDialog`·`saveOrNotify`·`createSingleFlight`를 쓴다. 상태는 화면에 들어올 때와 각 동작 뒤에 다시 읽는다.

| 표시·버튼 | 동작 |
| --- | --- |
| 계정 | `supabase.auth.getSession()`의 이메일. 없으면 "로그인 안 함" |
| 올릴 것 / 보류 | `pendingCount()` |
| 마지막 백업 | `getSetting('lastSyncedAt')`를 `longDate`·시각으로 |
| 서버 상태 | `new SupabaseSyncServer(...).state()` → "목표 n개" |
| [개발 계정으로 로그인] | `signInWithPassword({ email: process.env.EXPO_PUBLIC_DEV_EMAIL, password: process.env.EXPO_PUBLIC_DEV_PASSWORD })`. 두 값이 없으면 버튼 대신 "`.env.local`에 개발 계정을 넣어 주세요"를 보인다. 계정은 `npm run server:dev-user`로 만든다(클라우드는 가입 시 이메일 확인이 켜져 있어 앱에서 가입하지 않는다) |
| [전부 올리기 (첫 연결)] | `enqueueAll()` → `pushOnce(deps)` |
| [지금 올리기] | `pushOnce(deps)` |
| [서버에서 복원] | `confirm({ title: '서버 백업으로 바꿀까요?', description: '이 기기의 기록이 서버 백업으로 바뀌어요.', secondaryLabel: '취소', primaryLabel: '복원' })` → `restoreAll(server)` → `downloadRestoredPhotos(photos, result.photos)` |
| [로그아웃 (개발)] | `supabase.auth.signOut()`만. 기기 기록은 지우지 않는다 |

`deps`는 `_layout.tsx`의 `makeRun`과 같은 구성(`SupabaseSyncServer`, `SupabasePhotoStore`, `expoPhotoIO`, `getDeviceId()`). 실패는 `saveOrNotify(ask, '하지 못했어요', fn)`로 알린다.

`app/settings.tsx`에 추가:
```tsx
{__DEV__ && getSupabase() && (
  <PixelPanel title="개발">
    <SettingRow label="서버 동기화 (개발)" onPress={() => router.push('/dev/sync')} />
  </PixelPanel>
)}
```
타입 라우트 갱신: `CI=1 npx expo start --port 8093`을 잠깐 띄웠다가 끈다(`.expo/types`).

- [ ] **Step 7: 개발 계정, 환경 변수, 실행 문서**

`scripts/dev-user.mjs` (`package.json` scripts에 `"server:dev-user": "node scripts/dev-user.mjs"`):
```js
// 개발 프로젝트에 개발용 계정을 만든다(이미 있으면 그대로 둔다). .env.server.local의 service 키를 쓴다.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  ['.env.server.local', '.env.local'].flatMap((file) => {
    try { return readFileSync(file, 'utf8').split('\n'); } catch { return []; }
  }).filter((line) => line.includes('=') && !line.startsWith('#')).map((line) => {
    const i = line.indexOf('=');
    return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
  }),
);
const { SUPABASE_TEST_URL: url, SUPABASE_TEST_SERVICE_KEY: key, EXPO_PUBLIC_DEV_EMAIL: email, EXPO_PUBLIC_DEV_PASSWORD: password } = env;
if (!url || !key || !email || !password) {
  console.error('.env.server.local(주소·service 키)과 .env.local(EXPO_PUBLIC_DEV_EMAIL/PASSWORD)이 필요합니다.');
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error && !/already/i.test(error.message)) { console.error(error.message); process.exit(1); }
console.log(error ? `이미 있습니다: ${email}` : `만들었습니다: ${email}`);
```

`.env.example`(커밋, 실제 값은 넣지 않는다):
```
# 앱이 붙는 개발 서버 (Supabase 프로젝트 chagok-dev). .env.local에 복사해 채운다.
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon 키>
# 개발용 로그인 (__DEV__ 화면에서만 쓴다). npm run server:dev-user로 만든다.
EXPO_PUBLIC_DEV_EMAIL=dev@chagok.test
EXPO_PUBLIC_DEV_PASSWORD=<직접 정한 비밀번호>
```
`.env.local`을 같은 모양으로 만들고(커밋하지 않는다) `npm run server:dev-user`를 실행한다. Expected: `만들었습니다: dev@chagok.test`.

`docs/DEV-SETUP.md`에 「개발 서버 (백업·복원 개발)」 절을 추가한다: Supabase 프로젝트 `chagok-dev`(서울), `supabase login`·`supabase link`, `.env.server.local`(테스트용, service 키)과 `.env.local`(앱용, anon 키·개발 계정) 만들기, 서버 설정 올리기 `supabase db push`·`supabase functions deploy delete-account --use-api`, 서버 테스트 `npm run test:server`, 개발 계정 `npm run server:dev-user`, `npx expo start`(환경 변수를 바꾸면 다시 시작) → 앱 설정 → 개발 → 서버 동기화. 무료 프로젝트는 일주일 동안 안 쓰면 멈추므로 대시보드에서 다시 켠다. DB·사진은 대시보드의 Table Editor·Storage에서 본다.

- [ ] **Step 8: 전체 확인**

Run: `npm test && npm run test:components && npm run typecheck && npm run lint && npm run check:storybook`
Run: `npx expo export --platform ios --output-dir /tmp/check && rm -rf /tmp/check`
Run: `npm run test:server`
Expected: 모두 PASS, lint는 기존 경고 3개만.

- [ ] **Step 9: Commit**

```bash
git add src/sync/supabaseClient.ts src/sync/connect.ts __tests__/connect.test.ts app .env.example scripts/dev-user.mjs package.json docs/DEV-SETUP.md
git commit -m "feat(sync): connect the app to the backup server with a dev-only sign-in"
```

- [ ] **Step 10: 기기 확인 (사용자)**

사용자에게 요청한다. Expo Go에서:
1. 개발 계정 로그인 → 전부 올리기 → Supabase 대시보드 Table Editor의 goals 표에 행이 보이는지
2. 사진 있는 기록이 대시보드 Storage의 `record-photos` 버킷에 올라가는지
3. 스티커를 붙이고 2초쯤 뒤 자동으로 올라가는지(올릴 것 0)
4. 와이파이를 끄고 기록 → 켜고 앱을 앞으로 → 올라가는지
5. 앱을 지우고 다시 설치 → 로그인 → 서버에서 복원 → 사진까지 돌아오는지

---

### Task 9: 문서 — 서버 위치·운영 결정 보류·이식성

**Files:**
- Modify: `docs/superpowers/specs/2026-09-30-account-backup-design.md`, `docs/HANDOFF.md`, `docs/PRD.md`

- [ ] **Step 1: 스펙 ③ 「위치」 갱신**

「위치」 문단을 다음으로 바꾼다:
```
**위치** — 이 저장소의 `supabase/`(마이그레이션 SQL, Edge Functions, `config.toml`). 개발은 Supabase 클라우드 무료 프로젝트 `chagok-dev`(서울 리전)다(2026-09-30 — 맥을 켜 두지 않아도 되고 Docker가 필요 없다). 테스트 데이터만 둔다.
**운영 서버는 출시 전에 정한다.** 1순위는 Supabase 클라우드 서울 리전의 별도 프로젝트(같은 마이그레이션·함수를 올린다)다. 무료 요금제로 시작하면 자동 백업이 없으므로 **매일 DB를 내보내는 작업을 출시 전에 만든다**; 사진이 1GB에 가까워지면 Pro로 올리거나 사진만 다른 저장소로 옮긴다.
대안은 VPS 셀프 호스팅(Hostinger KVM 4, 말레이시아)이다 — 비용은 없지만 방화벽·HTTPS·매일 백업·복구 시험을 직접 맡고, 처리방침에 국외 이전을 적는다.

**이식성 원칙** — 동기화 규칙은 SQL 함수에만 둔다. 앱은 `SyncServer`·`PhotoStore` 인터페이스로만 서버를 안다.
Supabase 전용 기능은 Auth·Storage·Edge Functions까지만 쓴다. 비용·운영 문제로 옮길 때 DB는 `pg_dump`, 사진은 S3 호환 저장소 복사,
앱은 두 인터페이스 구현만 바꾼다.
```
「개발 환경과 선행 조건」의 첫 항목 뒤에 추가: `서버·동기화 코어는 개발용 이메일 로그인으로 Expo Go에서 확인한다(2026-09-30). 개발 빌드는 Apple·Google 로그인과 위젯부터 필요하다.`
「Edge Functions」의 `delete-account` 설명 끝에 추가: `Apple 토큰 폐기 단계는 apple-link와 함께 구현한다. 그전에는 토큰이 있으면 삭제를 멈춘다.`

- [ ] **Step 2: HANDOFF 갱신**

9절 「준비물이 필요한 것」의 서버 줄을 "완료(개발 프로젝트 `chagok-dev`, `feat/server-local`)"로 바꾸고, Docker Desktop을 준비물에서 빼고, 남은 것으로 "운영 서버 결정(VPS/클라우드)", "Apple 토큰 폐기(apple-link와 함께)", "계정 화면·실제 로그아웃·삭제 흐름 연결"을 적는다. 8절 표에 `/dev/sync`(개발 전용) 줄을 더한다. 6절(실행과 검증)에 `npm run test:server`를 더한다.

- [ ] **Step 3: PRD 「남은 후속 결정」**

한 줄 추가: `2026-09-30 새로 기록한 항목: 운영 서버(Supabase 클라우드 서울 별도 프로젝트 1순위 / VPS 셀프 호스팅). 출시 전에 정하며 개발은 Supabase 클라우드 무료 프로젝트다. 무료로 운영하면 매일 DB 백업 작업이 필수다.`

- [ ] **Step 4: Commit**

```bash
git add docs
git commit -m "docs: dev backup server on Supabase, production hosting left open, portability rules"
```

---

## 실행 뒤 사용자에게 남는 일

- 시작 전: Supabase 가입·프로젝트 `chagok-dev` 만들기, `supabase login`·`supabase link` 실행, 키 3개 전달.
- 기기 확인(Task 8 Step 10).
- 운영 서버 결정 → 약관 「클라우드 사업자」 채우기 → 약관 공식 게시.
