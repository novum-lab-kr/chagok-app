# 함께 목표 개발 설계

2026-11-04. [함께 목표 설계](2026-11-04-friends-goal-design.md)(무엇을)와 [PRD](../../PRD.md) 4.15(동작)를 코드로 옮기는 방법이다. 지금 코드 구조는 `release/1.0.1`(cea54e4) 기준으로 조사했다. **사용자 확인 전 초안.**

## 0. 지금 코드에서 알아 둘 것

- **서버에서 받아 오는 길이 없다.** 앱은 바뀐 것을 `outbox` → RPC `push_changes`로 올리기만 하고, 받아 오기는 계정을 연결할 때 `pull_changes`로 한 번 통째로 바꾸는 것뿐이다(`src/sync/restore.ts`). `syncCursor`는 저장만 하고 읽지 않는다. 친구 판은 새 읽기 길이 필요하다.
- **「한 번에 한 기기」는 PRD에만 있다**(PRD 4.8). 서버도 앱도 막지 않는다. 함께 목표와 상관없지만, 한 판 칸 겹침은 사람 사이 문제라 서버 제약으로 따로 막는다.
- **인증은 훅이 없다.** 화면마다 `getSupabase()`의 세션을 읽는다. 함께 목표 화면도 같은 방식으로 읽되, 로그인 확인을 한 함수(`requireSession`)로 묶는다.
- **딥링크는 `chagok://`만 있다.** 연결 도메인과 앱 링크 설정이 없다.
- **1.0.0이 나갔다.** 로컬 DB는 `src/db/schema.ts` `MIGRATIONS` 끝에 v3을 더한다(이미 나간 판은 고치지 않는다). 서버도 새 마이그레이션 파일을 더한다.

## 1. 데이터가 사는 곳

| 방식 | 내 칸 | 친구 칸 | 연결 없이 |
| --- | --- | --- | --- |
| 각자 판 | 지금처럼 로컬 `goals`, `stickers` → outbox → 서버 | 서버에서 읽기만(새 RPC), 화면 메모리에만 | 붙이기 됨 |
| 한 판 | 서버가 주인(`shared_cells`). 로컬은 마지막으로 받은 것을 보여 주기만 | 같음 | 붙이기 안 됨 |
| 보여주기 | 내 목표 그대로 | 보는 사람은 서버에서 읽기만 | 보여주는 쪽은 됨 |

각자 판을 로컬 목표로 두는 이유: 위젯, 워치, 오프라인 붙이기, 완성, 기록이 지금 코드 그대로 돈다.

## 2. 로컬 DB (v3)

```sql
create table goal_shares (
  goal_id text primary key references goals(id) on delete cascade,
  shared_goal_id text not null,
  mode text not null check (mode in ('each','one','show','viewing')), -- viewing: 보여주기를 받은 쪽
  role text not null check (role in ('owner','member','viewer')),
  member_count integer not null default 1,
  my_name text,
  updated_at integer not null
);
```

- 서버에서 받아 와 채우는 캐시다. outbox에 넣지 않는다(주인은 서버).
- 목표 탭 카드의 「n명이 함께」, 위젯의 「n명」, 판 화면의 방식 분기가 이 표를 읽는다.
- 한 판 목표와 받은 보여주기 목표도 `goals` 행을 하나 만든다(목록, 순서, 위젯을 그대로 쓰려고). 이 행은 outbox에 넣지 않게 `goalRepository`에 `localOnly` 표시를 둔다.
- `src/domain/types.ts` `Goal`에 `share?: GoalShare`를 더한다(목록 조회에서 왼쪽 조인).

## 3. 서버

새 파일 `supabase/migrations/20261104000001_shared_goals.sql`. 지금 방식 그대로: 표는 RLS 켜고 SELECT만, 쓰기는 모두 `security definer set search_path = ''` RPC가 `private.require_user()`를 부른다.

**표**

| 표 | 핵심 열 | 제약 |
| --- | --- | --- |
| `shared_goals` | id, mode, name, board_type, total_slots, end_date, owner_id, max_members(기본 6), created_at, deleted_at | |
| `shared_goal_members` | shared_goal_id, user_id, display_name, sticker_id, role, goal_id(그 사람의 로컬 목표 id), joined_at, left_at | (shared_goal_id, sticker_id) 유일(나가지 않은 사람 중) |
| `shared_goal_invites` | code(8자, 헷갈리는 글자 뺌), shared_goal_id, created_at, revoked_at | code 유일 |
| `shared_cells` | shared_goal_id, slot_index 또는 date_key, user_id, sticker_id, placed_at | 적립판 (goal, slot) 유일. 달력판 (goal, date_key, user) 유일 + 같은 날 2장 상한(트리거) |
| `user_blocks` | blocker_id, blocked_id, created_at | (blocker, blocked) 유일 |
| `shared_goal_reports` | id, shared_goal_id, reporter_id, target_user_id, reason, created_at, handled_at | |
| `banned_words` | word | 목록은 비워 둔다(심사 전에 채움) |
| `member_defaults` | user_id, display_name, sticker_id | 다음 함께 목표에 채워 줄 값 |

- `stickers`(지금 표)에 `visibility text not null default 'self'`를 더한다. 각자 판 목표의 칸은 `members`로 올린다. 기록(`records`)은 그대로 나만.
- **차단 거르기:** 모든 읽기 RPC가 `private.blocked_between(a, b)`로 양쪽 방향을 거른다.

**RPC**

| RPC | 하는 일 |
| --- | --- |
| `create_shared_goal(mode, name, board_type, total_slots, end_date, display_name, sticker_id, goal_id)` | 목표, 만든 사람 멤버, 초대 코드. 이름 금칙어 검사 |
| `preview_invite(code)` | 로그인 전에도 부를 수 있다(anon): 목표 이름, 판 종류, 칸 수, 만든 사람 이름, 인원, 들어갈 수 있는지(가득, 지움, 바뀜). 차단 여부는 로그인 뒤 `join`에서만 |
| `join_shared_goal(code, display_name, sticker_id, goal_id)` | 자리, 스티커 겹침, 차단(만든 사람과), 금칙어 검사 뒤 멤버 추가. 실패 이유는 「들어갈 수 없어요」 하나로 돌려준다(차단을 드러내지 않음) |
| `my_shared_goals()` | 내가 속한 함께 목표와 인원, 내 역할. 앱 시작, 목표 탭 열 때 `goal_shares` 갱신 |
| `shared_board(shared_goal_id, around)` | 각자 판: 멤버마다 이름, 스티커, 붙은 칸 번호(또는 날짜). 한 판: 칸 전체 |
| `place_shared_cell` / `remove_shared_cell` | 한 판 붙이기와 떼기. 겹치면 `slot_taken` |
| `update_member(shared_goal_id, display_name, sticker_id)` | 내 이름과 스티커 |
| `update_shared_goal(...)` | 만든 사람만: 이름, 칸 수, 종료일 |
| `rotate_invite(shared_goal_id)` | 만든 사람만: 새 코드, 옛 코드 끔 |
| `leave_shared_goal` / `kick_member` | 나가기, 내보내기 |
| `block_user(user_id)` / `unblock_user(user_id)` / `my_blocks()` | 차단. 만든 사람이 차단하면 내보내기도 같이 |
| `report(shared_goal_id, target_user_id, reason)` | 저장 + 알림(아래) |

**신고 알림:** Edge Function `report-notify`를 DB 웹훅(insert)으로 불러 `SUPPORT_EMAIL`(`chagok.app.help@gmail.com`)로 메일을 보낸다. 새 서비스 없이 그 Gmail 계정의 SMTP와 「앱 비밀번호」를 쓴다(2026-11-04 사용자 결정). 앱 비밀번호는 2단계 인증이 켜진 계정에서 사용자가 만들어 서버 비밀값으로 넣는다(외부 설정이라 뒤로). 메일이 실패해도 신고는 표에 남는다.

**읽기 권한:** 친구 칸은 `stickers` RLS(내 것만)를 바꾸지 않고, `shared_board` RPC가 멤버 확인 뒤 `visibility = 'members'`인 칸만 돌려준다. 보여주기도 같은 RPC(viewer 역할).

## 4. 앱 동기화

- **내 칸:** 지금 outbox 그대로. `stickers` 행에 `visibility`를 더해 함께 목표 칸은 `members`로 올린다(`push.ts`의 행 모양과 `push_changes`가 이 열을 받게).
- **함께 목표 목록:** `src/sync/sharedGoals.ts` `refreshSharedGoals()` → `my_shared_goals` → `goal_shares` 갱신, 없는 목표(나간, 내보내진, 지운)는 표시 정리. 앱 시작, 포그라운드, 목표 탭 포커스 때.
- **친구 판:** `src/app-data/useSharedBoard.ts` 훅이 판 화면 포커스, 당겨서 새로고침, 30초마다(화면이 보일 때만) `shared_board`를 부른다. 메모리에만 둔다. 실패하면 마지막 값 + 작은 안내.
- **한 판:** 같은 훅 + 붙이기는 RPC 성공 뒤에만 화면 반영. 연결이 없으면 「연결되면 붙일 수 있어요」.
- 실시간 구독(Supabase Realtime)은 처음에는 쓰지 않는다. 30초 새로고침으로 충분한지 써 보고 정한다.

## 5. 초대 링크

- `app.json`: iOS `associatedDomains: ["applinks:chagok.novum-lab.com"]`, Android `intentFilters`(autoVerify, `https://chagok.novum-lab.com/invite/*`).
- 라우트 `app/invite/[code].tsx`. Expo Router가 `https://…/invite/<코드>`와 `chagok://invite/<코드>`를 같은 파일로 연다.
- 흐름: `preview_invite` → 로그인 전이면 「은주님이 함께하자고 했어요」 + 로그인(지금 `account/connect` 재사용, 끝나면 돌아옴) → 함께하기 화면 → `join_shared_goal` → 판.
- novum-web: `/.well-known/apple-app-site-association`, `/.well-known/assetlinks.json`, `/invite/[code]` 페이지([앱에서 열기], 스토어 버튼, 「설치한 뒤 이 링크를 다시 눌러 주세요」). 앱과 따로 배포.
- 설치 뒤 코드 이어 주기(지연 딥링크)는 넣지 않는다. 웹 페이지 안내(「설치한 뒤 이 링크를 다시 눌러 주세요」)로 받친다(2026-11-04 사용자 결정. 외부 서비스는 SDK와 처리방침 추가가 따라오고, iOS에는 공식 방법이 없다).

## 6. 화면과 라우트

| 화면 | 라우트 | 디자인 시스템 |
| --- | --- | --- |
| + 시트 [혼자 채우기] [친구와 함께] | 목표 탭(`(tabs)/index.tsx`) | `PixelBottomSheet` + `PixelButton` (있음) |
| 친구와 함께 | `app/goal/together.tsx` (모달) | 새 `TogetherGoalScreen`: `OptionButtons`, `PixelInput`, `BoardTypePicker`, `SlotCountPicker`, `StickerSummary` 조립 |
| 공유 창 | OS `Share.share` | 없음 |
| 초대 받기 | `app/invite/[code].tsx` | 새 `InviteJoinScreen`, `InviteProblemScreen` |
| 판 화면(각자) | `app/goal/[id]/index.tsx` 분기 | `BoardDetailScreen` 확장 + 새 `FriendBoardList` |
| 판 화면(한 판) | 같음 | `BoardDetailScreen` 확장 + 새 `MemberBadgeRow` |
| 친구 판 크게 | 같은 화면 위 모달 | 새 `FriendBoardDialog` |
| 목표 설정 | `app/goal/[id]/settings.tsx` 분기 | `GoalSettingsScreen` 확장(함께하는 사람, 문제가 있을 때) |
| 차단 고르기, 확인 | 목표 설정 위 | `PixelBottomSheet`, `PixelDialog` (있음) |
| 차단한 사람 | `app/settings/blocked.tsx` | 새 `BlockedPeopleScreen` |
| 보여주기 받은 판 | `app/goal/[id]/index.tsx` 분기 | `BoardDetailScreen` `readOnly` |

## 7. 디자인 시스템

**넓혀 쓰는 것 (기존 값은 그대로, 더하기만)**

- `PixelFrame`: 변형 `thin` 추가. 겹은 바깥 잉크 2, 틈 1, 반투명 띠 1, 안쪽 잉크 1, 계단 3. 안쪽 여백 7.
- `BoardDetailScreen`: 시안의 임시 prop을 정식으로. `title?`(머리말), `readOnly`(톱니 숨김), `hideProgress`, `below?: ReactNode`(판 패널 아래, 친구 줄 자리), `boardRows?`(적립판 보이는 줄 수. 함께하는 판은 2, 한 판은 4). 값이 없으면 지금 화면 그대로.
- `GoalCardItem.status`: 「4명이 함께」, 「보기만」 줄은 지금 `status` 배열에 넣는다(바꿀 것 없음).
- `PixelBadge`: 톤 그대로(나는 `primary`, 친구는 `ink`).
- `SettingRow` 아래 설명 줄: 새 `SettingHint`(설명이 붙은 줄). 「문제가 있을 때」 세 줄.

**새로 만드는 것**

| 컴포넌트 | 내용 |
| --- | --- |
| `FriendBoardStrip` | `[이름 배지(폭 56)][PixelFrame thin 안 칸 두 줄]`. 적립판 7칸(판 안 폭 320 이상 8칸), 달력판 7칸 두 주. 칸 높이 32, 스티커 24. 가장 최근 칸이 둘째 줄. 옆으로 밀기, 누르기 |
| `FriendBoardList` | 「함께하는 사람 n」 + `FriendBoardStrip` 목록. 친구가 없으면 기다리는 자리(차곡이 + [링크 다시 보내기]) |
| `FriendBoardDialog` | 친구 판 전체(30칸 또는 한 달)를 thin 프레임에, [닫기] |
| `MemberBadgeRow` | 한 판 위 사람 줄(스티커 + 이름 배지, 나는 「나」) |
| `TogetherGoalScreen` | 친구와 함께 만들기 |
| `InviteJoinScreen` / `InviteLoginPrompt` / `InviteProblemScreen` | 초대 받기 세 화면 |
| `MemberList` | 목표 설정 「함께하는 사람 n/6」(만든 사람 배지, 내보내기) |
| `BlockedPeopleScreen` | 차단한 사람과 [풀기] |

## 8. 입력 검사

| 칸 | 규칙 | 어디서 | 문구 |
| --- | --- | --- | --- |
| 함께 목표 이름 | 지금 목표 이름과 같음(1~20자) | 앱 `goalNameError` | 지금 문구 |
| 내 이름(함께) | 1~10자, 앞뒤 공백 뺌 | 앱 새 `memberNameError`, `MEMBER_NAME_MAX = 10` | 「이름을 적어 주세요」, 「10자까지 쓸 수 있어요」 |
| 이름 금칙어 | 서버 `banned_words` | `create`, `join`, `update_member` 응답 `name_not_allowed` | 「다른 이름을 써 주세요」 |
| 스티커 겹침 | 같은 목표에서 이미 쓰는 스티커 | 서버 `sticker_taken`, 앱은 고르기에서 미리 흐리게 | 「이 목표에서 이미 누가 쓰는 스티커예요」 |
| 초대 코드 | 형식(8자), 없음, 가득, 지움, 바뀜, 차단 | 앱 형식 + 서버 | 문제 화면 두 가지(가득 / 들어갈 수 없어요) |

10자는 배지 폭(56)과 판 화면 두 줄을 생각한 값이다. 바꿀 수 있다.

**스토리:** `stories/InputValidation.stories.tsx`(`Rules/입력 검사`)와 `stories/flows/input-flow.json`에 함께 이름(쓰는 중, 가득, 빈칸, 금칙어), 스티커 겹침, 초대 문제(가득, 들어갈 수 없음)를 더한다.

## 9. 흐름도

`stories/flows/app-flow.json`에 시나리오 `together`(함께 목표)를 더하고 노드를 붙인다. `appFlow.ts` `grid`에 6행을 새로 연다.

- 노드: 더하기 시트, 친구와 함께, 공유 창(external), 초대 로그인, 함께하기, 초대 문제, 함께 판(각자), 한 판, 친구 판 크게, 함께 목표 설정, 차단 고르기, 차단한 사람, 보여주기 판.
- 각 노드 태그: `PRD 4.15`와 라우트. 스토리 ID 검사(README 「확인」)를 돌린다.

## 10. 위젯과 워치

- 위젯: `WidgetInput`/`WidgetGoal`/`CardBase`에 `members?: number`, 세 위젯 컴포넌트에 「n명」. `goal_shares.member_count`에서 읽는다.
- 한 판 목표도 위젯에서 바로 붙인다(2026-11-04 사용자: 「위젯에서 바로 붙일 수 있는게 우리 앱의 장점」). 약 2~3일 더.
  - 위젯 확장이 앱 없이 서버를 부른다: 앱이 로그인 토큰을 앱 그룹 공유 키체인에 두고(지금 세션 저장과 별도로 복사), 위젯 버튼 처리(App Intent)가 `place_shared_cell`을 부른다. 토큰이 지났으면 새로 고친다.
  - 서버 확인 뒤에만 칸을 그린다. 실패하면 위젯에 한 줄 안내를 몇 분 보인다: 「연결되면 붙일 수 있어요」, 「이미 누가 붙였어요」, 「앱을 열어 다시 로그인해 주세요」. 위젯은 확인 창을 띄울 수 없어서 이 줄이 유일한 안내다.
  - iOS가 주는 처리 시간이 짧아 요청 시간 제한을 짧게(약 5초) 두고, 넘으면 「연결되면 붙일 수 있어요」.
  - Android 위젯도 같은 규칙(서버 호출은 위젯 처리 작업에서).
- 워치: 한 판 목표도 워치 목록에 넣는다(2026-11-04 사용자). 워치는 붙임 요청만 하고 폰이 `place_shared_cell`을 부른다. 폰이 연결돼 있지 않거나 칸이 겹치면 워치에 「연결되면 붙일 수 있어요」 또는 「이미 누가 붙였어요」를 잠깐 보인다. 워치 스냅샷의 한 판 칸에는 붙인 사람의 스티커를 넣는다.

## 11. 테스트

- jest: `goalShareRepository`, `sharedGoals`(목록 갱신), 이름 검사, 판 모양 계산(칸 수, 열리는 첫 칸), 위젯 `members`.
- 서버(`npm run test:server`): 멤버 아닌 사람 읽기 거부, 차단 양쪽 거르기, 6명 상한, 스티커 겹침, 한 판 칸 겹침, 옛 초대 코드 거부, 만든 사람만 이름 바꾸기.
- vitest: `FriendBoardStrip`(칸 수 7/8, 최근 칸 위치), `PixelFrame thin`, `BoardDetailScreen` 새 prop이 없을 때 지금과 같음.
- 시뮬레이터: 두 계정으로 각자 판, 한 판, 보여주기, 차단 흐름(`qa` 에이전트).
- `security` 에이전트: 새 RPC, RLS, 익명 `preview_invite`가 내보내는 정보.

## 12. 순서

1. 디자인 시스템 컴포넌트와 Storybook(흐름도, 입력 검사 스토리 먼저) — 사용자 확인
2. 서버 마이그레이션과 RPC + 서버 테스트
3. 로컬 DB v3, 리포지토리, 동기화
4. 화면 연결(만들기 → 초대 → 판 → 설정 → 차단)
5. 딥링크(앱 설정 + novum-web 파일)
6. 위젯 「n명」과 한 판 위젯 붙이기
7. 처리방침과 약관 새 판 문안(1.1.0 개정에 합침)
8. qa, security, 사용자 확인

## 13. 확인할 것

- ~~혼자 판도 4칸(큰 폰 5칸)~~ → 바꾼다(2026-11-04 사용자). `TallyBoardView` 칸 셈을 하나로 맞추고 PRD 4.1, 4.2를 고친다.
- ~~한 판 목표 위젯~~ → 위젯에서 바로 붙인다(10절).
- ~~한 판 목표 워치~~ → 넣는다(10절).
- ~~함께 이름 10자~~ → 10자.
- ~~신고 알림~~ → Gmail SMTP 알림 메일(3절). 남은 외부 일: 앱 비밀번호 만들기.
- ~~지연 딥링크~~ → 넣지 않는다(5절).
