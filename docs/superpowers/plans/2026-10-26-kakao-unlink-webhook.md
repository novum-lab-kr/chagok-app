# 카카오 연결 해제 웹훅 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**목표:** 사용자가 카카오톡에서 차곡차곡과의 연결을 끊거나 카카오계정을 탈퇴하면, 카카오가 보내는 알림을 받아 그 사람의 차곡차곡 계정과 백업을 지운다. 앱을 쓸 수 없는 카카오 사용자에게 앱 밖 삭제 경로가 생긴다.

**구조:** 새 Edge Function `kakao-unlink`가 카카오 「연결 해제 웹훅」을 받는다. 요청 확인(어드민 키, 앱 ID, 사유)은 import 없는 순수 함수로 떼어 jest로 시험한다. 지우는 순서는 지금 `delete-account`의 단계(Apple 토큰 폐기, 사진, 데이터 행, 인증 계정)를 공용 함수로 떼어 두 함수가 같이 쓴다. 회원번호로 사용자를 찾는 일은 service_role 전용 RPC가 한다.

**기술:** Supabase Edge Function(Deno 2), `npm:@supabase/supabase-js@2`, Postgres `security definer` 함수, jest + ts-jest.

**근거:** 2026-10-25 조사(대화). 카카오 문서 https://developers.kakao.com/docs/ko/kakaologin/callback , https://developers.kakao.com/docs/ko/kakaologin/common , 운영정책 제1조 제2항(https://developers.kakao.com/terms/ko/site-policies), Google Play 계정 삭제 요구(https://support.google.com/googleplay/android-developer/answer/13327111). 상위 계획 `docs/superpowers/plans/2026-10-15-social-login.md` 4단계 「알림 받기」의 결정(카카오는 지운다)을 여기서 정한다.

## 지킬 것

- 웹훅은 3초 안에 200을 준다. 확인을 통과한 요청은 사용자가 없거나 삭제가 실패해도 200이다. 실제 삭제는 응답 뒤 `EdgeRuntime.waitUntil()`로 한다.
- 진짜 카카오 요청인지는 `Authorization: KakaoAK <대표 어드민 키>`와 `app_id`(`1618098`) 두 가지로 본다. 틀리면 401이고 아무것도 하지 않는다. 키 비교는 길이와 상관없이 끝까지 도는 비교로 한다.
- `referrer_type`이 `INCOMPLETE_SIGN_UP`이면 지우지 않고 로그만 남긴다. 2026-10-26 개발 카카오 계정이 첫 로그인 뒤 3일 넘게 끊기지 않아 우리 방식은 가입 완료로 보이지만, 문서 보장이 없어 안전장치로 둔다. 그 밖의 값(`ACCOUNT_DELETE`, `FORCED_ACCOUNT_DELETE`, `UNLINK_FROM_ADMIN`, `UNLINK_FROM_APPS`, 모르는 새 값)은 지운다.
- 카카오는 이 웹훅을 다시 보내 주지 않는다. 삭제가 실패하면 `console.error`에 회원번호와 실패 단계를 남긴다. 처리는 멱등이라 같은 요청을 다시 보내면 남은 단계부터 이어진다.
- 웹훅 쪽에서는 카카오 연결 끊기를 부르지 않는다(이미 끊겼다). Apple 토큰이 남아 있으면 `delete-account`와 같이 폐기한다.
- 응답과 로그에 어드민 키와 개인정보를 남기지 않는다. 로그에는 회원번호, 사유, 단계만.
- 앱 코드는 Task 5의 한 군데(카카오 가입 완료 알리기)만 바꾼다.
- 출시 전 규칙: 마이그레이션은 새 파일을 더하지 않고 `20260930000004_account_admin.sql`을 고친다. 개발 서버에는 `db reset` 대신 새 함수 정의만 `supabase db query --linked`로 넣는다. 최종 구조는 같고, 손 시험에 쓸 카카오 계정과 데이터를 남기기 위해서다.
- 약관과 처리방침은 1판만 고친다(`v2/` 없음). 가운뎃점 금지. 커밋은 사용자가 직접 확인한 뒤.

## 살필 점

1. **카카오 콘솔 테스트 도구가 모르는 회원번호를 보냄** → 200, 아무것도 지우지 않고 「사용자 없음」 로그.
2. **같은 알림이 두 번 옴, 또는 앱 안 삭제 직후 알림** → 두 번째는 사용자를 못 찾아 200으로 끝난다.
3. **POST 본문이 form이 아니거나 비어 있음** → 쿼리스트링도 함께 읽는다. 회원번호가 없으면 400(키 확인을 통과한 경우만).
4. **운영 서버(셀프호스팅)가 함수 앞에서 JWT를 요구함** → 카카오 요청은 Supabase 토큰이 없어 막힌다. 운영 `FUNCTIONS_VERIFY_JWT`와 Kong 라우트를 배포 때 확인한다(Task 6 출시 점검).
5. **카카오 앱 하나에 웹훅 주소는 하나** → 개발과 운영이 같은 카카오 앱을 쓴다. 지금은 개발 주소로 시험하고, 출시 전에 운영 주소로 바꾼다(출시 점검).

---

### Task 1: 웹훅 요청 확인 (순수 함수)

**Files:**
- Create: `supabase/functions/_shared/kakaoUnlink.ts`
- Test: `__tests__/kakaoUnlink.test.ts`

**Interfaces:**
- Produces:
  - `export const KAKAO_APP_ID = '1618098'`
  - `export type UnlinkDecision = { kind: 'reject' } | { kind: 'bad_request' } | { kind: 'ignore'; kakaoId: string; referrer: string } | { kind: 'delete'; kakaoId: string; referrer: string }`
  - `export function decideUnlink(input: { authorization: string | null; params: URLSearchParams }, adminKey: string): UnlinkDecision`
  - `export function sameSecret(a: string, b: string): boolean`

`kakao.ts`처럼 import 없이 쓴다(Deno와 jest 둘 다에서 돈다). `params`는 함수가 쿼리스트링과 form 본문을 합쳐서 넘긴다.

- [ ] **Step 1: 실패하는 테스트**

```ts
import { decideUnlink, sameSecret } from '../supabase/functions/_shared/kakaoUnlink';
const p = (o: Record<string, string>) => new URLSearchParams(o);
const ok = { app_id: '1618098', user_id: '4501234567', referrer_type: 'UNLINK_FROM_APPS' };

it('어드민 키와 앱 ID가 맞으면 회원번호를 지운다', () => {
  expect(decideUnlink({ authorization: 'KakaoAK key', params: p(ok) }, 'key'))
    .toEqual({ kind: 'delete', kakaoId: '4501234567', referrer: 'UNLINK_FROM_APPS' });
});
it.each(['ACCOUNT_DELETE', 'FORCED_ACCOUNT_DELETE', 'UNLINK_FROM_ADMIN', 'SOMETHING_NEW'])('%s도 지운다', (r) => {
  expect(decideUnlink({ authorization: 'KakaoAK key', params: p({ ...ok, referrer_type: r }) }, 'key').kind).toBe('delete');
});
it('가입 미완료는 지우지 않는다', () => {
  expect(decideUnlink({ authorization: 'KakaoAK key', params: p({ ...ok, referrer_type: 'INCOMPLETE_SIGN_UP' }) }, 'key').kind).toBe('ignore');
});
it.each([null, '', 'KakaoAK wrong', 'Bearer key', 'key'])('키가 틀리면(%s) 거부한다', (a) => {
  expect(decideUnlink({ authorization: a, params: p(ok) }, 'key')).toEqual({ kind: 'reject' });
});
it('다른 앱의 알림은 거부한다', () => {
  expect(decideUnlink({ authorization: 'KakaoAK key', params: p({ ...ok, app_id: '999' }) }, 'key')).toEqual({ kind: 'reject' });
});
it('서버에 어드민 키가 없으면 모두 거부한다', () => {
  expect(decideUnlink({ authorization: 'KakaoAK ', params: p(ok) }, '')).toEqual({ kind: 'reject' });
});
it('회원번호가 없거나 숫자가 아니면 잘못된 요청', () => {
  expect(decideUnlink({ authorization: 'KakaoAK key', params: p({ ...ok, user_id: '' }) }, 'key')).toEqual({ kind: 'bad_request' });
  expect(decideUnlink({ authorization: 'KakaoAK key', params: p({ ...ok, user_id: '12a' }) }, 'key')).toEqual({ kind: 'bad_request' });
});
it('sameSecret은 길이가 달라도 false, 빈 값은 false', () => {
  expect(sameSecret('abc', 'abc')).toBe(true);
  expect(sameSecret('abc', 'abcd')).toBe(false);
  expect(sameSecret('', '')).toBe(false);
});
```

- [ ] **Step 2: 실패 확인** — `npx jest __tests__/kakaoUnlink.test.ts` → 모듈 없음으로 FAIL.
- [ ] **Step 3: 구현** — 키 확인을 먼저 하고(틀리면 다른 값을 보지 않고 reject), 그다음 `app_id`, `user_id`(`/^\d+$/`), `referrer_type` 순. `sameSecret`은 긴 쪽 길이만큼 돌며 문자 코드 XOR을 모으고 길이 차이도 합친다. 빈 값은 항상 false.
- [ ] **Step 4: 통과 확인** — 같은 명령 PASS, `npm test` 전체 PASS.

### Task 2: 회원번호로 사용자 찾기 RPC

**Files:**
- Modify: `supabase/migrations/20260930000004_account_admin.sql`
- Test: `__tests__/server/security.test.ts`

**Interfaces:**
- Produces: `public.admin_find_user_by_identity(p_provider text, p_provider_id text) returns uuid` — `auth.identities`에서 `provider = p_provider and provider_id = p_provider_id`인 `user_id`, 없으면 null. `language sql stable security definer set search_path = ''`. 파일 끝의 revoke(`public, anon, authenticated`)와 grant(`service_role`) 목록에 더한다.

2026-10-26 확인: 개발 서버 카카오 identity의 `provider_id`, `identity_data.sub`, 카카오 `/v1/user/ids`의 회원번호가 모두 같은 값이다.

- [ ] **Step 1: 실패하는 테스트** — `security.test.ts`의 기존 admin 함수 권한 검사와 같은 모양으로, anon과 로그인 사용자가 `admin_find_user_by_identity`를 부르면 오류가 나는지 더한다.
- [ ] **Step 2: 마이그레이션 파일 고치기**
- [ ] **Step 3: 개발 서버에 반영** — 함수 정의와 revoke, grant 문만 `supabase db query --linked`로 실행(`SUPABASE_ACCESS_TOKEN`은 `.secrets/supabase-token`).
- [ ] **Step 4: 확인** — `npm run test:server -- security` PASS. 손으로 `select public.admin_find_user_by_identity('kakao', '<개발 카카오 회원번호>')`가 개발 카카오 사용자 uid를 돌려주는지 본다(읽기만).

### Task 3: 지우는 순서를 공용 함수로 떼기

**Files:**
- Create: `supabase/functions/_shared/deleteUser.ts`
- Modify: `supabase/functions/delete-account/index.ts`
- Test: `__tests__/server/deleteAccount.test.ts`(기존, 바뀌지 않아야 함)

**Interfaces:**
- Produces: `export async function deleteUserData(admin: SupabaseClient, uid: string, opts: { unlinkKakao: boolean }): Promise<{ ok: true } | { error: string; step: 'apple' | 'kakao' | 'photos' | 'rows' | 'auth' }>`

지금 `delete-account/index.ts`의 1~4단계를 그대로 옮긴다. 카카오 연결 끊기 블록만 `opts.unlinkKakao`가 참일 때 돈다. 로그 접두어는 `delete-user:`로 바꾼다. `delete-account`는 `userIdFrom` 확인 → `deleteUserData(admin, uid, { unlinkKakao: true })` → 지금과 같은 응답(성공 200 `{ok:true}`, 실패 500 `{error, step}`).

- [ ] **Step 1: 옮기기** — 동작과 오류 응답 모양(`revoke_failed`, `unlink_failed`, 단계 이름)을 바꾸지 않는다.
- [ ] **Step 2: 개발 서버 배포** — `supabase functions deploy delete-account --use-api`
- [ ] **Step 3: 확인** — `npm run test:server -- deleteAccount` 기존 테스트 모두 PASS(전부 삭제, 두 번 호출, Apple 토큰 폐기, 로그인 없이 거부, 위조 토큰 401).

### Task 4: `kakao-unlink` 함수

**Files:**
- Create: `supabase/functions/kakao-unlink/index.ts`
- Modify: `supabase/config.toml`(`[functions.kakao-unlink]` `verify_jwt = false`. 카카오 요청에는 Supabase 토큰이 없다)
- Test: `__tests__/server/kakaoUnlink.test.ts`

**Interfaces:**
- Consumes: Task 1 `decideUnlink`, Task 2 RPC, Task 3 `deleteUserData`.

흐름: 쿼리스트링과(POST이고 본문이 있으면) form 본문을 합친 `URLSearchParams` → `decideUnlink(…, Deno.env.get('KAKAO_ADMIN_KEY') ?? '')`.
- `reject` → 401 `{error:'unauthorized'}`
- `bad_request` → 400
- `ignore` → `console.log('kakao-unlink: ignored', referrer, kakaoId)` 뒤 200
- `delete` → 200을 바로 돌려주고 `EdgeRuntime.waitUntil()` 안에서 RPC로 uid를 찾는다. 없으면 `console.log('kakao-unlink: no user', kakaoId)`. 있으면 `deleteUserData(admin, uid, { unlinkKakao: false })`. 실패하면 `console.error('kakao-unlink: failed', kakaoId, step)`, 성공하면 `console.log('kakao-unlink: deleted', referrer, kakaoId)`.

서버 테스트는 `.secrets/server-test.env`에 `KAKAO_ADMIN_KEY`가 있을 때만 키가 맞는 경우를 돈다(없으면 그 `it`만 건너뜀). 테스트에서 진짜 카카오 identity를 만들 수 없으므로 실제 삭제는 Task 7의 손 시험으로 본다.

- [ ] **Step 1: 실패하는 서버 테스트**
  - 키 없이 POST → 401
  - 틀린 키 → 401
  - 맞는 키, `INCOMPLETE_SIGN_UP` → 200
  - 맞는 키, 없는 회원번호(`'1'`), `UNLINK_FROM_APPS` → 200. 미리 만든 이메일 테스트 사용자가 그대로 있는지 확인
  - 맞는 키, GET 쿼리스트링 형식 → 200
- [ ] **Step 2: 구현과 배포** — `supabase functions deploy kakao-unlink --use-api`. 개발 서버 함수 secret `KAKAO_ADMIN_KEY`는 이미 있다.
- [ ] **Step 3: 확인** — `npm run test:server -- kakaoUnlink` PASS. 함수 로그에 `no user`, `ignored`가 찍히고 키 값이 없는지 본다.

### Task 5: 카카오 가입 완료 알리기 (앱)

**Files:**
- Modify: `src/sync/signIn/expoKakao.ts`
- Modify: `app/account/connect.tsx`

**Interfaces:**
- Produces: `export async function completeKakaoSignUp(): Promise<void>` in `expoKakao.ts`. `@react-native-kakao/user`의 `me()`를 한 번 부르고 결과는 버린다. 실패는 삼킨다(개발 빌드에서만 `console.warn('[kakao] me failed', e)`).

근거: 카카오 문서는 자동 연결 앱에서 「첫 로그인 뒤 24시간 안에 사용자 정보 조회를 부르지 않은 사용자」를 가입 미완료로 보고 연결을 끊는다(`INCOMPLETE_SIGN_UP`). ID 토큰만 받는 지금 흐름은 실제로 끊기지 않았지만(2026-10-26, 3일 넘게) 문서 보장이 없다. 2026-10-26 사용자 결정: 동의 직후 한 번 부른다.

- [ ] **Step 1:** `completeKakaoSignUp` 추가. `ensureInitialized()` 뒤 `await me()`.
- [ ] **Step 2:** `connect.tsx`에서 카카오 로그인이 성공한 직후(`const { user } = signIn;` 다음) `if (method === 'kakao') void completeKakaoSignUp();`. 기다리지 않는다. 로그인할 때마다 불러, 한 번 실패해도(중단, 네트워크) 다음 로그인에서 메운다(2026-10-26 최종 검토 뒤 동의 직후에서 옮김).
- [ ] **Step 3: 확인** — `npm run typecheck`, `npm run lint`, `npm test`, 번들(`npx expo export --platform ios`). 동작은 Task 7 끝에서 끝까지 시험의 「다시 카카오로 로그인」에서 Metro 로그에 `[kakao] me failed`가 없는지로 본다.

### Task 6: 문서와 정책

**Files:**
- Modify (앱 저장소): `docs/DEV-SETUP.md`(배포 명령 한 줄, 실패 로그를 보고 다시 보내는 법), `docs/RELEASE-CHECKLIST.md`, `docs/PRD.md` 계정 삭제 항목(카카오에서 끊으면 지운다), `docs/HANDOFF.md`, `docs/superpowers/plans/2026-10-15-social-login.md` 4단계와 「남은 열린 결정」(카카오는 지운다로 정함. Apple 서버 알림은 그대로 남김)
- Modify (정책 저장소 `chagok-app-policy`, 새 worktree와 브랜치): `delete-account/index.html`, `privacy/v1/index.html` 5.1(파기)

정책 문구 초안(사용자 확인을 받는다):
- 계정 삭제 안내에 「카카오로 로그인했다면」 칸: 카카오톡 > 더보기 > 프로필 관리 > 카카오계정 > 연결된 서비스 관리 > 차곡차곡 > 연결 끊기. 「연결을 끊으면 차곡차곡 계정과 서버에 백업된 기록이 지체 없이 삭제됩니다. 카카오계정을 탈퇴해도 같습니다.」 메뉴 이름은 Task 7에서 실제 화면을 보고 맞춘다.
- 메일 요청 칸: 「로그인에 쓴 수단(Apple, Google 또는 카카오)과, Apple이나 Google이면 그 계정의 이메일 주소. 카카오는 이메일을 받지 않아 메일로는 계정을 찾을 수 없으니 위 방법으로 연결을 끊어 주세요.」
- 처리방침 5.1에 한 문장: 「카카오에서 차곡차곡과의 연결을 끊거나 카카오계정을 탈퇴하면, 카카오가 알려 주는 카카오 회원번호로 계정을 찾아 같은 방법으로 파기합니다.」 새로 수집하는 항목은 없다(회원번호는 이미 2절에 있다).

출시 점검 목록에 더할 것:
- 운영 서버 `volumes/functions/`에 `kakao-unlink`와 바뀐 `_shared`, `delete-account` 복사. 운영 함수 환경에 `KAKAO_ADMIN_KEY`
- 운영 DB에 `admin_find_user_by_identity` 반영
- 운영에서 토큰 없는 `/functions/v1/kakao-unlink` 요청이 함수까지 닿는지(`FUNCTIONS_VERIFY_JWT`, Kong 라우트, Caddy 경로). 틀린 키로 보내 401 본문이 함수 응답(`{"error":"unauthorized"}`)인지로 확인
- 카카오 콘솔 연결 해제 웹훅 주소를 운영 주소(`https://chagok-api.novum-lab.com/functions/v1/kakao-unlink`)로 바꾸고 테스트 도구로 200 확인

- [ ] **Step 1:** 앱 저장소 문서 고치기, 가운뎃점 검사
- [ ] **Step 2:** 정책 저장소 worktree에서 두 페이지 고치기, 로컬로 열어 보기

### Task 7: 시험

**자동(에이전트)**
- [ ] `npm test`, `npm run test:components`, `npm run typecheck`, `npm run lint` 모두 통과
- [ ] `npm run test:server` 전체 통과(기존 삭제 테스트 포함)
- [ ] `security` 에이전트에 바뀐 파일 목록을 넘겨 본다: 키 노출, 키 없이 삭제를 일으킬 수 있는지, RPC 권한, 로그의 개인정보, 키 비교 방식

**카카오 콘솔**
- [x] [앱] > [웹훅] > [연결 해제 웹훅]에 개발 주소 `https://cmkmhrzvxbtuxbgixqoo.supabase.co/functions/v1/kakao-unlink`, 메서드 POST, [사용함] (2026-10-26 등록. POST는 회원번호가 주소 로그에 남지 않아서 골랐다)
- [x] 함수 secret `KAKAO_ADMIN_KEY`, `.secrets/kakao.env`, 콘솔의 대표 어드민 키(어드민 키는 이것 하나)가 같은 값인지 SHA-256 앞부분으로 확인 (2026-10-26)
- [ ] 함수 배포 뒤 [도구] > [웹훅 테스트] > [연결 해제]로 보내기 → 콘솔에 200, 함수 로그에 `no user` 또는 `ignored`

**끝에서 끝까지(시뮬레이터 + 사용자 휴대폰 카카오톡)**
- [ ] 시뮬레이터 앱에서 개발 카카오 계정으로 로그인, 목표 1개, 스티커, 메모, 사진 1장을 만들고 백업
- [ ] 에이전트가 기록: 그 사용자의 uid, `goals` 행 수, 사진 파일 수, 카카오 `/v1/user/ids`에 회원번호가 있는지
- [ ] 처음 로그인 때 동의 직후 Metro 로그에 `[kakao] me failed`가 없는지
- [ ] 사용자가 휴대폰 카카오톡에서 연결 끊기(실제 메뉴 이름과 순서를 알려 주면 안내 문구를 맞춘다)
- [ ] 에이전트가 확인: 함수 로그 `deleted UNLINK_FROM_APPS`, 인증 계정 없음, 행 0, 사진 0, `/v1/user/ids`에서 빠짐
- [ ] 앱은 관찰만: 서버 계정이 사라진 뒤 앱이 어떻게 되는지(다음 백업, 앱 재시작). 고칠 것이 보이면 범위 밖으로 따로 보고한다
- [ ] 다시 카카오로 로그인 → 새 계정으로 동의 시트가 뜨고, 복원할 백업이 없는지
- [ ] 회귀: 앱 안 계정 삭제(카카오 계정)가 그대로 되고, 함수 로그에 `kakao-unlink` 알림이 오지 않는지

**끝나면**
- [ ] 카카오 콘솔 웹훅은 개발 주소로 [사용함] 상태로 둔다. 1개월 넘게 응답이 없거나 오류가 잦으면 꺼지므로, 개발 서버를 멈추면 다시 켜야 한다고 HANDOFF에 적는다
- [ ] 사용자가 확인한 뒤 커밋: 앱 저장소(계획, 서버 코드와 테스트, 문서)와 정책 저장소를 따로
