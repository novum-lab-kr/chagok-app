# 함께 목표 1단계: 로컬 DB와 2판 동기화 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**목표:** 기기 DB를 서버 2판과 같은 모양(목표, 멤버, 판 주인이 있는 칸)으로 다시 쓰고, 앱의 올리기와 받아 오기를 2판 RPC(`sync_push`, `sync_pull`, `pull_goal`)로 바꾼다. 화면은 바꾸지 않는다. 이 단계가 끝나면 혼자 목표는 지금과 똑같이 돌고, 함께 목표 행은 받아 와서 기기 DB에 쌓인다.

**구조:** 리포지토리의 바깥 함수와 `Goal`, `Sticker` 모양은 거의 그대로 두고 안쪽 SQL만 새 표로 옮긴다. 그래서 위젯, 워치, 기록 탭, 완성, 목표 순서 코드는 고치지 않는다. 동기화는 한 회차가 「올리기 → 받아 오기」이고, 받은 행은 `src/sync/pull.ts` 한 곳에서 기기 DB에 반영한다.

**기술:** expo-sqlite(테스트는 node:sqlite), jest + ts-jest, Supabase RPC.

**정본:** `docs/superpowers/specs/2026-11-05-friends-goal-handoff.md`(개발 목록 A1~A5), `docs/superpowers/specs/2026-11-04-friends-goal-dev-design.md` 14절 B안, `docs/superpowers/specs/2026-11-04-server-v2-plan.md` 10절, `supabase/migrations/20261105000004_api_v2.sql` 머리 주석(동기화 규칙).

## 사용자가 정한 것 (2026-11-05)

- 함께 목표는 **1.1.0에 같이 넣는다.** 버전은 `1.1.0` 그대로.
- 1.0.0 사용자는 0명. 로컬 DB는 **최종 구조로 다시 쓴다**(출시 전 규칙: v1을 최종 구조로 고치고 v2를 합친다. 옮기기 단계 없음).
- 작업 방식(2026-11-05 밤): 「단계별로 계획작성 -> 구현+코드 중복 및 불필요 코드 없는지 체크 -> 테스트 -> 빌드 후 시뮬레이터 테스트 (필요시) -> 수정사항 있나 확인 후 수정 -> 커밋」. 확인할 것은 진행하면서 모아 두었다가 아침에 한꺼번에 묻는다. 커밋은 되돌리기와 기록을 위해 바로 한다. 아래 「진행 기록」에 무엇을 어떻게 했는지 남긴다.

## 전체 제약

- 커밋은 작업 단위마다 바로 한다(위 사용자 지시). push는 하지 않는다.
- 서버는 이 단계에서 고치지 않는다. 고칠 일이 생기면 새 마이그레이션 파일로만(2026-11-05가 마지막 리셋).
- 서버 시험은 로그인 한도(5분 30번) 때문에 파일 하나씩 나눠 돌린다(PITFALLS).
- `src/design-system`은 `src/domain`을 가져다 쓰지 않는다(린트).
- 서버 id는 모두 uuid다. 기기가 새로 만드는 목표, 스티커, 기록 id도 uuid여야 `sync_push`가 받는다(`(r->>'id')::uuid`).
- 기기 안에서 나 자신은 사용자 id 대신 상수 `ME = 'me'`로 적는다. 로그인 전에도 멤버 행이 있어야 하고, 계정을 바꾸면 기기를 비우므로(wipe 또는 복원) 섞이지 않는다. 서버와 주고받을 때만 실제 사용자 id로 바꾼다.
- 1.1.0 호환 RPC 가운데 `server_state`와 `replace_all`은 계속 쓴다(혼자 목표만 다루고, uuid id는 `private.v1_id`가 그대로 통과시킨다). `push_changes`, `pull_changes`는 앱에서 더 부르지 않는다.

## 검토할 때 볼 것

1. **1.0.0을 깔았던 기기(사용자 폰, TestFlight)** 는 `user_version`이 1 또는 2라, 새 v1이 적용되지 않으면 첫 화면에서 멈춘다. 옛 구조를 알아보고 지운 뒤 새로 만들어야 한다(작업 1의 시험).
2. **로그인 전에 만든 목표를 로그인 뒤 올릴 때**, 기기의 `ME`가 서버에서 내 사용자 id로 바뀌어야 하고, 다시 받을 때는 `ME`로 돌아와야 한다. 같은 목표가 두 줄이 되면 안 된다(작업 6의 시험).
3. **한 판에서 칸이 겹쳐 거절(`slot_taken`)되면** 그 칸이 기기에서 사라지고 outbox에 다시 남지 않아야 한다(작업 5의 시험).
4. **나가거나 차단된 사람(`gone: true`)** 의 판과 이름이 기기에서 지워져야 한다. 내 판은 남아야 한다(작업 6의 시험).
5. **받아 오기 도중 끊기면** 커서가 앞으로 가지 않아 다음 회차에 같은 행을 다시 받아도 결과가 같아야 한다(작업 6의 시험).

---

## 파일 지도

| 파일 | 맡는 일 |
| --- | --- |
| `src/db/schema.ts` | v1 하나로 최종 구조. v2(sort_order) 합침 |
| `src/db/client.ts` | 옛 구조 DB를 알아보고 지운 뒤 새로 만들기 |
| `src/repositories/ids.ts` | uuid 만들기, `ME` |
| `widgets/ios/ChagokGoal.tsx`, `ChagokTally.tsx`, `ChagokMonth.tsx` | 위젯 요청 id를 uuid 모양으로(요청 id가 스티커 id가 된다) |
| `src/domain/types.ts` | `GoalMode`, `MemberRole`, `GoalMember`, `Goal`과 `Sticker`에 칸 추가 |
| `src/repositories/goalRepository.ts` | goals + 내 goal_members를 합쳐 읽고 쓰기 |
| `src/repositories/memberRepository.ts` (새) | 함께 목표 멤버 읽기(다음 단계 화면이 쓴다) |
| `src/repositories/stickerRepository.ts` | 판 주인, 붙인 사람 |
| `src/repositories/recordRepository.ts` | `visibility`(늘 `self`) |
| `src/sync/outbox.ts` | 종류에 `member` |
| `src/sync/contract.ts` | 2판 행 모양과 `SyncServer` 2판 |
| `src/sync/supabaseServer.ts` | `sync_push`, `sync_pull`, `pull_goal` 호출 |
| `src/sync/push.ts` | 2판 행 만들기, 거절된 행 처리 |
| `src/sync/pull.ts` (새) | 받은 행과 목표 통째 반영, 커서 |
| `src/sync/connect.ts`, `app/_layout.tsx` | 회차 = 올리기 → 받아 오기, 30초 주기 |
| `src/sync/restore.ts`, `app/account/connect.tsx`, `app/dev/sync.tsx` | 복원을 `sync_pull` 기준으로 |
| `src/sync/wipe.ts` | `goal_members`도 비우기 |
| `__tests__/support/fakeServer.ts`, `syncServerContract.ts` | 2판 규칙을 메모리로 |

---

### 작업 1: 로컬 DB 최종 구조, 옛 DB 지우기, uuid id

**파일:**
- 고침: `src/db/schema.ts`, `src/db/client.ts`, `src/repositories/ids.ts`, `src/sync/wipe.ts`, `widgets/ios/ChagokGoal.tsx:91`, `widgets/ios/ChagokTally.tsx:144`, `widgets/ios/ChagokMonth.tsx:131`, `package.json`(jest `moduleNameMapper`)
- 새로: `__tests__/support/expoCrypto.ts`
- 시험: `__tests__/migrations.test.ts`, `__tests__/wipe.test.ts`, `__tests__/ids.test.ts`(새)

**인터페이스:**
- 내놓는 것: `ME = 'me'`, `newId(): string`(uuid v4, 소문자), 표 `goals`, `goal_members`, `stickers`, `records`, `outbox`(종류에 `member`)

| 표 | 칸 |
| --- | --- |
| `goals` | id PK, mode(`solo`,`each`,`one`,`show`) 기본 `solo`, owner_id(로그인 전 혼자 목표는 null), name, board_type, total_slots, initial_slots, end_date, max_members 기본 1, created_at, updated_at |
| `goal_members` | goal_id(goals 참조, cascade), user_id(나는 `ME`), role(`owner`,`member`,`viewer`), display_name, sticker_id, sort_order, completed_at, completion_seen 기본 0, last_placed_at, joined_at, updated_at 기본 0. PK (goal_id, user_id) |
| `stickers` | 지금 칸 + board_user_id(내 판 `ME`, 한 판 null, 친구 판은 그 사람 id), placed_by(`ME` 또는 그 사람 id, 차단으로 가려지면 null). sticker_type은 null 허용(가려진 칸). 색인 (goal_id, board_user_id) |
| `records` | 지금 칸 + visibility 기본 `self` |
| `outbox` | entity check에 `member` 추가 |
| `app_settings`, `pack_access`, `placed_days` | 그대로 |

- [ ] **1단계: 시험 쓰기** `migrations.test.ts`: goal_members PK (goal_id, user_id), stickers의 board_user_id와 placed_by, records.visibility 기본 `self`, 「옛 구조(user_version 2, goal_members 없음) DB는 지우고 새로 만든다(deviceId는 남는다)」. `ids.test.ts`: `newId()`가 uuid v4 모양, 두 번 부르면 다르다. `wipe.test.ts`: 지운 뒤 goal_members 0줄.
- [ ] **2단계: 실패 확인** `npx jest __tests__/migrations.test.ts __tests__/ids.test.ts __tests__/wipe.test.ts`
- [ ] **3단계: 구현**
  - `schema.ts`: MIGRATIONS를 최종 구조 한 개로. 머리 주석에 다시 쓴 까닭.
  - `client.ts` `migrate`: 버전이 0보다 크고 `goal_members` 표가 없으면 아는 표를 지우고(app_settings는 `deviceId`, `analyticsOff`, `errorReportOff`만 남김) `user_version = 0`으로 둔 뒤 평소처럼 적용.
  - `ids.ts`: `expo-crypto`의 `randomUUID()`. jest는 `moduleNameMapper`로 `__tests__/support/expoCrypto.ts`(node `crypto.randomUUID`)에 잇는다.
  - 위젯 세 파일: 요청 id를 uuid v4 모양으로(위젯 실행 환경에는 crypto가 없어 `Math.random`으로 채운다).
  - `wipe.ts`: `DELETE FROM goal_members` 추가.
- [ ] **4단계: 통과 확인** 같은 명령

### 작업 2: 목표 리포지토리를 goals + 내 멤버 행으로

**파일:** `src/domain/types.ts`, `src/repositories/goalRepository.ts`, `src/sync/outbox.ts`(종류 `member`, 순서 goal → member → sticker → record → photo, `enqueueAll`에 내 멤버 행), 새 `src/repositories/memberRepository.ts`. 시험 `goalRepository.test.ts`, `repositoryOutbox.test.ts`, 새 `memberRepository.test.ts`, Goal 값을 직접 만드는 시험과 스토리(typecheck가 알려 준다).

**인터페이스 (내놓는 것):**
```ts
export type GoalMode = 'solo' | 'each' | 'one' | 'show';
export type MemberRole = 'owner' | 'member' | 'viewer';
// Goal에 더한다: mode: GoalMode; role: MemberRole;
export type GoalMember = { goalId: string; userId: string; isMe: boolean; role: MemberRole;
  displayName: string | null; stickerId: string | null; joinedAt: number | null };
listMembers(goalId: string): Promise<GoalMember[]>   // joined_at, user_id 순
countMembers(goalId: string): Promise<number>        // viewer 빼고
```
규칙:
- `Goal`의 사람마다 값(defaultStickerId, completedAt, completionSeen, lastPlacedAt, sortOrder)은 내 멤버 행에서 읽는다. `defaultStickerId` = `goal_members.sticker_id`.
- `listGoals`, `getGoal`, `listGoalSummaries`는 내 멤버 행이 있는 목표만.
- 목표 자체 값(name, total_slots, end_date)을 바꾸면 `goal` 항목, 사람마다 값을 바꾸면 `member` 항목. 둘 다 바꾸면 둘 다.
- `createGoal`은 mode `solo`, 내 멤버 행 role `owner`, joined_at = created_at을 한 트랜잭션에.
- 목표 자체를 바꾸는 함수(`updateGoal`의 name, totalSlots, endDate, `extendSlots`, `extendEndDate`, `deleteGoal`)는 `mode !== 'solo'`이면 던진다(함께 목표는 2단계에서 RPC로).

- [ ] **1단계: 시험 쓰기** createGoal이 owner 멤버 행을 같이 만든다, reorderGoals는 sort_order만 고치고 member 항목, markCompletionSeen은 member 항목만, updateGoal(name)은 goal 항목, 내 멤버 행이 없는 목표는 목록에 안 나온다, 함께 목표에 updateGoal(name)은 던진다, listMembers 순서와 isMe, countMembers는 viewer 제외. 기존 기대값은 그대로.
- [ ] **2단계: 실패 확인** `npx jest __tests__/goalRepository.test.ts __tests__/memberRepository.test.ts __tests__/repositoryOutbox.test.ts`
- [ ] **3단계: 구현**
- [ ] **4단계: 통과 확인** 같은 명령 + `npm run typecheck`

### 작업 3: 스티커와 기록 리포지토리

**파일:** `src/domain/types.ts`(`Sticker`에 `boardUserId: string | null; placedBy: string | null`), `src/repositories/stickerRepository.ts`, `src/repositories/recordRepository.ts`. 시험 `stickerRepository.test.ts`, `recordRepository.test.ts`.

규칙:
- `placeSticker`: 판 주인은 방식으로(`one`이면 null, 아니면 `ME`), 붙인 사람 `ME`. 마지막으로 붙인 시각과 완성은 내 멤버 행에, outbox는 `sticker` + `member`.
- 「이미 붙인 칸」은 같은 판 안에서만. 한 판 달력판은 같은 날 내가 이미 붙였거나 그날 두 장이면 막는다(서버 트리거와 같은 규칙).
- `listStickers`, `listStickersInMonth`, `countStickers`는 내가 보는 판만(`board_user_id = 'me' OR board_user_id IS NULL`). 위젯, 워치, 완성 계산에 친구 칸이 섞이지 않는다.
- 새 `listBoardStickers(goalId: string, boardUserId: string): Promise<Sticker[]>`(친구 판 화면용).
- `removeSticker`는 `placed_by = 'me'`만. 아니면 던진다. `countAllStickers`는 내가 붙인 칸만.
- 기록은 내가 붙인 칸에만. `visibility`는 늘 `self`.

- [ ] **1단계: 시험 쓰기** 혼자 목표에 붙이면 board_user_id와 placed_by가 me, 한 판은 board_user_id null, listStickers는 친구 판 칸 제외, 친구 판에 같은 칸 번호가 있어도 내 판에 붙음, 한 판 달력판 같은 날 세 번째 막음, 친구 칸 removeSticker 던짐, countAllStickers는 내 칸만.
- [ ] **2단계: 실패 확인** `npx jest __tests__/stickerRepository.test.ts __tests__/recordRepository.test.ts`
- [ ] **3단계: 구현**
- [ ] **4단계: 통과 확인** `npm test`(동기화 시험 push, restore 빼고 통과), `npm run typecheck`
- [ ] **5단계: 커밋** `feat(db): rebuild the device database around goals and members`

### 작업 4: 서버 계약 2판과 어댑터, 가짜 서버

**파일:** `src/sync/contract.ts`, `src/sync/supabaseServer.ts`, `__tests__/support/fakeServer.ts`, `__tests__/support/syncServerContract.ts`. 시험 `supabaseServer.test.ts`, `fakeServerContract.test.ts`.

**인터페이스 (내놓는 것):**
```ts
// 서버 행 모양(api_v2.sql goal_json, member_json, sticker_json, record_json 그대로)
export type V2GoalRow = { id: string; client_id: string | null; mode: GoalMode; owner_id: string; name: string;
  board_type: 'calendar' | 'tally'; total_slots: number | null; initial_slots: number | null; end_date: string | null;
  max_members: number; created_at: number; updated_at: number; deleted_at?: number | null };
export type V2MemberRow = { goal_id: string; user_id: string; role: MemberRole; display_name: string | null;
  sticker_id: string | null; joined_at: number | null; left_at: number | null; updated_at: number;
  sort_order?: number | null; completed_at?: number | null; completion_seen?: number; last_placed_at?: number | null };
export type GoneMember = { goal_id: string; user_id: string; gone: true };
export type V2StickerRow = { id: string; client_id: string | null; goal_id: string; board_user_id: string | null;
  slot_index: number; date_key: string; tz_offset_min: number; placed_at: number; updated_at: number;
  placed_by: string | null; sticker_type: string | null };
export type V2RecordRow = RecordRow & { client_id: string | null; visibility: 'self' | 'members' };
export type MemberChangeRow = { goal_id: string; sort_order: number | null; completed_at: number | null;
  completion_seen: number; last_placed_at: number | null; updated_at: number; sticker_id?: string };
export type V2Change =
  | { entity: 'goal'; op: 'upsert'; row: GoalRow }          // 지금 GoalRow(혼자 목표만)
  | { entity: 'member'; op: 'upsert'; row: MemberChangeRow }
  | { entity: 'sticker'; op: 'upsert'; row: StickerRow }
  | { entity: 'record'; op: 'upsert'; row: RecordRow }
  | { entity: 'goal' | 'sticker' | 'record'; op: 'delete'; id: string; deletedAt: number };
export type PushRejection = { entity: string; id: string; reason: 'slot_taken' | 'not_allowed' };
export type V2Pulled =
  | { entity: 'goal'; row: V2GoalRow; deletedAt: number | null }
  | { entity: 'member'; row: V2MemberRow | GoneMember; deletedAt: number | null }
  | { entity: 'sticker'; row: V2StickerRow; deletedAt: number | null }
  | { entity: 'record'; row: V2RecordRow; deletedAt: number | null };
export type GoalSnapshot = { goal: V2GoalRow; members: V2MemberRow[]; stickers: V2StickerRow[]; records: V2RecordRow[] };
export class NotMember extends Error {}
export interface SyncServer {
  push(deviceId: string, changes: V2Change[]): Promise<{ rejected: PushRejection[] }>;           // sync_push
  pull(since: number, limit: number): Promise<{ rows: V2Pulled[]; cursor: number; more: boolean }>; // sync_pull
  pullGoal(goalId: string): Promise<GoalSnapshot>;                                                // pull_goal
  state(): Promise<{ goals: number; lastUpdatedAt: number | null }>;                              // server_state
  replaceAll(deviceId: string, rows: { goals: GoalRow[]; stickers: StickerRow[]; records: RecordRow[] }): Promise<void>; // replace_all
}
```
- [ ] **1단계: 시험 쓰기** 어댑터: 함수 이름과 인자(`p_device_id`, `p_changes` / `p_since`, `p_limit` / `p_goal_id`), `rejected` 그대로, 22xxx와 23xxx는 `SyncRejected`, P0001 `not_member`는 `NotMember`. 공통 계약: 내 혼자 목표 올리고 받기, 같은 칸 두 번째 사람 `slot_taken`, 남의 칸 지우기 `not_allowed`, 커서 이어 받기.
- [ ] **2단계: 실패 확인** `npx jest __tests__/supabaseServer.test.ts __tests__/fakeServerContract.test.ts`
- [ ] **3단계: 구현** `FakeServer`는 사용자 여럿을 흉내 낸다(`as(userId)`가 그 사람의 `SyncServer`). 시험 도우미 `createSharedGoal`, `join`, `leave`, `block`은 api_v2.sql 같은 이름 함수의 규칙(gone 모양, 목표 행 순번 바꾸기, 각자 판 나가기는 새 혼자 목표로 옮기기)을 따른다.
- [ ] **4단계: 통과 확인** 같은 명령, 그리고 실제 서버로 `npx jest __tests__/server/syncServer.contract.test.ts` 한 파일만

### 작업 5: 올리기 2판

**파일:** `src/sync/push.ts`. 시험 `push.test.ts`.

규칙:
- `goal`: 혼자 목표면 지금 `GoalRow`(내 멤버 값을 합침). 함께 목표면 보내지 않고 ack.
- `member`: 내 멤버 행으로 `MemberChangeRow`. 혼자 목표만 `sticker_id`.
- `sticker`, `record`: 지금 모양. 행이 없으면 삭제.
- 보낼 때 `ME`를 실제 사용자 id로 바꿀 칸은 없다(서버가 붙인 사람을 로그인 사용자로 정한다).
- 거절: `sticker`의 `slot_taken`은 기기에서 그 칸과 기록, 사진 항목을 지우고 outbox 항목을 지우고 `onSlotTaken(stickerId)`를 부른다. `not_allowed`는 그 항목만 `hold`.
- `PushDeps`에 `onSlotTaken?: (stickerId: string) => void`.

- [ ] **1단계: 시험 쓰기** 혼자 목표 goal은 GoalRow로, 순서 변경은 member 행으로, 함께 목표 goal 항목은 보내지 않고 지움, slot_taken이면 칸과 항목을 지우고 onSlotTaken, 그 뒤 다시 보내지 않음, not_allowed는 그 항목만 보류. 기존 사진, 네트워크, 나눠 보내기 시험 그대로 통과.
- [ ] **2단계: 실패 확인** `npx jest __tests__/push.test.ts`
- [ ] **3단계: 구현**
- [ ] **4단계: 통과 확인**

### 작업 6: 받아 오기

**파일:** 새 `src/sync/pull.ts`. 시험 새 `__tests__/pull.test.ts`.

**인터페이스 (내놓는 것):**
```ts
export type PullDeps = { server: SyncServer; userId: string; pageSize?: number };
export function pullOnce(deps: PullDeps): Promise<{ applied: number; refetched: string[]; removedPhotoUris: string[] }>;
export function refetchGoal(deps: PullDeps, goalId: string): Promise<{ removedPhotoUris: string[] }>;
```
반영 규칙(`api_v2.sql` 머리 주석):
- 서버의 `userId`는 기기에서 `ME`로(`board_user_id`, `placed_by`, `user_id`).
- `goal` 행: 혼자 목표면 목표 자체 값을 쓴다(updated_at이 크거나 같을 때). 함께 목표면 그 목표를 이번 회차 끝에 `refetchGoal`(한 번씩).
- `deletedAt`이 있는 goal, sticker, record는 지운다(딸린 칸과 기록 포함, 지운 사진 경로를 돌려준다).
- 내 `member` 행: 처음 보는 목표면 `refetchGoal`. `left_at`이 있으면 그 목표를 지운다. 아니면 updated_at 비교로 쓴다.
- 남의 `member` 행: `gone`이면 그 사람 멤버 행과 그 사람 판 칸을 지운다. 아니면 쓴다.
- `sticker` 행: 그 목표가 기기에 없으면 건너뛴다. `sticker_type` null(가려진 칸)도 둔다.
- `record` 행: 내 기록만 온다. `photo_uri`는 건드리지 않고, 사진 경로가 새로 생기거나 바뀌면 `pendingPhotoDownloads`에 더한다.
- outbox에 남은 같은 행(아직 안 올린 내 변경)은 덮지 않는다.
- outbox를 만들지 않는다. 끝나면 `notifyLocalChange()` 한 번.
- 커서는 `app_settings.syncCursor`, 쪽마다 반영 뒤 저장. `refetchGoal`은 그 목표의 칸, 멤버, 내 기록을 통째로 바꾼다. `NotMember`면 그 목표를 지운다.

- [ ] **1단계: 시험 쓰기** (가짜 서버, 두 사람) 다른 기기에서 고친 이름 받기, 로그인 전 목표를 올리고 받아도 한 줄이고 내 행은 me, 함께 목표에 들어가면 pull_goal로 목표, 멤버, 친구 칸까지, 친구 칸은 board_user_id가 친구 id이고 listStickers에는 없음, gone이면 그 사람 행과 판만 지움, 내가 내보내지면 그 목표를 지움, 각자 판에서 내보내지면 새 혼자 목표가 들어오고 내 칸이 옮겨짐, outbox에 남은 내 변경은 안 덮임, 두 번째 쪽 실패 때 커서는 첫 쪽까지이고 다시 하면 같은 결과, pull_goal not_member면 지움.
- [ ] **2단계: 실패 확인** `npx jest __tests__/pull.test.ts`
- [ ] **3단계: 구현**
- [ ] **4단계: 통과 확인**

### 작업 7: 동기화 회차와 주기

**파일:** `src/sync/connect.ts`, `src/sync/appSync.ts`, `app/_layout.tsx`, 새 `src/sync/syncRequest.ts`. 시험 `connect.test.ts`.

규칙:
- 한 회차 = `pushOnce` → `pullOnce`. 올리기가 실패하면 받아 오기도 하지 않는다.
- 앱이 앞에 있는 동안 30초마다(`ConnectDeps.pollMs`, 기본 30000). 뒤로 가면 멈춘다.
- `requestSync()`(목표 탭, 판 화면 포커스용. 화면 연결은 2단계)와 `subscribeSyncRequest(fn)`.
- 회차가 성공하면 `lastSyncedAt` 저장. 받아 오기가 돌려준 지운 사진 파일을 지운다.

- [ ] **1단계: 시험 쓰기** 올리기 다음 받아 오기 순서, 30초마다(가짜 타이머), 뒤로 가면 멈춤, `requestSync()`가 회차를 부름, 잠금 중에는 안 함.
- [ ] **2단계: 실패 확인** `npx jest __tests__/connect.test.ts __tests__/scheduler.test.ts`
- [ ] **3단계: 구현**
- [ ] **4단계: 통과 확인**

### 작업 8: 계정 연결과 복원

**파일:** `src/sync/restore.ts`, `app/account/connect.tsx`, `app/dev/sync.tsx`. 시험 `restore.test.ts`, `connectAccount.test.ts`.

규칙:
- `pullAll`은 `sync_pull`을 0부터 끝까지 받고, 함께 목표는 `pullGoal`로 채운다.
- `summarizeSnapshot`, `summarizeDevice`는 내 혼자 목표만 센다(복원 충돌 카드는 이 기기 기록과 서버 백업 비교).
- `applyRestore`는 새 표에 쓴다(`ME` 바꾸기 포함). `fillSortOrder`는 그대로.
- `replaceServerWithDevice`: `replace_all`(혼자 목표만) 뒤 커서를 0으로 두고 `pullOnce`로 함께 목표를 받는다.

- [ ] **1단계: 시험 쓰기** 복원하면 혼자 목표와 함께 목표가 모두 들어오고 커서 저장, 충돌 요약은 혼자 목표만, 이 기기 기록 유지 뒤 함께 목표를 다시 받음, wipe 뒤 다른 사람 행과 칸이 없음.
- [ ] **2단계: 실패 확인** `npx jest __tests__/restore.test.ts __tests__/connectAccount.test.ts`
- [ ] **3단계: 구현**
- [ ] **4단계: 통과 확인**

### 작업 9: 점검, 확인, 커밋

- [ ] 중복과 쓰지 않는 코드: 이번 변경으로 안 쓰게 된 함수, 형식, 옛 1판 행 모양(`PulledRow` 등)을 지운다. `npx knip`으로 후보를 보고 가져다 쓰는 곳을 확인한 것만.
- [ ] `npm test`(서버 시험 건너뜀), `npm run test:components`, `npm run typecheck`, `npm run lint`
- [ ] 번들: `npx expo export --platform ios --output-dir /tmp/check && rm -rf /tmp/check`
- [ ] 실제 서버(한 파일씩): `syncServer.contract.test.ts`, `syncEndToEnd.test.ts`. `syncEndToEnd`에 「A가 각자 판 함께 목표를 만들고 B가 들어와 붙이면 A의 pullOnce로 B의 칸이 들어온다」를 더한다.
- [ ] 시뮬레이터(iOS 26.5, `qa` 에이전트): 옛 DB가 있는 상태에서 새 빌드를 깔면 첫 화면이 뜬다, 목표 만들기, 붙이기, 위젯과 워치가 그대로 그린다, 로그인 뒤 백업과 복원.
- [ ] 커밋 `feat(sync): sync with server v2 (push, pull, pull_goal)`

## 이 단계에서 하지 않는 것

- 화면(친구 판, 더하기 시트, 설정)과 함께 목표 RPC 호출(create, join, leave 등): 2단계 계획
- 한 판에서 연결이 없을 때의 「연결되면 붙일 수 있어요」: 화면과 위젯 단계(이 단계의 `placeSticker`는 막지 않고, 겹치면 `slot_taken`으로 되돌린다)
- 위젯과 워치의 「n명」, 한 판 바로 붙이기: 위젯 단계

---

## 진행 기록 (2026-11-05 밤)

방식: 작업을 묶음으로 나눠 구현 에이전트에게 맡기고, 묶음마다 새 검토 에이전트가 요구 충족과 품질을 본 뒤 고쳤다. 끝에 `qa`(시뮬레이터), `security`(읽기 전용), 브랜치 전체 검토를 함께 돌리고 한 번에 고쳤다.

| 묶음 | 작업 | 커밋 | 검토에서 고친 것 |
| --- | --- | --- | --- |
| A | 1~3 기기 DB, 목표와 스티커 리포지토리 | `700cfbc`, `d497c82` | 컴포넌트 시험 회귀(expo-crypto), 워치 성장 수가 친구 칸까지 셈 |
| B | 4~6 서버 계약 2판, 올리기, 받아 오기 | `812715c`, `32be156` | 받아 오기가 지운 목표의 보류 항목이 outbox에 남음, 각자 판에서 나갈 때 안 올린 칸이 지워짐 |
| C | 7~8 회차와 30초 주기, 계정 연결과 복원 | `7fab297`, `8bdd7dc` | 다른 기기 사진을 다시 받지 않음, 다른 계정 연결 때 지난 계정 커서와 함께 목표가 남음, 기기 데이터 판단이 함께 목표까지 셈 |
| D | 9 정리, 서버 시험 | `93caa8f` | 안 쓰는 코드 정리, 서버 시험 5개 파일 통과(12, 3, 21, 10, 5) |
| 최종 | 검토 결과 한꺼번에 | `150851c` | 복원 때 친구 칸 날짜를 붙인 날로 셈(체험이 더 열림), 다른 계정 첫 백업에 옛 사진 경로, 계정 전환 중 회차가 다른 계정 기준으로 씀, 같은 SELECT 두 곳, 옛 DB 지우기를 한 트랜잭션으로, 차단한 상대의 owner_id를 기기에 남기지 않음 |

계획과 달라진 점:
- 작업 1~3, 4~6, 7~8을 각각 한 묶음으로 했다. 표를 바꾸면 리포지토리가, 계약을 바꾸면 쓰는 곳이 함께 바뀌어야 시험이 녹색이라서다.
- `requestSync`는 새 파일 없이 기존 `kickSync`를 쓴다(중복 피하기).
- `goals.owner_id`는 나일 때만 `me`, 아니면 null로 둔다(보안 검토). 만든 사람인지는 멤버 역할로 안다.

마지막 확인: `npm test` 783 통과(서버 시험 건너뜀), `test:components` 209 통과, 타입 검사와 린트 오류 0, iOS 번들 성공. 시뮬레이터(iOS 26.5, `qa`) 6개 항목 통과: 새 설치, 혼자 목표 전체, 옛 DB 지우기(user_version 1과 2, deviceId와 끄기 설정 유지), 위젯에서 붙이기, 로그인과 백업과 복원, 30초 주기.

확인 못 한 것: 회차마다 어떤 RPC가 불렸는지(로그에 이름이 없음), 다른 기기에서 바꾼 값 받기와 `pull_goal`을 실제 앱 두 대로 보기, 사진 기록 백업과 복원, 최종 수정(`150851c`) 뒤의 시뮬레이터와 서버 시험.

## 아침에 물을 것

1. **1.0.0이 1.1.0보다 먼저 출시되면** 1.1.0이 옛 DB를 지워 로그인 안 한 사용자 기록이 사라진다(`src/db/client.ts`). 지금은 `docs/RELEASE-1.1.0.md`에 관문 한 줄만 적었다. A(추천) 1.0.0은 승인돼도 수동 출시로 두고 1.1.0으로 바로 바꾼다 / B 지금 옛 구조를 옮기는 단계를 만든다(1~2일) / C 그대로 둔다.
2. **한 판에서 나가거나 내보내지면 서버 저장소에 기록 사진 파일이 남는다**(처리방침 파기 약속과 어긋남). 앱으로는 지울 수 없다. A(추천) 서버에서 기록 행이 지워질 때 사진도 지우는 함수를 새 마이그레이션으로 / B 주기적으로 주인 없는 사진을 지우는 작업 / C 출시 뒤로 미룬다.
3. **마지막 사람이 나가면 서버가 목표를 행째 지워** 같은 계정의 다른 기기에는 신호가 없다. A(추천) 내 멤버 행을 지운 표시로 남겨 `sync_pull`이 보내게 한다(새 마이그레이션) / B 앱이 시작할 때 내 함께 목표 목록을 서버와 맞춘다 / C 한 번에 한 기기 원칙이라 둔다.
4. **차단한 상대가 만든 목표의 owner_id:** 앱은 이제 저장하지 않는다. 서버도 보내지 않게 할지. A 서버 `goal_json`이 차단 관계면 owner_id를 비운다 / B(추천) 앱에서 막았으니 지금은 둔다 / C 화면 단계에서 다시 본다.
5. **개발 서버 `dev@chagok.test`에 오늘 밤 시험 데이터**(목표 2, 스티커 4, 기록 2, 시작 전 0)가 남았다. 다른 세션이 그사이 쓴 것까지 지울까 봐 두었다. A(추천) 두고 HANDOFF에 적는다 / B 오늘 만든 것만 골라 지운다 / C 계정 데이터를 비운다.
6. **완성 확인 창의 [완성하기]와 완성 축하 창의 [계속하기]가 접근성 트리에 안 잡힌다**(`qa`, main과 비교 안 함). A(추천) main에서 같은지 먼저 본다 / B 바로 고친다 / C 둔다.
7. **올리는 도중 계정이 바뀌면** 지난 계정의 변경 한 묶음이 새 계정으로 갈 수 있다(1.0부터 있던 흐름, 받아 오기는 막았다). A(추천) 2단계에서 올리기에도 같은 확인을 넣는다 / B 지금 고친다 / C 둔다.

알려 드릴 것(물을 것 아님):
- `qa`의 로그인 확인 때문에 비어 있던 포트 8081에 이 worktree의 Metro를 잠깐 띄웠다가 껐다. AGENTS.md는 「떠 있는 것을 바꿀 때」 허락을 받으라고 해서 빈 포트는 해당하지 않는다고 판단했다.
- 이 worktree의 `ios/`는 지금 개발 앱용으로 만들어져 있다. 출시용으로 빌드하려면 `npx expo prebuild --clean`부터.
- 처리방침과 스토어 신고에 「친구 이름과 칸을 기기에 저장」 고지가 아직 없다. 약관과 처리방침 2판에 함께 목표 문안을 넣을 때 같이 넣는다(인계 문서 E26).
