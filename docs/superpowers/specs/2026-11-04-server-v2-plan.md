# 서버 구조 다시 만들기 계획 (서버 2판)

2026-11-04. **사용자 확인 전 초안.** [함께 목표 개발 설계](2026-11-04-friends-goal-dev-design.md) 14절 B안(목표는 하나, 사람은 멤버로)으로 서버 DB를 처음부터 다시 만든다.

사용자 결정(2026-11-04):
- 「B안으로 가. 1.1.0도 수동 출시할꺼고, 운영 서버 기준으로 바꾸는 작업 계획을 먼저 진행해.」
- 「1.1.0에서 필요한것까지 생각해서 효율적인 구조로 설계해줘. 나중에 추가 확장이 용이할 수 있도록.」
- 「이번에 바꾸면 데이터 전부 날리고 DB 새로 만드는 작업을 진행할꺼야.」
- 「이런 방식은 이번까지만 할꺼고, 나중에는 마이그레이션과 수정하는 방법들을 택해야 할꺼야.」 전제는 운영 사용자 0명이고, 사용자가 운영 DB에서 확인했다.

## 1. 원칙

1. **표는 새로 짜고, 앱이 부르는 길(API)은 1.1.0 그대로 지킨다.** 1.1.0 앱은 표를 직접 쓰지 않고 정해진 서버 함수만 부른다(2절). 그 함수들의 입력과 출력 모양을 그대로 두고 안쪽만 새 표로 옮겨 쓴다. 그래서 1.1.0 앱 코드는 바꾸지 않는다.
2. **이번 한 번만 새 기준 파일로 바꾼다.** 개발과 운영 모두 데이터를 지우고 다시 만들므로, 지금 마이그레이션 파일 다섯 개를 지우고 깨끗한 기준 파일 묶음으로 바꾼다. **다음부터는 지우고 다시 만들지 않는다.** 이 기준 위에 새 마이그레이션 파일을 더하고, 운영 데이터를 옮기는 마이그레이션으로 바꾼다(DEV-SETUP 「운영 DB 바꾸기」 출시 뒤 방식).
3. **다른 사용자의 행은 멤버이고 서로 차단하지 않았을 때만 보인다.** 이 규칙 하나를 RLS와 함수가 같이 쓴다.
4. **확장은 칸과 값으로.** 방식, 역할, 공개 범위, 인원 상한은 표를 바꾸지 않고 값으로 늘린다. 다음 변경이 「칸 더하기」로 끝나게 짠다.

## 2. 1.1.0이 쓰는 서버 길 (바꾸면 안 되는 것)

| 길 | 1.1.0에서 하는 일 |
| --- | --- |
| RPC `push_changes` | 바뀐 목표, 스티커, 기록 행 올리기(`sort_order` 포함, 없으면 지우지 않음) |
| RPC `pull_changes(p_since, p_limit)` | 계정 연결 때 전체 받기(복원) |
| RPC `server_state` | 연결할 때 서버에 데이터가 있는지 보기 |
| RPC `replace_all` | 이 기기 것으로 서버를 덮기 |
| RPC `record_consent`, 표 `accounts` 읽기(`agreed_at`) | 약관 동의 기록과 확인 |
| 저장소 `record-photos`(첫 폴더 = 사용자 id) | 기록 사진 |
| Edge Function `apple-link`, `delete-account`, `kakao-unlink` | 로그인 연결, 계정 삭제, 카카오 연결 끊기 |

이 목록은 지금 서버 시험(`__tests__/server/syncServer.contract.test.ts`, `syncEndToEnd.test.ts` 등)이 붙잡고 있다. **새 구조에서도 이 시험들이 고치지 않고 통과해야 한다.** 다른 세션이 운영 DB에 더하려던 `sort_order`도 포함된다(`goal_members.sort_order`). 그래서 그 반영 작업(RELEASE-1.1.0 「운영 DB 반영」)은 이 계획이 대신한다.

## 3. 표

```text
accounts           사용자 한 명: 약관 동의, 만 14세 확인 (지금과 같음)
goals              목표 자체 (모두에게 같은 값)
goal_members       목표 안의 사람 (사람마다 다른 값). 혼자 목표도 멤버 한 명
stickers           판에 붙은 칸. 판 주인(각자 판과 혼자 판은 그 사람, 한 판은 비움)
records            칸에 남긴 사진과 메모. 공개 범위
invites            초대 코드
blocks             차단
reports            신고
banned_words       이름 금칙어 (비워 둠)
member_defaults    다음 함께 목표에 채워 줄 이름과 스티커
```

| 표 | 칸 | 제약과 비고 |
| --- | --- | --- |
| `goals` | id(uuid, 전역), owner_id, mode(`solo`, `each`, `one`, `show`), name, board_type, total_slots, initial_slots, end_date, max_members(혼자 1, 함께 6), created_at, updated_at, deleted_at, seq | 이름 1~20자. mode는 check 값만 늘리면 된다 |
| `goal_members` | goal_id, user_id, role(`owner`, `member`, `viewer`), display_name, sticker_id(그 사람의 기본 스티커), sort_order, completed_at, completion_seen, last_placed_at, joined_at, left_at, updated_at, deleted_at, seq | PK (goal_id, user_id). 나가지 않은 사람끼리 sticker_id 유일(혼자 목표는 해당 없음) |
| `stickers` | id, goal_id, board_user_id(혼자 판과 각자 판은 그 사람, 한 판은 null), placed_by, slot_index, date_key, tz_offset_min, sticker_type, placed_at, updated_at, deleted_at, seq | 적립판 유일: (goal_id, board_user_id, slot_index). 달력판: (goal_id, board_user_id, date_key, placed_by) 유일 + 한 판 같은 날 2장 상한(트리거) |
| `records` | id, sticker_id, user_id, photo_remote_path, memo, visibility(`self`, `members`), created_at, updated_at, deleted_at, seq | 지금은 늘 `self`. 메모와 사진 나누기는 이 값과 RLS만 바꾼다 |
| `invites` | code(8자), goal_id, created_by, created_at, revoked_at | |
| `blocks` | blocker_id, blocked_id, created_at | 양쪽 방향을 함수 하나(`private.blocked_between`)로 본다 |
| `reports` | id, goal_id, reporter_id, target_user_id, reason, created_at, handled_at | 신고 알림 웹훅 자리 |
| `banned_words` | word | |
| `member_defaults` | user_id, display_name, sticker_id | |

- **seq:** 지금처럼 전역 순번 `change_seq`. 모든 행에 seq와 지운 표시(deleted_at)를 둔다. 받아 오기는 「내가 멤버인 목표의 seq가 커서보다 큰 행」.
- **처음 들어온 목표의 지난 행:** 멤버가 된 순간 이전 seq의 행은 커서로 받지 못한다. `goal_members`의 내 행이 새로 생기면 앱이 그 목표만 처음부터 한 번 받는다(`pull_goal(goal_id)`).
- **사용자가 사라질 때:** 계정을 지우면 그 사람의 `goal_members`, 혼자 목표, 기록, 사진을 지운다. 그 사람이 만든 함께 목표는 가장 먼저 들어온 멤버가 이어받고, 아무도 없으면 지운다. 한 판에 붙인 그 사람의 칸은 지운다.

## 4. 읽기 권한

- `private.can_see_goal(goal_id)`: 내가 나가지 않은 멤버이면 참.
- `private.can_see_user(other)`: 나와 other가 서로 차단하지 않았으면 참.
- `goals`, `goal_members`: `can_see_goal`. 다른 멤버 행은 `can_see_user`도.
- `stickers`: `can_see_goal` 그리고 (내 판이거나 한 판이거나 `can_see_user(board_user_id)`).
- `records`: 내 것만. 나중에 `visibility = 'members'`이면 `can_see_goal`과 `can_see_user`.
- 쓰기는 지금처럼 모두 RPC(`security definer`)로만.
- 사진 저장소: 지금처럼 내 폴더만. 사진 나누기를 넣을 때 정책을 넓힌다.

## 5. 서버 함수

**1.1.0 호환 (이름과 입출력은 지금 그대로, 안쪽만 새 표)**

- `push_changes`: 목표 행 → `goals`(mode `solo`, owner = 나) + 내 `goal_members` 행(순서, 기본 스티커, 완성, 마지막으로 붙인 시각). 스티커 행 → `stickers`(판 주인 = 나, 붙인 사람 = 나). 기록 행 → `records`.
- `pull_changes`: 내 혼자 목표를 지금 모양 그대로(목표 칸 + 내 멤버 칸을 합친 행) 돌려준다. 함께 목표는 1.1.0에 보내지 않는다(1.1.0은 모른다).
- `server_state`, `replace_all`, `record_consent`: 같은 방식.

**2판 (다음 앱 버전부터)**

- 동기화: `sync_push`(멤버 칸, 판 주인 포함), `sync_pull(since)`, `pull_goal(goal_id)`. 한 판 칸이 겹치면 그 행만 `slot_taken`으로 돌려준다.
- 함께 목표: `create_shared_goal`, `preview_invite`(로그인 전), `join_goal`, `update_member`, `update_goal`(만든 사람), `rotate_invite`, `leave_goal`, `kick_member`, `block_user`, `unblock_user`, `my_blocks`, `report`.
- 1.1.0 사용자가 남아 있는 동안 호환 함수를 둔다. 둘 다 같은 표를 쓰므로 데이터가 갈라지지 않는다.

## 6. 파일

지금 `supabase/migrations` 다섯 파일을 지우고 아래로 바꾼다(이번 한 번).

| 파일 | 내용 |
| --- | --- |
| `20261105000001_core.sql` | 순번, accounts, goals, goal_members, stickers, records, seq 트리거, 인덱스, RLS, private 함수 |
| `20261105000002_sharing.sql` | invites, blocks, reports, banned_words, member_defaults, 읽기 권한 함수 |
| `20261105000003_api_v1.sql` | 1.1.0 호환 RPC |
| `20261105000004_api_v2.sql` | 2판 동기화와 함께 목표 RPC |
| `20261105000005_storage_admin.sql` | 사진 저장소 정책, 계정 관리(애플 토큰, 카카오 실패, 삭제 기록) |

Edge Function `delete-account`(`_shared/deleteUser.ts`)는 새 표 순서에 맞춘다(만든 함께 목표 넘기기).

## 7. 순서

| # | 할 일 | 확인 | 허락 |
| --- | --- | --- | --- |
| 1 | 새 기준 파일 다섯 개와 서버 시험 작성(이 브랜치) | 코드 리뷰, `security` 에이전트 | |
| 2 | 개발 서버 비우고 새로 적용(`db reset --linked`), 개발 계정 다시 만들기, 사진 비우기 | `npm run test:server` 전체 통과(기존 계약 시험은 고치지 않고) | **필요.** 다른 세션도 개발 서버를 쓴다 |
| 3 | 1.1.0 빌드를 개발 서버에 붙여 확인: 로그인, 백업, 복원, 순서 바꾸기, 계정 삭제 | 시뮬레이터(`qa`), 사용자 확인 | |
| 4 | `release/1.1.0`에 합치기 | 1.1.0 세션과 맞추기 | **필요** |
| 5 | 운영 서버 비우고 새로 적용(DB와 사진을 비우고 파일 전체 넣기) | 1.1.0 빌드로 운영 확인 | **필요.** 수동 출시 전 |
| 6 | 1.1.0 출시(수동) | | 사용자 |
| 7 | 다음 앱 버전: 로컬 DB를 같은 모양으로, 2판 동기화, 함께 목표 화면 연결 | | |
| 8 | DEV-SETUP과 supabase-dev 스킬에 「이번이 마지막 리셋, 다음부터 마이그레이션」 기록 | | |

- **심사와의 순서:** 심사 중에는 심사관이 운영 서버를 쓴다. 가능하면 5번을 심사 제출 전에 하고, 이미 제출했으면 승인 뒤 출시 전에 한다. 호환 함수가 같은 결과를 내므로 심사 때와 출시 때 동작은 같다.
- 3번에서 1.1.0 빌드가 그대로 돌면, 1.1.0 코드는 바꾸지 않는다.

## 8. 나중 확장 자리 (모두 「새 파일 + 칸이나 표 더하기」로 끝나게)

| 확장 | 바꿀 곳 |
| --- | --- |
| 메모와 사진을 함께하는 사람에게 | `records.visibility`, records RLS, 사진 저장소 정책 |
| 인원 늘리기 | `goals.max_members` 값 |
| 새 방식(예: 릴레이) | `goals.mode` check 값 + 함수 |
| 반응(나중에 정하면) | `reactions(sticker_id 또는 record_id, user_id, kind)` 새 표. PRD 2절 원칙(평가 없음)을 먼저 확인 |
| 여러 기기 동기화 | 이미 있는 `sync_pull(since)` |
| 한 번에 한 기기(PRD 4.8, 아직 없음) | `devices(user_id, device_id, active_at)` 새 표 + `sync_push`에서 확인 |
| 알림 | `notifications` 새 표. 재촉 문구 원칙(PRD 2절) 먼저 |

## 9. 위험

- **호환 함수가 틀리면 1.1.0 백업과 복원이 깨진다.** 기존 계약 시험을 고치지 않고 통과시키는 것이 기준이다. 시뮬레이터에서 1.1.0 빌드로 한 번 더 본다.
- **개발 서버 리셋은 다른 세션의 시험 데이터도 지운다.** 리셋 전에 알린다.
- **운영 리셋은 되돌릴 수 없다.** 운영 사용자가 0명인 것은 사용자가 확인했다(2026-11-04). 리셋 직전에 계정 수와 사진 수를 한 번 더 보고 기록한다.

## 10. 작성하며 바뀐 것과 보안 검토 반영 (2026-11-04)

- **1.1.0의 id는 uuid가 아니다**(`1730000000000-ab12cd34`). 서버 id는 uuid로 두고, 기기가 보낸 글자는 `client_id`에 그대로 둔다. 서버 id는 `private.v1_id(사용자, 종류, 글자)`(uuid 모양이면 그대로, 아니면 md5).
- **표 직접 읽기:** `goal_members`, `stickers`는 로그인 사용자도 직접 읽지 못한다. 다른 사람 행은 `sync_pull`, `pull_goal`로만(가리는 규칙이 한 곳). `goals`는 멤버가 읽는다(목표 자체 값만). 4절의 「직접 읽는다」를 대신한다.
- **차단 숨기기:** 나간 사람, 내보내진 사람, 차단 관계인 사람을 다른 멤버에게 같은 모양 `{goal_id, user_id, gone: true}`로 보낸다. 차단당한 사람 자신의 행은 건드리지 않는다. 받아들인 위험: 처음 보는 목표의 미리보기는 열림인데 들어가기는 「들어갈 수 없어요」인 경우, 한 판에서 차단한 사람의 칸이 이름 없는 칸으로 남는 경우.
- **나간 사람:** 멤버 행에 목표, 사용자, 역할, 나간 시각과 이유만 남긴다(내보내진 사람이 다시 들어오지 못하게). 한 판의 칸과 기록, 마지막 사람이 나간 목표와 초대는 실제로 지운다. 차단 목록의 이름은 차단할 때 `blocks.display_name`에 남긴다.
- **입력 검사(함께 목표만):** 종료일 날짜 형식, 적립판 칸 수 1~1000(서버 값, 다음 앱에도 같은 한도와 안내를 더한다), 스티커 id 40자, 칸 번호 0 이상 칸 수 미만(앱은 0부터 센다).
- **함께하기 시도 제한:** 한 사람 1시간 20번, 넘으면 `rate_limited`. `join_goal`만 실패를 값(`{error}`)으로 돌려준다(오류를 내면 시도 기록도 되돌려져서).
- **다음 앱이 처리할 것:** `join_goal`의 `{error}`와 `rate_limited`, `sync_push` 칸 행의 `not_allowed`, 입력 오류 `invalid_input`과 `invalid_sticker`, 멤버 행 `gone`이면 그 사람 판 지우기, 목표 행이 오면 `pull_goal`로 다시 받기.
- **받아들인 위험(기록만):** 로그인 전 `preview_invite`의 횟수 제한은 나중에 서버 앞단(프록시나 엣지)에서. md5 서버 id를 남이 미리 계산해 먼저 차지하는 경우(기기 id에 무작위 글자가 있어 어렵다).
- **운영 메모:** 계정은 대시보드에서 바로 지우지 않는다. 대시보드 삭제는 트리거가 데이터 행만 지우고 사진, Apple 토큰 폐기, 카카오 연결 끊기, 파기 기록을 남기지 않는다. 앱의 계정 삭제(Edge Function `delete-account`)를 쓴다. 보여주기를 만들 때 보는 사람만 남은 목표가 알림 없이 사라지지 않게 한다.
