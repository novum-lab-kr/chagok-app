# 함께 목표 2단계: 화면 연결 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**목표:** 1단계에서 기기 DB와 2판 동기화로 받아 둔 함께 목표를 화면에 잇는다. 목표 탭 + 시트와 「친구와 함께」 만들기, 판 화면의 각자 판과 한 판, 친구 판 크게, 함께 목표 설정(함께하는 사람, 문제가 있을 때, 차단), 앱 설정 「차단한 사람」, 입력 검사, 혼자 판 4칸(큰 폰 5칸)까지. 초대 받기(링크, 함께하기)와 보여주기는 하지 않는다.

**구조:** 서버 호출은 `src/sync/sharedGoals.ts` 한 곳(이름 있는 함수와 오류 낱말 풀이)에 두고, 화면이 부르는 순서(올리기 먼저, 부른 뒤 다시 받기)는 `src/app-data/sharedGoalActions.ts`에 둔다. 판 화면에 넘길 값은 순수 함수 `src/app-data/sharedBoardView.ts`가 기기 DB 행에서 만든다. 화면은 이미 있는 디자인 시스템 조각(`together-screens.tsx`, `BoardDetailScreen`의 함께 목표 prop)을 그대로 쓰고, 모자란 prop만 더한다(기존 값은 바꾸지 않음).

**기술:** Expo Router(Expo 57), React Native `Share`, `expo-network`(연결 확인), supabase-js RPC와 표 읽기, jest + ts-jest(로직), vitest(컴포넌트), Storybook.

**정본:** `docs/superpowers/specs/2026-11-05-friends-goal-handoff.md`(B7~B16), `docs/superpowers/specs/2026-11-04-friends-goal-dev-design.md` 6~8절, `docs/PRD.md` 4.15(그리고 4.1, 4.2), `stories/TogetherGoal.stories.tsx`(`Screens/함께 목표`), `stories/InputValidation.stories.tsx`, `supabase/migrations/20261105000004_api_v2.sql`(RPC와 오류 낱말), 1단계 계획 `docs/superpowers/plans/2026-11-05-friends-goal-data-sync.md`의 진행 기록.

## 사용자가 정한 것

- 인계 문서 「사용자가 정한 것」 전부(다시 묻지 않는다): 방 없음, 최대 6명(서버 값), 로그인 필요, 친구 판 줄 `[이름][얇은 판 두 줄]` 7칸(큰 폰 8칸), 달력판 두 주, 진행 막대와 숫자와 % 없음, 누가 붙였다는 알림 없음, 초대 링크 `https://chagok.novum-lab.com/invite/<코드>` 기간 없음, 차단은 서로 안 보이고 알리지 않음, 만든 사람이 나가면 가장 먼저 들어온 사람이 이어받음, 내 이름 10자, 혼자 판도 4칸(판 안 폭 330 이상 5칸).
- 함께 목표는 1.1.0에 같이 넣는다(버전 `1.1.0` 그대로).
- 작업 방식(2026-11-05 밤): 「단계별로 계획작성 -> 구현+코드 중복 및 불필요 코드 없는지 체크 -> 테스트 -> 빌드 후 시뮬레이터 테스트 (필요시) -> 수정사항 있나 확인 후 수정 -> 커밋」. 확인할 것은 모아 두었다가 한꺼번에 묻는다. 커밋은 작업 단위마다 바로 한다. 아래 「진행 기록」에 남긴다.
- 이번 단계 범위(리더 결정): B7, B8, B9, B10(「n명이 함께」만), B11, B12, B14, B15, B16, 그리고 목표 탭과 판 화면 포커스의 `requestSync`, 「이미 누가 붙였어요」, 한 판 연결 없음 「연결되면 붙일 수 있어요」, 가려진 칸, `pushOnce`의 계정 확인. 빼는 것은 아래 「이 단계에서 하지 않는 것」.

## 전체 제약

- 한국어로 쓴다. 가운뎃점(U+00B7)을 앱 문구, 주석, 스토리, 문서 어디에도 쓰지 않는다.
- 화면 문구는 사용자 관점(사용자가 할 일과 결과). 문구는 `src/i18n/ko.ts`에 두고 `en.ts`에도 같은 키를 둔다(타입이 키를 맞추게 한다. 영어 문구 다듬기는 F30).
- 디자인 시스템(`src/design-system/`)은 기존 토큰, 프레임, 팔레트 값을 바꾸지 않고 더하기만 한다. `src/design-system`은 `src/domain`을 가져다 쓰지 않는다(린트). 확정 시안 9판에 없는 새 모양은 만들지 않고, 꼭 필요하면 기존 조각을 조립하고 「새 조립」이라고 스토리 설명에 밝힌다.
- 새로 더하는 버튼과 칸에는 한국어 접근성 이름(`accessibilityLabel`)을 단다.
- 서버 변경은 하지 않는다. 꼭 필요하면 새 마이그레이션 파일로만(2026-11-05가 마지막 리셋). 서버 시험은 파일 하나씩 나눠 돌린다(PITFALLS, 5분 30번 한도).
- 커밋은 작업마다 바로 한다(사용자 지시). push는 하지 않는다.
- 기기 안의 나는 `ME = 'me'`, `goals.owner_id`는 나일 때만 `me`이고 남이면 null이다. 만든 사람인지는 멤버 역할(`role = 'owner'`)로 안다.
- 함께 목표 RPC를 부르기 전에는 세션을 확인한다(없으면 로그인 권하기). RPC 뒤에는 아래 표대로 기기 DB를 맞춘다. 화면은 기기 DB만 읽는다.

| RPC | 앞에서 | 뒤에서 |
| --- | --- | --- |
| `create_shared_goal` | 없음 | `refetchGoal(goal_id)`. 실패하면 `requestSync()`(다음 회차가 내 멤버 행을 보고 다시 받음) |
| `update_member`, `update_goal` | 없음 | `refetchGoal(goalId)` |
| `rotate_invite` | 없음 | 없음(초대 코드는 기기에 두지 않는다) |
| `leave_goal` | `pushOnce`(안 올린 내 칸이 새 혼자 목표로 옮겨지게) | `refetchGoal(goalId)`(NotMember라 지워짐), `solo_goal_id`가 있으면 `refetchGoal(solo)` |
| `kick_member` | 없음 | `refetchGoal(goalId)` |
| `block_user` | 없음 | 그 사람이 있는 기기의 함께 목표마다 `refetchGoal`(서버 `pull_goal`이 차단 관계인 사람과 그 판을 빼고 준다) |
| `unblock_user` | 없음 | `requestSync()`(서버가 목표 행 순번을 바꿔 다음 회차가 다시 받는다) |
| `report`, `my_blocks` | 없음 | 없음 |

## 검토할 때 볼 것

1. **각자 판에서 나갈 때 아직 올리지 않은 내 칸**이 새 혼자 목표로 옮겨져 남아야 한다. `leave_goal` 전에 `pushOnce`가 끝나야 하고, 올리기가 실패하면 나가지 않는다(작업 2의 시험).
2. **한 판에서 연결이 없을 때** 기기에 칸을 쓰지 않아야 한다(outbox에도 없음). 연결이 있어 붙였다가 `slot_taken`으로 되돌려지면 「이미 누가 붙였어요」가 한 번만 보이고 칸이 사라진다(작업 1, 7의 시험).
3. **차단한 사람의 한 판 칸**은 이름과 스티커 없이 흐리게 보이고, 눌러도 아무 일이 없으며, 판 칸 수 셈(완성)에는 들어간다. 각자 판에서 차단한 사람의 판은 보이지 않는다(작업 2, 7의 시험).
4. **만든 사람만 할 수 있는 것**(이름과 칸 수, 내보내기, 친구 초대하기, 초대 링크 새로 만들기, 삭제하기)이 함께하는 사람 화면에 보이지 않고, 서버가 `not_owner`를 돌려주면(그사이 만든 사람이 바뀜) 다시 받아 화면이 바뀐다(작업 8의 시험).
5. **혼자 판 4칸(큰 폰 5칸)으로 바꾼 뒤** 튜토리얼 칸 재기(`nextSlotRef`, `recordSlotRef`), 쪽 넘기기, 다음 빈칸 쪽 열기가 그대로 돈다(작업 4의 시험과 시뮬레이터).

---

## 파일 지도

| 파일 | 맡는 일 |
| --- | --- |
| `src/sync/push.ts`, `src/sync/connect.ts` | 올리기에도 계정 확인(`ensureSameAccount`) |
| `src/sync/slotTaken.ts` (새) | 「이미 누가 붙였어요」 알림 통로(`notifySlotTaken`, `subscribeSlotTaken`) |
| `app/_layout.tsx` | `onSlotTaken` 연결(사진 지우기, 알림), 새 화면 등록 |
| `src/app-data/online.ts` (새) | `isOnline()`(expo-network) |
| `src/sync/sharedGoals.ts` (새) | 함께 목표 RPC와 표 읽기, 오류 낱말 풀이, 초대 주소 |
| `src/app-data/sharedGoalActions.ts` (새) | 화면이 부르는 함께 목표 동작(세션 확인, 올리기 먼저, 다시 받기, 공유) |
| `src/app-data/sharedBoardView.ts` (새) | 판 화면에 넘길 친구 판, 사람 줄, 한 판 칸 값 |
| `src/app-data/boardData.ts` | 함께 목표면 멤버와 친구 판 칸도 읽기 |
| `src/repositories/goalRepository.ts` | `GoalSummary.memberCount` |
| `src/repositories/memberRepository.ts` | `listGoalsWith(userId)`(차단 뒤 다시 받을 목표) |
| `src/domain/board.ts` | `SHARED_SLOTS_MAX = 1000`, `SHARED_MAX_MEMBERS = 6`, `parseSlotCount`의 상한 |
| `src/app-data/pocketAdapter.ts` | 카드 「n명이 함께」 |
| `src/design-system/board-screens.tsx` | 혼자 적립판 4/5칸, `TallyBoardView.hidden`(가려진 칸) |
| `src/design-system/together-screens.tsx` | `FriendBoardList.onResend` 선택, `MemberList.onRotate`, `TogetherSettingsScreen.slots`, `BlockPickSheet.title`과 `extraRows`, `BlockedPerson`, `togetherDialogs` 문구 |
| `src/design-system/account-screens.tsx` | `AccountBackupPanel.onBlocked` |
| `src/i18n/ko.ts`, `src/i18n/en.ts` | 새 문구(아래 「새 문구」 표) |
| `app/(tabs)/index.tsx` | + 시트, 로그인 권하기, `requestSync` |
| `app/goal/together.tsx` (새) | 친구와 함께 만들기(모달) |
| `app/goal/[id]/index.tsx` | 판 화면 분기, 친구 판 크게, 누가 언제, 연결 없음, 칸 겹침 |
| `app/goal/[id]/settings.tsx` | 함께 목표 설정 분기 |
| `app/settings/blocked.tsx` (새), `app/(tabs)/settings.tsx` | 차단한 사람 |
| `app/account/connect.tsx` | `from: 'together'`(로그인 뒤 친구와 함께로 돌아오기) |
| `stories/TogetherGoal.stories.tsx`, `stories/InputValidation.stories.tsx`, 판 스토리 | 새 상태 스토리 |
| `stories/flows/app-flow.json`, `stories/flows/appFlow.ts`, `stories/flows/input-flow.json` | 흐름도 |
| `scripts/dev-friend.mjs` (새, 개발 전용) | 두 번째 개발 계정으로 들어가기, 붙이기, 나가기 |
| `docs/PRD.md`, `docs/DESIGN-SYSTEM.md`, `docs/HANDOFF.md` | 4.1, 4.2 칸 수, 4.15 화면, 컴포넌트 표, 남은 일 |

## 새 문구

확정 시안, 스토리, PRD에 이미 있는 문구는 그 키를 쓴다(`together.*`, `invite.*`, `block.*`, `validation.nameNotAllowed`, `validation.stickerTaken`). 아래는 시안에 없어 이번에 더하는 문구다. 인계 문서가 정한 세 문장(「이미 누가 붙였어요」, 「연결되면 붙일 수 있어요」, 「잠시 뒤 다시 해 주세요」) 말고는 **사용자 확인 전**이다(「아침에 물을 것」 4).

| 키 | 문구 | 쓰는 곳 |
| --- | --- | --- |
| `together.loginTitle` | 로그인이 필요해요 | + 시트 [친구와 함께], 로그인 전 |
| `together.loginDescription` | 친구와 함께하려면 로그인해 주세요. 지금 목표와 기록은 그대로예요. | 같음(PRD 4.15 「지금 목표와 기록은 그대로 둔다」) |
| `together.slotTaken` | 이미 누가 붙였어요 | 한 판 칸 겹침(인계 문서 D22) |
| `together.offlineOne` | 연결되면 붙일 수 있어요 | 한 판 연결 없음(인계 문서 A6) |
| `together.tryLater` | 잠시 뒤 다시 해 주세요 | `rate_limited`(인계 문서 B14) |
| `together.placedBy` | `(name) => ${name}님이 붙였어요` | 한 판 친구 칸 누름 |
| `together.placedAt` | `(when) => ${when}에 붙였어요` | 같음, 설명 줄 |
| `together.placeToo` | 나도 붙이기 | 한 판 달력판, 그날 한 장만 있을 때 |
| `together.hiddenCell` | 가려진 칸 | 가려진 칸 접근성 이름 |
| `together.shareMessage` | `(goal, url) => 「${goal}」 같이 채워요\n${url}` | OS 공유 창 본문 |
| `together.leaveTitle` | 이 목표에서 나갈까요? | 나가기 확인(설명은 `leaveHintEach`, `leaveHintOne`) |
| `together.kickTitle` | `(name) => ${name}님을 내보낼까요?` | 내보내기 확인 |
| `together.kickDescription` | `(name) => ${name}님은 이 목표에 다시 들어올 수 없어요. 알리지는 않아요.` | 같음 |
| `together.rotate` | 초대 링크 새로 만들기 | 함께하는 사람 패널(만든 사람) |
| `together.rotateTitle` | 초대 링크를 새로 만들까요? | 확인 |
| `together.rotateDescription` | 지금 링크로는 더 들어올 수 없어요. 새 링크를 보낼 수 있게 공유 창을 열어요. | 같음 |
| `together.goneTitle` | 이 목표를 볼 수 없어요 | `not_member`, `not_shared` |
| `together.goneDescription` | 목표가 지워졌거나 이 목표에서 나왔어요. | 같음 |
| `together.ownerOnly` | 만든 사람만 바꿀 수 있어요 | `not_owner` |
| `report.pickTitle` | 무엇을 신고할까요 | 신고 고르기 시트 |
| `report.goalName` | 목표 이름 | 시트 첫 줄 |
| `report.personName` | `(name) => ${name}님의 이름` | 확인 창 대상 |
| `report.confirmTitle` | `(target) => ${target}을 신고할까요?` | 확인 |
| `report.confirmDescription` | 차곡차곡이 확인하고 필요하면 이름을 지우거나 내보내요. 신고한 것은 다른 사람에게 보이지 않아요. | 같음 |
| `report.confirm` | 신고하기 | 같음 |
| `report.doneTitle` | 신고했어요 | 끝 |
| `validation.slotCountMax` | `(max) => ${max}칸까지 만들 수 있어요.` | 함께 목표 칸 수 1000 넘음 |

앱 설정 줄 이름은 이미 있는 `block.title`(「차단한 사람」)을 쓴다.

---

### 작업 1: 동기화 틈 메우기 (계정 확인, 칸 겹침 알림, 연결 확인)

**파일:**
- 고침: `src/sync/push.ts`, `src/sync/connect.ts`(`syncRound`가 `userId`, `currentUserId`를 올리기에도 넘김), `app/_layout.tsx`(`onSlotTaken`)
- 새로: `src/sync/slotTaken.ts`, `src/app-data/online.ts`
- 시험: `__tests__/push.test.ts`, `__tests__/connect.test.ts`, 새 `__tests__/slotTaken.test.ts`, 새 `__tests__/online.test.ts`

**인터페이스:**
```ts
// push.ts: PushDeps에 더한다
userId?: string; currentUserId?: () => Promise<string | null>;
// 묶음을 서버에 보내기 직전과 거절(rejected)을 기기에 반영하기 직전마다 ensureSameAccount(deps). 다르면 AccountChanged(pull.ts 것)를 던진다.
onSlotTaken?: (stickerId: string, removedPhotoUri: string | null, goalId: string) => void; // 셋째 인자를 더한다(지우기 전에 읽어 둔다)

// slotTaken.ts
export function notifySlotTaken(goalId: string): void;
export function subscribeSlotTaken(fn: (goalId: string) => void): () => void;

// online.ts
export async function isOnline(): Promise<boolean>; // getNetworkStateAsync: isConnected && isInternetReachable !== false, 오류면 false
```
- `_layout.tsx`의 `makeRun`이 넘기는 deps에 `onSlotTaken: (_id, photo, goalId) => { removeManagedRecordPhoto(photo); notifySlotTaken(goalId); }`.

- [ ] **1단계: 시험 쓰기** `push.test.ts`: 「보내기 전에 계정이 바뀌면 서버를 부르지 않고 AccountChanged」, 「보낸 뒤 거절을 반영하기 전에 바뀌면 기기 칸을 지우지 않는다」, 「slot_taken이면 onSlotTaken에 목표 id도 준다」. `connect.test.ts`: 「syncRound는 올리기에도 currentUserId를 넘긴다」. `slotTaken.test.ts`: 구독하면 받고, 해제하면 안 받는다. `online.test.ts`(`jest.mock('expo-network')`): 연결 없음 false, 도달 모름(null) true, 오류면 false.
- [ ] **2단계: 실패 확인** `npx jest __tests__/push.test.ts __tests__/connect.test.ts __tests__/slotTaken.test.ts __tests__/online.test.ts`
- [ ] **3단계: 구현**
- [ ] **4단계: 통과 확인** 같은 명령 + `npm run typecheck`
- [ ] **5단계: 커밋** `fix(sync): check the account before pushing and report taken one-board slots`

### 작업 2: 함께 목표 RPC 모듈과 화면 동작

**파일:**
- 새로: `src/sync/sharedGoals.ts`, `src/app-data/sharedGoalActions.ts`
- 고침: `src/repositories/memberRepository.ts`(`listGoalsWith`), `src/i18n/ko.ts`, `src/i18n/en.ts`(오류 문구 키)
- 시험: 새 `__tests__/sharedGoals.test.ts`, 새 `__tests__/sharedGoalActions.test.ts`, `__tests__/memberRepository.test.ts`

**인터페이스 (`sharedGoals.ts`, 서버 함수 이름과 인자는 api_v2.sql 그대로):**
```ts
export type SharedClient = RpcClient & { from(table: 'member_defaults' | 'invites'): /* select, eq, is, maybeSingle만 쓴다 */ };
export type ErrorWord = 'not_member' | 'not_shared' | 'not_owner' | 'full' | 'closed' | 'sticker_taken'
  | 'name_not_allowed' | 'invalid_name' | 'invalid_sticker' | 'invalid_input' | 'rate_limited' | 'needs_login' | 'network';
export class SharedGoalError extends Error { constructor(readonly word: ErrorWord) }
/** P0001 메시지 낱말, 22023 메시지(invalid_name, invalid_sticker, invalid_input), 42501 → needs_login, 그 밖 → network */
export function errorWordOf(error: { code?: string; message: string }): ErrorWord;
/** 낱말 → 화면 문구. name_not_allowed → validation.nameNotAllowed, sticker_taken → validation.stickerTaken,
 *  rate_limited → together.tryLater, not_member/not_shared → together.goneTitle, not_owner → together.ownerOnly,
 *  network/needs_login → account.checkInternetRetry */
export function errorMessage(word: ErrorWord): string;
export const INVITE_BASE = 'https://chagok.novum-lab.com/invite/';
export const inviteUrl = (code: string) => `${INVITE_BASE}${code}`;

export function createSharedGoal(c: SharedClient, input: { goalId: string; mode: 'each' | 'one'; name: string;
  boardType: 'tally' | 'calendar'; totalSlots: number | null; endDate: string | null; displayName: string; stickerId: string })
  : Promise<{ goalId: string; inviteCode: string }>;                                    // create_shared_goal
export function updateMember(c, goalId: string, displayName: string, stickerId: string): Promise<void>;
export function updateSharedGoal(c, goalId: string, v: { name: string; totalSlots: number | null; endDate: string | null }): Promise<void>;
export function rotateInvite(c, goalId: string): Promise<string>;                       // {invite_code}
export function leaveSharedGoal(c, goalId: string): Promise<{ soloGoalId: string | null }>;
export function kickMember(c, goalId: string, userId: string): Promise<void>;
export function blockUser(c, userId: string): Promise<void>;
export function unblockUser(c, userId: string): Promise<void>;
export function myBlocks(c): Promise<{ userId: string; displayName: string | null; createdAt: number }[]>;
export function reportGoal(c, goalId: string, targetUserId: string | null, reason: 'name'): Promise<void>;
export function readMemberDefaults(c): Promise<{ displayName: string; stickerId: string } | null>; // 표 member_defaults(RLS 내 행만)
export function readInviteCode(c, goalId: string): Promise<string | null>;             // 표 invites, revoked_at is null(RLS 만든 사람만)
```

**인터페이스 (`sharedGoalActions.ts`):**
```ts
export type ActionDeps = { client: SharedClient; userId: string; sync: PushDeps; currentUserId: () => Promise<string | null> };
export async function actionDeps(): Promise<ActionDeps | null>;          // 세션 없으면 null(화면이 로그인 권하기)
export async function createAndFetch(d, input): Promise<{ goalId: string; inviteUrl: string; onDevice: boolean }>;
export async function saveMine(d, goalId, displayName, stickerId): Promise<void>;
export async function saveGoal(d, goalId, v): Promise<void>;
export async function leave(d, goalId): Promise<{ soloGoalId: string | null }>;   // pushOnce → leave_goal → refetch 둘
export async function removeAsOwner(d, goalId): Promise<string[]>;               // leave 뒤 solo가 있으면 deleteGoal(solo), 지운 사진 경로
export async function kick(d, goalId, userId): Promise<void>;
export async function block(d, userId): Promise<void>;                           // 뒤에 listGoalsWith(userId)의 목표마다 refetchGoal
export async function unblock(d, userId): Promise<void>;                         // 뒤에 requestSync()
export async function shareInvite(d, goalId, goalName): Promise<boolean>;        // readInviteCode → Share.share. 코드가 없으면 false
export async function rotateAndShare(d, goalId, goalName): Promise<void>;        // rotate_invite → Share.share
```
- 공유는 React Native `Share.share({ message: t('together.shareMessage', goalName, url) })`. iOS에 `url`을 따로 주지 않는다(메시지 안의 주소를 메신저가 링크로 읽는다). Expo 57 문서에서 문자 공유에 `Share`가 맞는지(`expo-sharing`은 파일 공유) 먼저 확인하고 결과를 진행 기록에 남긴다.
- 실패는 `SharedGoalError`로 던지고 화면이 `errorMessage`로 보인다. 화면에서 RPC를 직접 부르지 않는다.

- [ ] **1단계: 시험 쓰기** `sharedGoals.test.ts`(가짜 rpc): 함수마다 RPC 이름과 인자 이름(`p_mode`, `p_name`, `p_board_type`, `p_total_slots`, `p_end_date`, `p_display_name`, `p_sticker_id`, `p_goal_id`, `p_user_id`, `p_target_user_id`, `p_reason`), 돌려받은 키 바꾸기(`goal_id` → `goalId`, `solo_goal_id` → `soloGoalId`), 「P0001 sticker_taken → SharedGoalError('sticker_taken')」, 「22023 invalid_name → invalid_name」, 「42501 → needs_login」, 「그 밖 → network」, `inviteUrl('K7Q2MXAB')`. `sharedGoalActions.test.ts`(FakeServer 두 사람 + 가짜 rpc): 「leave는 pushOnce가 끝난 뒤 leave_goal을 부르고, 올리기가 실패하면 부르지 않는다」, 「각자 판 leave 뒤 옛 목표는 기기에서 사라지고 새 혼자 목표에 내 칸이 있다」, 「removeAsOwner는 새 혼자 목표를 지우고 outbox에 goal delete를 남긴다」, 「block 뒤 그 사람이 있던 목표에서 그 사람 멤버 행과 판 칸이 없고, 한 판 칸은 가려진 칸(sticker_type null)으로 남는다」, 「createAndFetch가 다시 받기에 실패하면 onDevice false이고 requestSync를 부른다」, 「actionDeps는 세션이 없으면 null」. `memberRepository.test.ts`: 「listGoalsWith는 그 사람이 있는 목표 id만」.
- [ ] **2단계: 실패 확인** `npx jest __tests__/sharedGoals.test.ts __tests__/sharedGoalActions.test.ts __tests__/memberRepository.test.ts`
- [ ] **3단계: 구현**
- [ ] **4단계: 통과 확인** 같은 명령 + `npm run typecheck`
- [ ] **5단계: 커밋** `feat(together): call shared goal RPCs and refresh the device after each`

### 작업 3: 입력 검사 (내 이름 10자, 금칙어, 스티커 겹침, 칸 수 1000)

**파일:** `src/domain/board.ts`, `src/i18n/ko.ts`, `src/i18n/en.ts`, `stories/InputValidation.stories.tsx`, `stories/flows/input-flow.json`. 시험 `__tests__/board.test.ts`.

**인터페이스:**
```ts
export const SHARED_SLOTS_MAX = 1000;  // 서버 private.check_slots와 같은 값
export const SHARED_MAX_MEMBERS = 6;   // 서버 goals.max_members 기본값. 문구 「친구를 n명까지」는 여기서 1을 뺀다
export function parseSlotCount(input: string, current: number, max?: number)
// max를 넘으면 { ok: false, reason: t('validation.slotCountMax', max) }. max가 없으면 지금과 같다(혼자 목표는 상한 없음)
```
- 내 이름 10자와 빈칸은 이미 있는 `memberNameError`, `shownMemberNameError`를 쓴다. 금칙어와 스티커 겹침은 서버 낱말을 작업 2의 `errorMessage`로 그 칸 아래에 보인다(스토리 `MemberNameBanned`, `StickerTaken`과 같은 방식).

- [ ] **1단계: 시험 쓰기** `board.test.ts`: 「max 1000이면 1000은 통과, 1001은 『1000칸까지 만들 수 있어요.』」, 「max가 없으면 5000도 통과」.
- [ ] **2단계: 실패 확인** `npx jest __tests__/board.test.ts`
- [ ] **3단계: 구현** 스토리 `SlotsTogetherMax`(「칸 수, 친구와 함께, 1000칸 넘음」)와 `SlotsTogetherSettingsMax`(「칸 수, 함께 목표 설정, 1000칸 넘음」)를 더하고 `input-flow.json`의 같은 입력칸 줄에 노드 두 개.
- [ ] **4단계: 통과 확인** `npx jest __tests__/board.test.ts`, `npm run typecheck`, Storybook `Rules/입력 검사`와 `Flows/입력 검사`에서 두 상태를 눈으로, README 「확인」 스토리 ID 검사를 `input-flow.json`에.
- [ ] **5단계: 커밋** `feat(together): cap shared tally boards at 1000 slots`

### 작업 4: 혼자 판도 4칸, 판 안 폭 330 이상이면 5칸 (B16)

**파일:** `src/design-system/board-screens.tsx`(`TallyGrid`), `src/design-system/board-shape.ts`(주석), `docs/PRD.md` 4.1, 4.2, 12절, `docs/DESIGN-SYSTEM.md`. 시험 `src/design-system/board-render.test.tsx`, `board-render.perf.test.tsx`, `first-run-tutorial.test.tsx`.

규칙:
- `TallyGrid`의 열 수는 `boardColumns(판 안 폭)`, 칸 한 변은 `boardCellSize(판 안 폭, 열 수, retro.layout.boardGap)`(작은 판 `CompactTally`와 같은 셈). 지금 `stickerCellSize`(3칸, 84:64 비율)를 쓰는 다른 곳은 바꾸지 않는다. 먼저 `grep -rn "StickerGrid\|stickerCellSize" src app stories`로 쓰는 곳을 적는다.
- `tallyPageSize`의 「최소 3줄」은 그대로, 한 줄 칸 수만 열 수를 따른다.
- PRD 4.2 「최소 3줄, 한 줄 3칸」 → 「최소 3줄, 한 줄 4칸(판 안 폭 330 이상이면 5칸)」. 4.1 판 화면에 같은 규칙 한 줄, 12절 변화의 흐름에 「11-05 혼자 판 4칸(이전: 3칸)」. `board-shape.ts` `boardColumns` 주석의 「아직 바꾸지 않음」을 지운다.

- [ ] **1단계: 시험 쓰기** `board-render.test.tsx`: 「390 폭 적립판은 한 줄 4칸」, 「440 폭은 5칸」, 「다음 빈칸이 든 쪽을 연다(4칸 기준)」. 기존 3칸 기대값은 새 규칙으로 고친다.
- [ ] **2단계: 실패 확인** `npm run test:components -- board-render`
- [ ] **3단계: 구현**
- [ ] **4단계: 통과 확인** `npm run test:components`(성능 시험 포함), `npm run typecheck`, `npm run lint`. Storybook 판 화면 적립판 스토리(390, 440 폭, 쪽 넘기기, 튜토리얼)를 렌더해 눈으로 본다.
- [ ] **5단계: 커밋** `feat(board): lay out solo tally boards in four columns (five on wide phones)`

### 작업 5: 목표 탭 (+ 시트, 로그인 권하기, 「n명이 함께」, 포커스 받아 오기)

**파일:**
- 고침: `app/(tabs)/index.tsx`, `app/account/connect.tsx`(`From`에 `'together'`), `src/repositories/goalRepository.ts`, `src/app-data/pocketAdapter.ts`, `src/design-system/together-screens.tsx`(`togetherDialogs.login`), `src/i18n/*`
- 시험: `__tests__/goalRepository.test.ts`, `__tests__/pocketAdapter.test.ts`
- 스토리: `TogetherGoal.stories.tsx`에 `AddSheetLogin`(「더하기 시트 로그인 전」: `AddGoalSheet overlay`에 `PixelDialog` basic)

**인터페이스:**
```ts
// GoalSummary에 더한다
memberCount: number; // viewer 제외(countMembers와 같은 규칙, listGoalSummaries 안에서 GROUP BY 한 쿼리). 혼자 목표는 1
// goalCard: goal.mode !== 'solo'이면 status 앞에 t('together.memberCount', memberCount)(스토리 sharedCard와 같은 순서)
```
흐름:
- [+]는 지금처럼 `canCreateGoal(summaries.length, subscribed)`를 먼저 본다(함께 목표도 목표 수에 든다, 「아침에 물을 것」 9). 통과하면 `AddGoalSheet`를 연다.
- [혼자 채우기] → 시트 닫고 `/goal/new`. [친구와 함께] → `getSupabase()`가 없거나 세션이 없으면 시트 위 `overlay`로 확인 창(`together.loginTitle`, `together.loginDescription`, [로그인] [닫기]). [로그인] → `/account/connect?from=together`. 세션이 있으면 `/goal/together`.
- `connect.tsx`: `from === 'together'`이면 연결이 끝난 뒤(복원 충돌 화면을 거쳐도 끝에서) `router.replace('/goal/together')`. 취소하면 그냥 뒤로.
- 목표 탭 `useFocusEffect`에서 `requestSync()`(로그인해 있을 때만 회차가 돈다). 회차가 기기를 바꾸면 `subscribeLocalChange`로 목록을 다시 읽는다(지금 위젯 반영과 같은 자리).

- [ ] **1단계: 시험 쓰기** `goalRepository.test.ts`: 「listGoalSummaries의 memberCount는 viewer를 빼고 센다, 혼자 목표는 1」. `pocketAdapter.test.ts`: 「함께 목표 카드 status 첫 줄은 『3명이 함께』」, 「혼자 목표 카드는 그대로」.
- [ ] **2단계: 실패 확인** `npx jest __tests__/goalRepository.test.ts __tests__/pocketAdapter.test.ts`
- [ ] **3단계: 구현**
- [ ] **4단계: 통과 확인** 같은 명령, `npm run typecheck`, `npm run lint`, 번들 export, Storybook `더하기 시트`, `더하기 시트 로그인 전`을 눈으로.
- [ ] **5단계: 흐름도** `app-flow.json`: `together-sheet` 노드 stories에 `screens-함께-목표--add-sheet-login`, 화살표 `together-sheet` → 계정 연결 노드(「로그인」, 시나리오 `together`), 계정 연결 → `together-new`(「로그인 끝」).
- [ ] **6단계: 커밋** `feat(together): open the add sheet, ask to sign in, and show member counts on cards`

### 작업 6: 친구와 함께 만들기 (`app/goal/together.tsx`)

**파일:** 새 `app/goal/together.tsx`, `app/_layout.tsx`(`<Stack.Screen name="goal/together" options={{ presentation: 'modal' }} />`). 로직 시험은 작업 2의 `createAndFetch`. 스토리는 이미 있다(`친구와 함께 각자 판에`, `친구와 함께 한 판에 같이`).

화면이 넘기는 값(`TogetherGoalScreen` props, 스토리 `TogetherForm`과 같음):
- `mode` 기본 `each`. 목표 이름은 `shownGoalNameError`, `nameMaxLength={GOAL_NAME_MAX}`. 판 종류와 칸 수(기본 `15`, 새 목표와 같음), 종료일은 새 목표와 같은 `end` 값. 칸 수 검사는 `parseSlotCount(count, 1, SHARED_SLOTS_MAX)`.
- `myName`은 `readMemberDefaults()`의 이름 또는 빈칸, `sticker`는 그 스티커 또는 `DEFAULT_COLOR_STICKER`. 기본값을 못 읽어도(오프라인) 빈칸으로 연다. 내 이름 검사는 `shownMemberNameError`, `myNameMaxLength={MEMBER_NAME_MAX}`.
- `maxFriends={SHARED_MAX_MEMBERS - 1}`.
- 내 스티커: `/stickers/choose?current=...` → `takeOfferedSticker()`(새 목표와 같음).
- 저장하지 않은 입력이 있으면 `useUnsavedBack`.

[만들고 초대하기]:
1. 목표 수 한도를 다시 본다(`new.tsx`와 같은 이유: 링크로 바로 열어도 한도를 지킨다).
2. `actionDeps()`가 null이면 로그인 권하기 창(작업 5와 같은 문구).
3. `createAndFetch({ goalId: newId(), ... })`. 실패 낱말에 따라: `name_not_allowed`는 목표 이름과 내 이름 두 칸 아래 모두 「다른 이름을 써 주세요.」(어느 이름인지 서버가 가르지 않는다, 「아침에 물을 것」 5), `invalid_input`은 칸 수 칸, `network`와 `needs_login`은 `saveOrNotify` 실패 창(`failed.createGoal`). 화면은 그대로 두어 입력을 잃지 않는다.
4. 성공하면 OS 공유 창. 공유를 닫거나 취소해도 다음으로 간다.
5. `onDevice`면 `router.replace('/goal/[id]')`, 아니면 `router.dismissTo('/')`(다음 회차가 받아 오면 목록에 생긴다).

- [ ] **1단계: 구현** 위 흐름. 화면 코드에 로직을 두지 않고 `sharedGoalActions`를 부른다.
- [ ] **2단계: 확인** `npm run typecheck`, `npm run lint`, `npx jest __tests__/sharedGoalActions.test.ts`, 번들 `npx expo export --platform ios --output-dir /tmp/check && rm -rf /tmp/check`. 시뮬레이터 확인은 작업 11의 qa 항목 3에 모은다.
- [ ] **3단계: 흐름도** `together-new` 노드 태그 `app/goal/together` 확인, 화살표 `together-new` → `share-sheet` → `together-board`가 있는지 확인(지금 있음).
- [ ] **4단계: 커밋** `feat(together): create a shared goal and open the share sheet`

### 작업 7: 판 화면 (각자 판, 한 판, 친구 판 크게)

**파일:**
- 새로: `src/app-data/sharedBoardView.ts`
- 고침: `src/app-data/boardData.ts`, `app/goal/[id]/index.tsx`, `src/design-system/board-screens.tsx`(`TallyBoardView.hidden`), `src/design-system/together-screens.tsx`(`FriendBoardList.onResend` 선택: 없으면 버튼을 그리지 않음, `togetherDialogs`)
- 시험: 새 `__tests__/sharedBoardView.test.ts`, `__tests__/boardData.test.ts`, `src/design-system/together-screens.test.tsx`, `src/design-system/board-render.test.tsx`
- 스토리: `TogetherGoal.stories.tsx`에 `OneBoardHidden`(「한 판에 같이 가려진 칸」), `OneBoardPlacedBy`(「한 판 누가 언제」), `SlotTakenDialog`(「한 판 이미 누가 붙였어요」), `OneBoardOffline`(「한 판 연결 없을 때」), `SharedWaitingMember`(「각자 판 친구를 기다릴 때 만든 사람 아님」)

**인터페이스:**
```ts
// boardData.ts: BoardData에 더한다(혼자 목표는 members [], friendStickers {})
members: GoalMember[];                       // listMembers, viewer 제외, 들어온 순서
friendStickers: Record<string, Sticker[]>;   // 각자 판만: 친구 userId → listBoardStickers(goalId, userId)

// sharedBoardView.ts (순수 함수, 날짜는 localDateKey)
export function friendBoardsOf(goal: Goal, members: GoalMember[], friendStickers: Record<string, Sticker[]>, today: string): FriendBoardItem[];
//   나 빼고. tally: { total, filled: slotIndex+1 집합 }, calendar: { today, start: localDateKey(joinedAt), dates: dateKey 집합 }
export function memberBadgesOf(members: GoalMember[]): MemberBadge[];   // 나는 me: true
export function oneBoardCells(goal: Goal, stickers: Sticker[], members: GoalMember[]): {
  filled: Record<number, StickerId>; hidden: Set<number>;
  placedBy: Record<number, { name: string; at: number }>;  // 친구 칸만. 내 칸과 가려진 칸은 없다
};
export function oneBoardDay(stickers: Sticker[], members: GoalMember[], date: string): { people: { name: string; at: number; me: boolean }[]; canPlaceToo: boolean };

// board-screens.tsx: TallyBoardView에 더한다
hidden?: ReadonlySet<number>; // 이름 없는 흐린 칸: 붙은 칸 바탕에 스티커 없이 투명도 0.4, 누를 수 없음, 접근성 이름 together.hiddenCell
```
분기(`goal.mode`):
- `solo`: 지금 화면 그대로(넘기는 prop이 같아야 한다).
- `each`: `BoardDetailScreen title={goal.name} name={t('together.myBoard')} hideProgress boardRows={2} below={<FriendBoardList friends onOpen onResend?/>}`. 내 판 붙이기, 떼기, 기록은 지금 코드 그대로. `onResend`는 내가 만든 사람일 때만 `shareInvite`(초대 코드는 만든 사람만 읽는다). 줄을 누르면 `FriendBoardModal`.
- `one`: `name={t('together.ourBoard')} hideProgress boardRows={4} members={<MemberBadgeRow/>} below={<Note>{t('together.oneBoardNote')}</Note>}`(스토리 `OneBoard`와 같음). 칸 값은 `oneBoardCells`. 빈칸 누름: `isOnline()`이 false면 `together.offlineOne` 창을 띄우고 붙이지 않는다. true면 지금 `place` 그대로 붙이고 바로 `requestSync()`. 친구 칸 한 번 누름(`onOpenRecord`): `together.placedBy`, `together.placedAt`(시각은 `longDate` + 시분) 창. 친구 칸 꾹(떼기): 아무것도 하지 않는다. 가려진 칸은 누를 수 없다.
- 한 판 달력판: 날마다 먼저 붙인 한 장을 그리고, 친구가 붙인 날을 누르면 그날 붙인 사람을 모두 보인다. 내가 아직 안 붙였고 그날 두 장 미만이면 그 창에 [나도 붙이기](연결 확인을 같이 한다)(「아침에 물을 것」 1의 추천안 A).
- 공통: `useFocusEffect`에서 `requestSync()`, 함께 목표면 `subscribeLocalChange`로 다시 읽기, `subscribeSlotTaken`으로 지금 목표면 `together.slotTaken` 창(같은 회차에 여러 칸이어도 한 번).
- 완성 흐름은 지금 규칙 그대로(내 멤버 행 기준. 한 판은 판 전체 칸으로 센다, 가려진 칸 포함).

- [ ] **1단계: 시험 쓰기** `sharedBoardView.test.ts`: 「친구 판에 나는 없고 들어온 순서」, 「적립판 filled는 칸 번호(1부터)」, 「달력판 start는 들어온 날」, 「가려진 칸은 hidden이고 filled에 없다」, 「내 칸은 placedBy에 없다」, 「친구 칸 placedBy는 이름과 시각」, 「oneBoardDay는 그날 두 장이면 canPlaceToo false, 내가 붙였으면 false」. `boardData.test.ts`: 「각자 판은 친구마다 그 사람 판 칸만」, 「혼자 목표 members는 빈 배열」. `together-screens.test.tsx`: 「onResend가 없으면 [링크 다시 보내기]가 없다」. `board-render.test.tsx`: 「hidden 칸은 누를 수 없고 『가려진 칸』으로 읽힌다」, 「hidden이 없으면 지금과 같다」.
- [ ] **2단계: 실패 확인** `npx jest __tests__/sharedBoardView.test.ts __tests__/boardData.test.ts`, `npm run test:components -- together-screens board-render`
- [ ] **3단계: 구현** 분기 값 만들기는 `sharedBoardView.ts`에 둔다. 라우트 파일에 계산을 두지 않는다.
- [ ] **4단계: 통과 확인** 같은 명령, `npm run typecheck`, `npm run lint`, 번들 export. Storybook 새 스토리 다섯 개와 기존 `각자 판 390 폭`, `440 폭`, `달력판 두 주`, `한 판에 같이`를 렌더해 눈으로.
- [ ] **5단계: 흐름도** `together-board`, `one-board`, `friend-board` 노드 stories에 새 스토리. 화살표 `together-board` → `share-sheet`(「링크 다시 보내기」).
- [ ] **6단계: 커밋** `feat(together): show friend boards, the shared board, and who placed each cell`

### 작업 8: 함께 목표 설정 (함께하는 사람, 문제가 있을 때, 차단 고르기)

**파일:**
- 고침: `app/goal/[id]/settings.tsx`(함께 목표면 같은 파일 안 `TogetherSettings` 함수 컴포넌트로 분기), `src/design-system/together-screens.tsx`, `src/i18n/*`
- 시험: `src/design-system/together-screens.test.tsx`, `__tests__/sharedGoalActions.test.ts`(작업 2에 더함)
- 스토리: `TogetherGoal.stories.tsx`에 `SettingsOwnerSlots`(「목표 설정 만든 사람 칸 수」), `LeaveConfirm`(「나가기 확인」), `KickConfirm`(「내보내기 확인」), `RotateConfirm`(「초대 링크 새로 만들기 확인」), `ReportSheet`(「신고 무엇을 신고할까요」), `ReportConfirm`(「신고 확인」), `GoneDialog`(「볼 수 없는 목표」)

**디자인 시스템에 더하는 것 (기존 값 그대로, 선택 prop만):**
```ts
MemberList: onRotate?: () => void;   // [친구 초대하기] 아래 같은 secondary 버튼 together.rotate. 만든 사람만 넘긴다(새 조립)
TogetherSettingsScreen: slots?: { current: number; value: string; onChange: (v: string) => void; error?: string };
//   만든 사람의 적립판만. GoalSettingsScreen의 slots와 같은 조립(SlotCountPicker min=current + goal.slotsNow)
BlockPickSheet: title?: string; extraRows?: readonly { id: string; label: string }[]; // 신고 시트가 「목표 이름」 줄을 사람 위에 둔다(새 조립)
togetherDialogs: login, leave(mode), kick(name), rotate, report(targetLabel), reportDone, gone, ownerOnly, slotTaken, offlineOne, placedBy(name, when)
```
화면 동작:
- 만든 사람은 목표 이름 칸(`goalNameError`)과 칸 수(`parseSlotCount(v, current, SHARED_SLOTS_MAX)`, 늘리기만). 함께하는 사람은 「목표 이름과 칸 수는 만든 사람(…)이 바꿔요」(`ownerName` = role owner인 멤버 이름).
- 내 이름과 스티커(`shownMemberNameError`, `/stickers/choose`).
- [저장]: 내 값이 바뀌었으면 `saveMine`, 만든 사람이고 목표 값이 바뀌었으면 `saveGoal`(종료일은 지금 값 그대로). 둘 다 성공하면 뒤로. 실패 낱말은 그 칸 아래(`name_not_allowed`, `sticker_taken`, `invalid_input`). `not_owner`는 `ownerOnly` 창 뒤 다시 읽기(만든 사람이 바뀌었다). `not_member`, `not_shared`는 `gone` 창 뒤 `refetchGoal`(기기에서 지워짐)과 `router.dismissTo('/')`.
- 함께하는 사람 `MemberList members max={SHARED_MAX_MEMBERS}`: 만든 사람이면 `onKick`(→ 확인 → `kick`), `onInvite`(→ `shareInvite`), `onRotate`(→ 확인 → `rotateAndShare`).
- 문제가 있을 때:
  - [불쾌한 이름 신고하기] → `BlockPickSheet title={t('report.pickTitle')} extraRows={[{ id: 'goal', label: t('report.goalName') }]} people={나 빼고}` → 확인(시트 `overlay`) → `reportGoal(goalId, 사람 id 또는 null, 'name')` → `reportDone`.
  - [사람 차단하기] → `BlockPickSheet people={나 빼고}` → `togetherDialogs.blockConfirm(name)`(시트 `overlay`, PITFALLS 「Modal 옆 Modal」) → `block`. 나 말고 아무도 없으면 시트에 [닫기]만 보인다(새 문구 없이).
  - [이 목표에서 나가기] → `leave(mode)` 확인 → `leave` → `router.dismissTo('/')`(각자 판이면 새 혼자 목표가 목록에 있다).
- 만든 사람 [삭제하기]: 확인 창 제목은 `boardDialogs.deleteGoal`과 같게, 설명은 `together.deleteOwner` → `removeAsOwner` → 지운 사진 파일 지우기 → `router.dismissTo('/')`.
- 완성한 함께 목표도 `CompletedGoalSettingsScreen`이 아니라 같은 `TogetherSettings`를 쓴다(나가기와 신고가 있어야 한다). 이름과 칸 수 칸만 숨긴다.

- [ ] **1단계: 시험 쓰기** `together-screens.test.tsx`: 「onRotate가 있으면 『초대 링크 새로 만들기』가 있고 누르면 부른다」, 「slots가 있으면 칸 수 칸, 없으면 없다」, 「BlockPickSheet extraRows가 사람보다 위에 있고 title을 바꾼다」, 「함께하는 사람(role member) 화면에는 이름 칸과 삭제하기가 없다」. `sharedGoalActions.test.ts`: 「saveGoal은 update_goal에 지금 종료일을 그대로 보낸다」, 「kick 뒤 그 사람 행이 없다」, 「not_owner면 SharedGoalError('not_owner')이고 refetchGoal을 부른다」.
- [ ] **2단계: 실패 확인** `npm run test:components -- together-screens`, `npx jest __tests__/sharedGoalActions.test.ts`
- [ ] **3단계: 구현**
- [ ] **4단계: 통과 확인** 같은 명령, `npm run typecheck`, `npm run lint`, 번들 export. Storybook 새 스토리 일곱 개와 `목표 설정 만든 사람`, `목표 설정 함께하는 사람`, `차단 누구를 차단할까요`, `차단 확인`을 렌더해 눈으로(시트 위 확인 창이 시트 안에 뜨는지).
- [ ] **5단계: 흐름도** `together-settings` 노드 stories에 새 스토리, 새 노드 `report-pick`(「신고 고르기」, 태그 `PRD 4.15`, `app/goal/[id]/settings`, `appFlow.ts` 줄 6 `block-pick` 옆 칸, 뒤 칸은 민다), 화살표 `together-settings` → `report-pick`(「신고하기」), `together-settings` → `share-sheet`(「친구 초대하기」), `together-settings` → 목표 탭 노드(「나가기」).
- [ ] **6단계: 커밋** `feat(together): manage members, report, block, and leave from goal settings`

### 작업 9: 앱 설정 「차단한 사람」 (`app/settings/blocked.tsx`)

**파일:** 새 `app/settings/blocked.tsx`, `app/_layout.tsx`(`<Stack.Screen name="settings/blocked" />`), `app/(tabs)/settings.tsx`, `src/design-system/account-screens.tsx`(`AccountBackupPanel`에 `onBlocked?`: 로그인해 있을 때 패널 맨 아래 `SettingRow` `block.title`), `src/design-system/together-screens.tsx`(`BlockedPerson`). 시험 `src/design-system/account-screens.test.tsx`, `together-screens.test.tsx`.

- `BlockedPeopleScreen`은 `myBlocks()` 순서(최근 차단 먼저)와 이름을 보인다. 서버가 스티커와 목표 이름을 주지 않으므로 `BlockedPerson`의 `sticker`, `goalName`을 선택으로 바꾸고, 없으면 스티커 자리와 「…에서 차단」 줄을 그리지 않는다(「아침에 물을 것」 2. B로 정해지면 새 마이그레이션 작업을 따로 더해 채운다). 이름이 null이면 이름 줄을 비워 두고 [풀기] 접근성 이름은 `block.unblock`만 쓴다(이름을 지어내지 않는다).
- [풀기] → `unblock` → 목록 다시 읽기. 실패하면 `account.checkInternetRetry` 창. 목록을 못 읽으면 `LoadingScreen failed`와 [다시 시도].
- 세션이 없으면 줄이 보이지 않는다(차단은 로그인한 사람만).

- [ ] **1단계: 시험 쓰기** `account-screens.test.tsx`: 「onBlocked가 있으면 『차단한 사람』 줄, 없으면 없다」. `together-screens.test.tsx`: 「sticker와 goalName이 없어도 이름과 [풀기]가 보인다」, 「[풀기] 접근성 이름은 『지우님 차단 풀기』」.
- [ ] **2단계: 실패 확인** `npm run test:components -- account-screens together-screens`
- [ ] **3단계: 구현**
- [ ] **4단계: 통과 확인** 같은 명령, `npm run typecheck`, `npm run lint`, 번들 export, Storybook `차단한 사람`, `차단한 사람 없음`, 새 `BlockedPeopleNameOnly`(「차단한 사람 이름만」), 계정 패널 스토리에 `onBlocked`를 넣은 상태를 눈으로.
- [ ] **5단계: 흐름도** `blocked` 노드 태그 `app/settings/blocked` 확인, 화살표 앱 설정 노드 → `blocked`(「차단한 사람」, 시나리오 `together`).
- [ ] **6단계: 커밋** `feat(together): list blocked people in settings and unblock them`

### 작업 10: 문서 맞추기

**파일:** `docs/PRD.md` 4.15(실제 동작: 로그인 권하기, 친구 칸 누름, 한 판 연결 없음, 칸 겹침 안내, 신고 고르기, 초대 링크 새로 만들기), 5절 데이터 표(함께 목표와 함께하는 사람이 기기에도 캐시된다), 12절 변화의 흐름, `docs/DESIGN-SYSTEM.md` 컴포넌트 표(더한 prop), `docs/HANDOFF.md`(이번 단계에서 끝난 B 항목과 남은 일).

- [ ] **1단계: 고치기** PRD 절 번호는 바꾸지 않는다. 새로 쓴 줄에 가운뎃점이 없는지 `git diff | grep "^+" | grep -c "$(printf '\302\267')"`로 본다(0이어야 한다).
- [ ] **2단계: 커밋** `docs(together): describe the wired screens in the PRD and design system`

### 작업 11: 마무리 확인, 두 계정 시험 도구, qa와 security 목록

**파일:** 새 `scripts/dev-friend.mjs`(개발 전용, 앱 번들에 들어가지 않음), `package.json` 스크립트 `"server:dev-friend": "node scripts/dev-friend.mjs"`.

**두 번째 계정 (초대 링크 없이 두 사람 흐름 만들기):**
- 링크와 함께하기 화면은 다음 단계라, 두 번째 사람은 스크립트가 맡는다. `dev-user.mjs`와 같은 환경(`.secrets/server-test.env`의 주소와 service 키)을 읽고, 계정 `dev2@chagok.test`(없으면 service 키로 만든다. 비밀번호는 `.env.local`의 `EXPO_PUBLIC_DEV2_PASSWORD`, 저장소에 넣지 않는다)로 **로그인한 클라이언트**가 공개 RPC만 부른다(service 키로 표를 직접 고치지 않는다. 앱과 같은 규칙을 지나게).
- 명령: `join <코드> <이름> <스티커>`(`join_goal`, 실패면 `{error}` 출력), `place <goalId> <칸 번호|YYYY-MM-DD>`(`sync_push` sticker 한 줄), `rename <goalId> <이름>`(`update_member`), `leave <goalId>`, `block <userId>`, `unblock <userId>`, `show <goalId>`(`pull_goal` 요약: 멤버 이름과 user id, 칸), `cleanup`(dev2가 든 함께 목표에서 나가기, 차단 풀기).
- 사용자 A는 시뮬레이터 iOS 26.5의 개발 계정(`dev@chagok.test`). 초대 코드는 A의 공유 창 본문(시뮬레이터 클립보드 `xcrun simctl pbpaste <UDID>`)으로 읽는다.
- 원하면 iOS 18.3 시뮬레이터에 dev2로 로그인해 두 화면을 나란히 볼 수 있다(들어가기만 스크립트로).

- [ ] **1단계: 중복과 쓰지 않는 코드** 이번 변경으로 안 쓰게 된 것을 지운다. `npx knip` 후보는 쓰는 곳을 직접 확인한 것만. 화면 파일과 `sharedGoalActions`에 같은 호출 순서가 두 벌 있지 않은지 본다.
- [ ] **2단계: 전체 확인** `npm test`(서버 시험 건너뜀), `npm run test:components`, `npm run typecheck`, `npm run lint`, `npx expo export --platform ios --output-dir /tmp/check && rm -rf /tmp/check`. 서버는 바꾸지 않았으니 `syncEndToEnd.test.ts` 한 파일만(함께 목표 흐름 회귀).
- [ ] **3단계: Storybook 흐름도** `Flows/앱 전체` `together` 시나리오를 눈으로 보고, README 「확인」 스토리 ID 검사를 `app-flow.json`과 `input-flow.json`에 돌린다. 이미 떠 있는 Storybook은 끄지 않는다.
- [ ] **4단계: `qa` 에이전트**(iOS 26.5 기본, 18.3 비교. 넘길 것: 이 목록, 개발 계정 상태와 원래 값, 결과를 둘 스크래치 폴더, 8081 사용 여부. 누르면 안 되는 것: 계정 삭제, 「이 기기 기록 사용하기」. 로그아웃은 마지막 항목에서만)
  1. 혼자 판: 새 적립판 15칸이 한 줄 4칸(판 안 폭 330 이상인 큰 폰은 5칸), 쪽 넘기기, 튜토리얼 다시 보기의 칸 가리키기.
  2. 목표 탭 [+] → 시트 → [혼자 채우기]가 새 목표를 연다.
  3. [친구와 함께]: 각자 판 적립판 30칸, 내 이름 기본값(처음이면 빈칸), [만들고 초대하기] → 공유 창 본문에 `https://chagok.novum-lab.com/invite/` 주소 → 닫으면 판 화면, 「친구를 기다리고 있어요」와 [링크 다시 보내기](다시 공유 창).
  4. 목표 탭 카드 「1명이 함께」. `dev-friend join` 뒤 목표 탭으로 돌아오면(포커스 받아 오기) 「2명이 함께」.
  5. 판 화면: dev2 줄, `dev-friend place` 두 칸 뒤 판 화면에 다시 들어오면 친구 줄에 그 칸, 줄을 누르면 친구 판 크게, 칸 수와 %가 어디에도 없음.
  6. 한 판 적립판: 만들고 dev2 join, dev2가 3번 칸, A의 판에 3번 칸이 dev2 스티커로, 누르면 「…님이 붙였어요」와 시각, 사람 줄에 「나」. 같은 칸 겹침(「이미 누가 붙였어요」)은 받아 오기 전에 A가 같은 칸을 눌러야 해서 재현이 어렵다. 안 되면 「확인 못 함」(jest로 확인).
  7. 한 판 달력판: dev2가 오늘 붙인 뒤 A가 오늘을 누르면 dev2 이름과 [나도 붙이기], 붙이면 두 장, 세 번째 사람이 없으니 상한은 jest로만.
  8. 목표 설정(A 만든 사람): 목표 이름 바꾸기, 칸 수 1001 입력 시 「1000칸까지 만들 수 있어요.」, 내 이름 10자 넘게 못 씀, 내 스티커를 dev2 스티커로 바꾸면 「이 목표에서 이미 누가 쓰는 스티커예요.」, [초대 링크 새로 만들기] 뒤 옛 코드로 `dev-friend join`이 `closed`.
  9. 내보내기: A가 dev2를 내보내면 A의 사람 목록에서 사라지고 `dev-friend show`가 not_member.
  10. 차단: 한 판에서 dev2가 붙인 뒤 A가 dev2 차단 → dev2 칸이 이름 없는 흐린 칸, 앱 설정 「차단한 사람」에 dev2, [풀기] 뒤 목록에서 사라짐.
  11. 함께하는 사람 쪽 화면(이름 칸 없음, 삭제하기 없음): iOS 18.3 시뮬레이터를 dev2로 로그인해 볼 수 있으면 보고, 아니면 「확인 못 함」.
  12. 나가기: 각자 판에서 A가 나가면 A 목표 탭에 같은 이름의 혼자 목표, 붙인 칸이 그대로.
  13. 만든 사람 삭제하기: 판과 기록이 지워지고 목록에서 사라짐, `dev-friend show`에 목표가 남고 dev2가 만든 사람.
  14. 신고: 목표 이름 신고 → 「신고했어요」(서버 `reports` 줄은 메인이 지운다).
  15. 로그인 전 [친구와 함께] → 「로그인이 필요해요」 → [로그인] 끝나면 친구와 함께 화면. 로그아웃이 기기를 비우므로 맨 마지막에.
  - 오프라인(한 판 「연결되면 붙일 수 있어요」)은 iOS 시뮬레이터에서 볼 수 없다(PITFALLS). jest로만 확인했다고 적고, 가능하면 Android `Chagok_Pixel_7` 비행기 모드로 한 번.
  - 끝나면 `dev-friend cleanup`, A의 시험 목표 지우기, 서버 `reports`의 시험 줄 지우기(메인이 `supabase-dev` 스킬로).
- [ ] **5단계: `security` 에이전트**(qa와 동시에, 바뀐 파일 목록과 요약을 넘긴다)
  1. 공유 본문과 로그에 사용자 id, 토큰이 없는지. 초대 주소 말고 목표 id가 밖으로 나가지 않는지.
  2. `invites`, `member_defaults` 표 읽기가 RLS(만든 사람만, 내 행만)에 기대는지, 앱이 다른 사람 코드를 읽으려 하지 않는지.
  3. 신고 사유가 고정 낱말(`name`)이고 사용자 입력을 서버에 보내지 않는지.
  4. 차단 목록, 친구 이름, 칸이 로그아웃과 계정 삭제 때 지워지는지(1단계 wipe가 `goal_members`를 비움, 이번에 기기에 새로 둔 값이 없는지).
  5. `pushOnce` 계정 확인이 지난 계정의 변경을 새 계정으로 보내지 않는지.
  6. `scripts/dev-friend.mjs`가 앱 번들에 들어가지 않고, service 키와 비밀번호가 저장소에 없는지.
  7. 이벤트 기록(PostHog)과 오류 보고(Sentry)에 이름, 초대 코드가 담기지 않는지(이번에 새 이벤트를 더하지 않는다).
- [ ] **6단계: 고치기와 커밋** 두 에이전트 결과를 모아 고칠 것을 고치고 `fix(together): address qa and security review findings`. 진행 기록과 「아침에 물을 것」을 채우고 `docs(plan): record how the screens stage went and what to ask`.

## 이 단계에서 하지 않는 것

- 보여주기(B13): 서버 RPC가 없다. 카드 「보기만」, 보여주기 받은 판, [보여줄 친구 초대하기]는 다음 단계.
- 초대 링크와 함께하기(C17~C20): `app/invite/[code].tsx`, 연결 도메인, `preview_invite`, `join_goal` 화면, 초대 문제 화면(자리가 다 찼어요, 들어갈 수 없어요). 이번에는 공유할 주소만 만든다. 그래서 `full`, `closed`, `rate_limited`는 낱말 풀이와 문구 키만 넣고 화면에서 쓰는 곳은 없다.
- 위젯과 워치(D): 「n명」, 한 판 위젯과 워치에서 바로 붙이기. 지금 위젯은 한 판 목표에도 1단계 동작 그대로 붙이고 겹치면 `slot_taken`으로 되돌린다.
- 운영과 정책(E): 신고 알림 메일, 금칙어 목록, 약관과 처리방침 3판, 스토어 신고, 이벤트 기록.
- 영어 문구 다듬기와 새 화면 밖의 화면 낭독 이름(F30). `en.ts`에는 키만 맞춘 임시 영어를 둔다.
- 서버 변경. 「아침에 물을 것」 2, 5의 B가 정해지면 그때 새 마이그레이션 작업을 더한다.

---

## 진행 기록

밤사이 진행 결정(2026-11-05, 사용자가 자는 동안 컨트롤러가 정함. 아침에 아래 질문으로 확인받는다): 「아침에 물을 것」 1, 3~10은 추천안 A대로 구현한다. 2는 추천안 B가 서버 변경이라 오늘 밤은 C(이름만 보이기)로 두고 아침에 묻는다. 시안에 없는 조립과 새 문구는 실제 캡처를 아침에 보여 드리고 고친다.

방식: 작업을 묶음으로 나눠 구현 에이전트에게 맡기고, 묶음마다 새 검토 에이전트가 요구 충족과 품질을 본 뒤 고쳤다. 작업끼리 같은 파일과 인터페이스를 나눠 써서 묶음마다 녹색 커밋을 냈다.

| 묶음 | 작업 | 커밋 | 검토에서 고친 것 |
| --- | --- | --- | --- |
| P | 1~3 동기화 틈, RPC 모듈과 동작, 입력 검사 | `d25ddb1`, `cb7b781` | 나가기와 내보내기에서 날것 오류가 새던 것, `onSlotTaken`에 목표 id 없음, `syncDepsFor` 시험 |
| Q | 4~6 목표 탭 시트, 친구와 함께 만들기, 4칸 판 | `6aa4d87`, `aed1da6` | 혼자 판과 작은 판이 판 안 폭을 달리 재서 430pt에서 열 수가 다름(열 수를 같은 규칙으로), 만드는 동안 뒤로가기가 막히지 않음 |
| R | 7 판 화면(각자 판, 한 판, 친구 판 크게) | `3a5a8fe`, `852b8c5` | 친구가 먼저 붙인 날의 내 칸을 못 떼던 것, 가려진 칸만 있는 날이 막히던 것, 판 단위 시험, 한 판 달력판 완성을 칸 수가 아니라 칸이 있는 날 수로 |
| S | 8~9 함께 목표 설정, 차단한 사람, 신고 | `14a6ee6`, `a28765c` | 만든 사람을 차단해 이름이 없을 때 안내가 비던 것, 칸 수 칸이 1000을 못 치던 것(`SlotCountPicker.max`) |
| T | 10~11 문서, 두 번째 개발 계정 도구, `together.tsx` StrictMode 이중 마운트 | 이 커밋 | 마운트 표시를 효과 본문에서 true로 둠 |

계획과 달라진 점:
- 공유는 React Native 핵심 `Share`를 썼다(Expo 버전이 없는 API라 Expo 57 문서와 어긋날 일이 없다). `expo-sharing`은 파일 공유다.
- 칸 수 규칙은 B안: 혼자 판 좌우 여백 6은 그대로 두고 열 수만 판 안 폭으로 정했다. 430pt 폰의 혼자 판 칸은 69에서 52로 작아졌다(사용자가 눈으로 볼 것).
- 가려진 칸만 있는 날도 서버 규칙(하루 두 장, 한 사람 한 장)대로 붙일 수 있다. 틀리면 서버가 거절해 「이미 누가 붙였어요」가 뜬다.
- 만든 사람을 차단해 이름이 없으면 이름 없이 「만든 사람만 바꿀 수 있어요.」를 보인다(새 문구).
- 구현 에이전트 하나가 Storybook을 잠깐 6099 포트에 띄워 캡처한 뒤 껐다(AGENTS.md는 8081 하나만 허락). 이후 묶음에는 포트를 열지 말라고 했다.

마지막 확인(T 커밋 시점): `npm test` 861 통과(서버 시험 건너뜀), `test:components` 239 통과, 타입 검사와 린트 오류 0, iOS 번들 성공, 흐름도 스토리 ID 검사 통과. 서버는 바꾸지 않았다.

확인 못 한 것: 시뮬레이터에서 본 화면(`qa` 결과는 컨트롤러가 아래에 더한다), 새 확인 창 네 개의 실제 모습, iOS 가장자리 스와이프와 두 화면의 저장 안 한 변경 막기, 오프라인(iOS 시뮬레이터는 끌 수 없다, jest로만).

마지막 단계(컨트롤러가 더함):
- `security`(읽기 전용): Critical 0, Important 0, Minor 3.
- 브랜치 전체 검토: 「고치면 준비됨」, Important 3(이미 나간 사람 내보내기에서 `not_member`, `dev-friend` 칸 번호 한 칸 밀림, 문서끼리 출시판이 다름)과 Minor.
- `qa`(iOS 26.5, 16e 390pt와 17 Pro Max 440pt): 기능 실패 0. 혼자 판과 함께 판 칸 수, 친구와 함께, 한 판 두 종류, 목표 설정(1000칸 받고 1001 막음), 내보내기, 나가기, 만든 사람 삭제, 신고, 확인 창, 스와이프 막기, 로그인 권하기, 혼자 목표 흐름 통과. 목록 기대와 다른 것 1(만든 사람이 차단하면 흐린 칸이 아니라 내보냄, PRD대로). 눈에 띈 이상 11.
- 마지막 수정 한 번(`ce4d95c`, `161229b`, `6107ff6`, `3130698`): Important 3과 Minor, 이상 1,2,3,4,5,6,8,9를 고쳤다.
  - 신고 줄은 다른 사람이 없으면 숨긴다.
  - 칸 수 오류는 칸 바로 아래, 스티커 겹침 오류는 [저장하기] 바로 위에 띄운다.
  - 붙인 사람 문구에서 나에게 「님」을 붙이지 않는다.
  - 카드 「n명이 함께」는 혼자면 숨기고, 판의 사람 수는 나를 포함한다.
  - 한 판 마지막 줄을 왼쪽 정렬한다.
  - 한 판용 삭제 안내를 넣는다.
  - + 시트를 닫고 로그인 창을 띄운다.
  - 로그인 권하기와 1초 모음 새로 고침의 중복을 하나로 모았다.
  - `dev-friend`: 적립판 칸 번호를 1부터 센다. 달력판은 앱이 날짜로 칸을 골라 그대로 둔다. 비밀번호 변수 이름은 `DEV2_PASSWORD`이고, 공유 `.env.local`의 키 이름도 바꿨다.
- 범위 재검토: 깨끗함, Important 0, Minor 6(아래 17번에 묶음).
- 수정 뒤 확인: jest 865, 컴포넌트 244 통과, 타입과 린트 오류 0, 번들 성공, 흐름도 ID 검사 통과.
- 수정 뒤 `qa` 재확인(443fe4f, iOS 26.5 16e): 9개 가운데 8개 통과. 왼쪽 정렬, 겹침 오류 위치(설정), 붙인 사람 문구, 사람 수, 시트 닫고 로그인 창, 신고 줄 숨김, 한 판 삭제 안내, `dev-friend` 칸 번호와 `DEV2_PASSWORD`가 통과했다. 칸 수 오류는 칸 바로 아래에 뜨지만 키보드가 떠 있는 동안 아래쪽 절반이 잘린다(일부 실패, 18번). 만들기 화면의 겹침 오류는 만들 때 사람이 없어 볼 수 없다.
- 개발 서버에 남은 것: 신고 줄 1개(`5fa1dc96-…`), 나간 dev2의 혼자 목표 3개(「QA each」, 「QA kick」, 「QA r each」). `dev-friend`에 지우기 명령이 없다. dev@는 시작 전과 같다(목표 2, 스티커 4, 기록 2).

## 아침에 물을 것

(구현하면서 채운다. 계획을 쓰며 찾은 것을 먼저 적어 둔다.)

1. **한 판 달력판의 「같은 날 두 장」을 그리는 모양이 디자인 시스템에 없다**(`CalendarBoardView.records`는 날마다 한 장). A(추천) 이번에는 먼저 붙인 한 장을 그리고, 누르면 그날 붙인 사람과 [나도 붙이기]를 보인다. 겹쳐 그리기는 시안 한 장으로 확인한 뒤 / B 지금 시안을 만들어 확인받고 같이 넣는다 / C 한 판은 적립판만 만들게 한다. (2026-11-05 사용자: 추천안대로) A(밤사이 구현 그대로). 같은 날 두 장 그리기는 시안 확인 중.
2. **차단한 사람 목록에 스티커와 목표 이름이 없다**(`my_blocks`는 이름과 시각만, 확정 시안은 스티커와 「…에서 차단」을 보인다). A 차단할 때 그 사람 스티커와 목표 이름을 기기에 남긴다(다른 기기에서는 비고, 로그아웃 때 지울 것이 는다) / B(추천) 새 마이그레이션으로 `blocks`에 스티커와 목표 이름을 함께 남기고 `my_blocks`가 돌려준다 / C 이름만 보인다(지금 계획의 기본). (2026-11-05 사용자: 이름만) 서버는 그대로 두고, 앱에서 `BlockedPerson`의 `sticker`, `goalName`과 「…에서 차단」 줄, 그 스토리와 문구 키(`block.where`)를 지웠다.
3. **신고 흐름 시안이 없다**(대상 고르기, 사유). A(추천) 차단 고르기 시트를 다시 써서 「목표 이름」과 사람을 고르고, 사유는 고정 낱말 `name`, 확인 창 뒤 「신고했어요」 / B 문의하기처럼 메일 앱을 채워 연다 / C 시트 + 사유 입력칸. (2026-11-05 사용자: 추천안대로) A(밤사이 구현 그대로).
4. **시안에 없는 새 문구**(위 「새 문구」 표: 로그인 권하기, 누가 언제, 공유 본문, 나가기와 내보내기와 링크 새로 만들기 확인, 볼 수 없는 목표, 신고, 1000칸). A(추천) 표대로 넣고 실제 화면 캡처를 보여 드린 뒤 고친다 / B 넣기 전에 문구만 먼저 확인 / C 시안 아티팩트로 만들어 고르게 한다. (2026-11-05 사용자: 추천안대로) A(밤사이 구현 그대로).
5. **만들 때 금칙어(`name_not_allowed`)가 목표 이름인지 내 이름인지 서버가 가르지 않는다.** A(추천) 두 칸 아래 모두 「다른 이름을 써 주세요.」(목록이 빈 지금은 거의 안 나온다) / B 새 마이그레이션으로 목표 이름 낱말을 따로 준다 / C 버튼 위 한 줄로. (2026-11-05 사용자: 추천안대로) A(밤사이 구현 그대로).
6. **`rate_limited`는 이번 단계 RPC 어디서도 오지 않는다**(`join_goal`만). A(추천) 낱말 풀이와 문구 키만 넣고 함께하기 단계에서 쓴다 / B 다른 RPC에도 횟수 제한을 건다(새 마이그레이션) / C 문구도 다음 단계로. (2026-11-05 사용자: 추천안대로) A(밤사이 구현 그대로).
7. **앱 설정 「차단한 사람」 줄의 자리가 시안에 없다.** A(추천) 계정 패널 맨 아래, 로그인해 있을 때만 / B 「도움말과 정보」 패널 안 / C 새 패널 「함께 목표」. (2026-11-05 사용자: 추천안대로) A(밤사이 구현 그대로).
8. **목표 설정에 [초대 링크 새로 만들기] 버튼과 칸 수 칸이 컴포넌트에 없다**(`MemberList`, `TogetherSettingsScreen`). A(추천) 기존 버튼과 `SlotCountPicker`를 같은 자리에 더한다(새 조립) / B 시안을 먼저 / C 칸 수는 만들 때만. (2026-11-05 사용자: 추천안대로) A(밤사이 구현 그대로).
9. **무료 목표 5개 한도에 함께 목표도 드나.** A(추천) 든다(지금 [+] 검사 그대로) / B 함께 목표는 따로 센다 / C 함께 목표는 한도 없음. (2026-11-05 사용자: 추천안대로) A(밤사이 구현 그대로).
10. **달력판 함께 목표의 종료일은 만든 뒤 바꾸는 칸이 없다**(시안, PRD 「이름과 칸 수는 만든 사람만」). A(추천) 이번에는 만들 때만 정하고 `update_goal`에는 지금 값을 그대로 보낸다 / B 만든 사람에게 기간 칸을 더한다 / C 함께 목표 달력판은 종료일 없이만 만든다. (2026-11-05 사용자: 추천안대로) A(밤사이 구현 그대로).

마지막 단계에서 생긴 질문:

11. **혼자 남은 만든 사람이 [사람 차단하기]를 누르면 빈 시트가 열린다.** A(추천) 신고 줄처럼 숨긴다 / B 「차단할 사람이 없어요」 한 줄 / C 그대로. (2026-11-05 사용자: 추천안대로) A: 다른 사람이 없으면 [사람 차단하기] 줄도 신고 줄과 같은 조건으로 숨겼다.
12. **한 판은 친구를 기다리는 동안 「친구를 기다리고 있어요」와 [링크 다시 보내기]가 없다**(각자 판에만). A(추천) 한 판에도 같은 안내를 판 위에 넣는다 / B 목표 설정의 링크만으로 충분하다 / C 시안을 먼저. (시안 확인 중)
13. **서버가 목록에 없는 스티커 id(`sticker-heart`)를 받는다**(`join_goal`). A(추천) 새 마이그레이션으로 `basic.` 목록 검사를 넣는다 / B 앱에서만 막는다 / C 그대로. (2026-11-05 사용자: 서버에서 한번에) A: `private.check_sticker`가 앱 규칙(`<묶음>.<이름>`, 묶음은 앱 묶음 10개, 1.0 흑백 id 6개)에 맞지 않으면 `invalid_sticker`. 스티커 하나하나의 목록이 아니라 묶음과 모양으로 본다(앱이 묶음 안에 스티커를 더할 때 서버를 먼저 바꾸지 않게). `create_shared_goal`, `join_goal`, `update_member`에 걸린다.
14. **내보내진 사람은 새 링크로도 그 목표에 다시 못 들어온다**(서버 주석은 「같은 초대로」만 막는다고 씀). 만든 사람이 차단했다 풀어도 못 돌아온다. A(추천) 설계대로 두고 서버 주석과 PRD를 맞춘다 / B 링크를 새로 만들면 다시 들어올 수 있게 바꾼다 / C 차단을 풀 때만 돌아올 수 있게. (2026-11-05 사용자: 「내보낸 사람도 제한 없이 다시 링크로 입장할 수 있도록 해」) `join_goal`의 내보내짐 검사를 뺐다. 유효한 링크면 같은 링크로도 들어온다. 막으려면 링크를 새로 만든다. 차단은 그대로 막는다. 내보내기 설명은 「(이름)님을 이 목표에서 내보내요. 알리지는 않아요. 다시 못 들어오게 하려면 초대 링크를 새로 만들어 주세요.」
15. **새 문구 확인:** 「그 사람은 이 목표에 없어요.」, 한 판 만든 사람 삭제 안내 「판에 붙인 내 스티커와 기록이 지워지고 이 목표에서 나가요. 친구들이 붙인 칸은 그대로예요.」, 붙인 사람 「나와 Bob님이 붙였어요」 「Bob님, Cid님이 붙였어요」 「내가 붙였어요」.
16. **왼쪽 정렬이 각자 판의 내 판에도 같이 적용됐다**(혼자 판과 같은 규칙). 눈으로 확인 부탁.
17. **남은 Minor(검토):** 목표 이름 신고의 `not_member`도 사람 문구로 나옴, 내보내기 뒤 다시 받기가 실패하면 조용히 끝남, `app/_layout.tsx:183`의 `currentUserId` 식 중복 등 6건(`.superpowers/sdd/…/rereview-final.md`). A(추천) 다음 단계 시작 때 한 번에 / B 지금 / C 두기. (2026-11-05 사용자: 추천안대로) 이번 작은 결정 묶음에서 같이 고쳤다: 목표 이름 신고 실패 대상, 내보내기 다시 받기 실패 창, `_layout.tsx`의 `signedInUserId`, 버튼 위 문구의 알림 빼기를 고쳤다. 차단 시트는 11번으로.
18. **칸 수 오류가 키보드에 반쯤 가린다**(만들기 화면, [Done]을 누르면 다 보인다). A(추천) 오류가 뜨면 문구 아래까지 스크롤 / B 칸 위에 띄운다 / C 그대로. (2026-11-05 사용자: 추천안대로) A: 칸 수 오류가 뜨면 키보드가 떠 있어도 문구 아래 끝까지 내린다(`KeepAboveKeyboard`).
19. **친구가 다 나간 뒤에도 한 판 삭제 안내가 「친구들이 붙인 칸은 그대로예요」다.** A(추천) 다른 사람이 없으면 혼자 목표 삭제 안내를 쓴다 / B 문구에서 그 문장을 뺀다 / C 그대로. (2026-11-05 사용자: 추천안대로) A: 한 판에 다른 사람이 없으면 설정 안내와 확인 창이 혼자 목표 삭제와 같다.
20. **개발 서버에 남은 dev2 혼자 목표 3개와 신고 줄 1개.** A(추천) `dev-friend`에 지우기 명령을 더해 지운다 / B `supabase-dev` 스킬 절차로 SQL로 지운다 / C 둔다(개발 데이터). (2026-11-05 사용자: 추천안대로) A: `dev-friend`에 `goals`, `delete`를 더해 dev2 혼자 목표 3개를 지웠다. 신고 줄 1개는 앱 RPC로 지울 수 없어 남았다.
21. **신고 행에 대상 이름이 없다**(이름은 나중에 바뀌거나 나가면 지워져, 운영자가 무엇을 신고했는지 알 수 없다). (2026-11-05 사용자: 서버에서 한번에) `reports.target_name`을 더하고 `report`가 신고 당시의 이름(사람이면 그 목표의 이름, 나갔으면 차단할 때 남긴 이름, 목표 신고면 목표 이름)을 남긴다. 처리방침 문장은 정책 사이트(다른 저장소)에서 고친다. 제안은 `.superpowers/sdd/2026-11-05-friends-goal-screens/server-batch-report.md`.
22. **한 판 달력판 하루 두 장이 오늘 꺾쇠를 가린다**(QA, 둘째 장 (9, 7) 비낌). (2026-11-05 사용자: 추천안대로) 결정: 두 장 모두 24pt 그대로, 둘째 장 비낌을 (3, 2)로 줄여 27x26 묶음을 칸 가운데에 둔다. 402pt 폰 날 칸(41x52, 꺾쇠 팔 13 두께 7)과 440pt 폰 날 칸(47x52, 팔 15 두께 8)에서 24pt 두 장이 꺾쇠에 닿지 않는 한계가 가로 3, 세로 2다. 렌더 시험(`board-render.test.tsx`)이 두 폭의 꺾쇠 겹침을 계산해 고정하고, 스토리 「한 판 달력판 하루 두 장 402 폭」「…440 폭」이 오늘을 두 장 날로 보인다.
23. **서버가 함께 목표 달력판 기간 밖 날짜의 스티커를 받았다**(dev-friend `place`로 시작 전 날짜). (2026-11-05 사용자: 추천안대로) 결정: 새 마이그레이션 `20261105000007_sticker_period.sql`이 스티커 쓰기 트리거에서 UTC 날짜 기준 시작일 - 1 ~ 오늘 + 1, 종료일까지만 받고, 밖이면 `sync_push`가 그 행만 `out_of_period`로 돌려준다. 앱은 slot_taken처럼 기기에서 칸과 기록을 지우되 알리지 않고(`onOutOfPeriod`가 기기 사진을 지우고 화면이 다시 읽게 한다) 다시 보내지 않는다. 혼자 목표(1.1.0과 같게)와 적립판(칸 번호 범위만)은 날짜를 보지 않는다.

