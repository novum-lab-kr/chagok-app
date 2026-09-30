# 홈 구조 전환 개발 설계

2026-09-30 작성 · 같은 날 사용자 검토 반영(9절) · 기준: [PRD](PRD.md) 4.1–4.7 · [HANDOFF](HANDOFF.md) 9절 · Storybook `Screens / Home structure · proposals`

2026-09-29 결정(홈 = 목표 목록, 판 = 상세 화면, 기간·완성·readonly)을 앱에 옮기기 위한 설계다. 명세는 PRD이고, 스토리의 `progressOf`·`orderGoals`·`percentLabel`은 참고 구현이다.

범위 밖: 계정·백업·복원(4.8), 앱 설정 항목(4.9), `records` 수정 시각, 튜토리얼 다시 보기 진입(TODO로만 남긴다, 9절).

## 1. 데이터 — 스키마 v4

`goals`에 컬럼 다섯 개를 더한다. 기존 규칙대로 v1–v3 SQL은 고치지 않고 `MIGRATIONS` 끝에 붙인다.

```sql
ALTER TABLE goals ADD COLUMN end_date TEXT;                          -- 'YYYY-MM-DD' 로컬 날짜. 달력판만, NULL = 종료일 없음
ALTER TABLE goals ADD COLUMN completed_at INTEGER;                   -- epoch ms. NULL = 진행 중
ALTER TABLE goals ADD COLUMN completion_seen INTEGER NOT NULL DEFAULT 0;  -- 완성 뒤 닫기/계속하기를 골랐는가
ALTER TABLE goals ADD COLUMN last_placed_at INTEGER;                 -- epoch ms. 떼도 바꾸지 않는다
ALTER TABLE goals ADD COLUMN initial_slots INTEGER;                  -- 적립판을 만들 때의 칸 수. 칸 늘리기 기본값

UPDATE goals SET initial_slots = total_slots WHERE board_type = 'tally';

UPDATE goals SET last_placed_at =
  (SELECT MAX(placed_at) FROM stickers WHERE stickers.goal_id = goals.id);

-- 이미 다 채운 적립판: 옛 규칙에서는 완성 개념이 없었다. 완성으로 옮기고 다이얼로그를 한 번 보여준다.
UPDATE goals SET completed_at = last_placed_at, completion_seen = 0
 WHERE board_type = 'tally' AND total_slots IS NOT NULL
   AND (SELECT COUNT(*) FROM stickers WHERE stickers.goal_id = goals.id) >= total_slots;
```

| 컬럼 | 왜 필요한가 |
| --- | --- |
| `end_date` | 기간 달력판(4.3). 로컬 날짜 키로 저장해 `localDateKey`와 바로 비교한다. 시각이 아니라 날짜라서 시간대 변환이 끼지 않는다 |
| `completed_at` | 완성 판정과 완성한 판 탭 정렬(4.1), 기간 없는 달력판의 기준 달(`9월 m%`) |
| `completion_seen` | "완성했지만 닫기/계속하기를 아직 안 고른 판"을 구분한다. 세 가지 완성 경로를 하나의 규칙으로 묶는다(5절) |
| `last_placed_at` | 내 목표 탭 정렬(4.1)과 종료일 하한(4.3). 떼도 유지해야 해서 `MAX(stickers.placed_at)`로 대신할 수 없다 |
| `initial_slots` | 칸 늘리기의 기본값은 "처음 만든 칸 수만큼 더하기"다(2026-09-30). 한 번 늘리면 `total_slots`가 바뀌므로 처음 값을 따로 둔다. 기존 적립판은 지금 칸 수로 채운다 |

기간 없는 달력판을 계속하기로 되돌리면 `completed_at = NULL, completion_seen = 0`이다. 칸 늘리기는 `total_slots`만 올린다.

`Goal` 타입에 `endDate: string | null`, `completedAt: number | null`, `completionSeen: boolean`, `lastPlacedAt: number | null`, `initialSlots: number | null`을 더한다.

**트랜잭션.** 마지막 칸 붙이기는 "스티커 넣기 + `last_placed_at` + `completed_at`"이 함께 성공해야 한다. `DbDriver`에 `transaction(fn)`을 추가한다. expo 드라이버는 `withExclusiveTransactionAsync`, node 테스트 드라이버는 `BEGIN`/`COMMIT`/`ROLLBACK`으로 구현한다. (구현 전에 Expo 57 SQLite 문서로 API 이름을 확인한다.)

## 2. 도메인 규칙 — `src/domain/progress.ts`

UI 없는 순수 함수다. `now`를 인자로 받아 테스트에서 날짜를 고정한다. 날짜는 모두 로컬 날짜 키로 다룬다.

| 함수 | 규칙 (PRD) |
| --- | --- |
| `progressOf(goal, stickers, now)` | 적립판: 붙은 수 / `total_slots`. 기간 달력판: 붙은 수 / 시작일–종료일 날 수. 기간 없는 달력판: 기준 달에 붙은 날 / 그 달 날 수. 기준 달은 진행 중이면 이번 달, 완성했으면 `completed_at`의 달. `percent = floor(value / total * 100)`. 반환에 `basis: 'all' \| 'thisMonth' \| { month }`를 담는다 (4.1, 4.3) |
| `isCompleted(goal)` | `completed_at != null` |
| `isPeriodOver(goal, now)` | 달력판이고 `end_date`가 있으며 오늘 > `end_date` |
| `periodEndAt(endDate)` | 종료일 다음 날 0시(로컬). 종료일이 지나 완성된 판의 `completed_at` 값 |
| `canPlace(goal, stickers, target, now)` | 완성한 판이면 불가. 적립판: 범위 안의 빈칸. 달력판: 오늘이고, 기간 안이고, 아직 안 붙인 날 (4.2, 4.3) |
| `canRemove(goal)` | 완성한 판이 아니면 가능 (4.7) |
| `completesBoard(goal, stickers, target, now)` | 이 칸을 붙이면 판이 다 차는가. 적립판: 남은 빈칸이 이것 하나. 기간 달력판: 기간 안의 남은 빈 날이 이것 하나. 기간 없는 달력판: 항상 false. true면 붙이기 전에 확인을 받는다 (4.7) |
| `isDateEnabled(goal, stickers, date)` | 진행 중: 시작일 ≤ 날짜 ≤ 종료일(없으면 상한 없음). 완성: 스티커가 붙은 날만(기록 열기용) |
| `monthNav(goal, year, month)` | 시작일이 있는 달이면 이전 달 없음, 종료일이 있는 달이면 다음 달 없음. 기간 없는 달력판은 미래 달로 계속 간다 (4.3) |
| `endDateFloor(goal)` | 목표 설정의 종료일 하한 = 마지막으로 붙인 날(없으면 시작일) 다음 날. `PeriodField`의 기존 동작과 같다 |
| `extendLimits(goal, now)` | 계속하기. 적립판: 더할 칸 수 1 이상, 상한 없음, 기본값 `initial_slots`. 달력판: 오늘 이후이면서 현재 종료일 이후 (4.7) |
| `orderGoals(goals)` | 내 목표: `last_placed_at ?? created_at` 최근순. 완성한 판: `completed_at` 최근순 (4.1) |

`slots.ts`의 `buildSlots`는 달력판을 "오늘이 속한 달"로만 만든다. 미래 달·지난 달을 보여줘야 하므로 `(year, month)`를 받도록 넓힌다. 기존 호출부는 오늘 값을 넘긴다.

## 3. 저장소

| 위치 | 추가·변경 |
| --- | --- |
| `goalRepository` | `createGoal`에 `endDate`. `updateGoal`에 `endDate`(null = 지우기). `completeGoal(id, at)`, `markCompletionSeen(id)`, `reopenGoal(id)`, `extendSlots(id, add)`, `extendEndDate(id, date)` — 뒤의 둘은 되돌리기(`completed_at = NULL`, `completion_seen = 0`)를 함께 한다 |
| `goalRepository` | `settleExpiredPeriods(now)`: 종료일이 지났는데 진행 중인 달력판에 `completed_at = periodEndAt(end_date)`, `completion_seen = 0`. 목록·상세를 읽기 전에 부른다 |
| `goalRepository` | `countGoalContents(id)` → `{ stickers, records }`. 삭제 확인 문구용. 기록은 사진이나 비어 있지 않은 메모가 있는 것만 센다(기록 표식과 같은 기준) |
| `goalRepository` | `deleteGoal`이 지우기 전에 그 목표의 사진 URI를 모아 돌려준다. 파일 삭제는 호출자가 DB 삭제 성공 뒤에 `removeManagedRecordPhoto`로 한다. 파일 삭제 실패는 고아 파일로 남고 목표 삭제는 성공으로 본다 |
| `stickerRepository` | `placeSticker(goalId, target, { complete })`: 트랜잭션 안에서 완성한 판이면 거부 → 스티커 넣기 → `last_placed_at` 갱신 → `complete`면 `completed_at`까지 |
| `stickerRepository` | `listStickersInRange(goalId, from, to)`: 달력판 상세는 보고 있는 달만 읽는다 (6.3) |
| 새 조회 | `listGoalSummaries(now)`: 목표별 전체 붙은 수와 이번 달(또는 완성한 달) 붙은 수를 `GROUP BY` 한 번으로 읽는다. `useGoals`가 모든 스티커를 읽던 것을 대체한다 (HANDOFF 9절, PRD 6.3) |

## 4. 라우트

| 경로 | 파일 | 내용 |
| --- | --- | --- |
| `/` | `app/index.tsx` | 목표 목록. `AppHeader`(앱 설정) + `GoalListHeader`(탭, `+`) + `GoalSummaryCard`. 탭은 파라미터 `tab`으로 둔다. 첫 실행이면 튜토리얼 |
| `/goal/new` | `app/goal/new.tsx` (모달) | 이름 → 판 종류 → 기본 스티커 → 종료일(달력판, `OptionButtons` + `EndDatePicker`). 만들면 모달을 닫고 그 판 상세를 연다 (3절 흐름표 "해당 판이 열린다") |
| `/goal/[id]` | `app/goal/[id]/index.tsx` **(신규)** | 판 상세. `ScreenHeader`(`내 목표`/`완성한 판`) + 패널 제목·톱니 + `BoardProgressRow` + 판. 붙이기·떼기·기록 열기·완성 흐름 |
| `/goal/[id]/settings` | `app/goal/[id]/settings.tsx` **(현 `goal/[id].tsx` 이동)** | 목표 설정. 이름 → 기본 스티커 → 기간 → [이 판 완성하기](기간 없는 달력판) → 저장 → [삭제하기]. 완성한 판은 읽기 전용 + 삭제만 |
| `/goal/[id]/extend` | `app/goal/[id]/extend.tsx` **(신규)** | 계속하기: 적립판은 칸 늘리기, 기간 달력판은 종료일 늘리기 |
| `/sticker/[id]` | 그대로 | 기록. 스티커 → 목표를 읽어 완성한 판이면 `readonly`. 파라미터로 받지 않는다(딥링크로 열어도 맞도록) |
| `/settings` | 그대로 | 앱 설정 자리 |

- 지금 `index`가 쓰는 `selectedGoalId` 파라미터는 없앤다. 선택 목표는 `/goal/[id]` 경로가 된다.
- 뒤로가기는 계속 `goBackOrHome`을 쓴다. 목표를 삭제하면 목록으로 돌아간다(스택에 남은 상세·설정을 걷어낸다).
- Expo Router 57에서 폴더 라우트(`[id]/index.tsx`)와 모달을 닫고 다른 화면을 여는 API는 구현 전에 버전 문서로 확인한다.

## 5. 판 조작과 완성 흐름

**판 조작 (4.5).** 칸 컴포넌트(`GoalStickerCell`, `CalendarBoard`)에 이미 `onOpenRecord`·`readonly`와 접근성 동작이 있다. 앱에서는 연결만 한다.

| 누름 | 진행 중 | 완성한 판 |
| --- | --- | --- |
| 빈칸 한 번 | `canPlace`면 붙이기. `completesBoard`면 먼저 확인 | 없음 |
| 붙인 칸 한 번 (250ms 뒤) | 떼기. 기록이 있거나 달력판의 지난 날이면 `떼기` 확인을 받는다. 스티커·기록·사진을 함께 지운다 | 없음 |
| 붙인 칸 두 번 / 꾹 / 접근성 동작 | 기록 열기 | 기록 읽기 전용 |

붙이기·떼기는 기존 `singleFlight`로 한 번에 하나만 처리한다. 저장이 성공한 뒤에만 햅틱과 화면 갱신을 한다.

**완성 — 규칙 하나로 세 경로를 다룬다.** 판 상세는 열릴 때와 저장 뒤에 확인한다. `completed_at`이 있고 `completion_seen = 0`이면 [완성] 스티커 붙이기 모션 → `닫기 / 계속하기` 다이얼로그를 띄운다.

| 경로 | 어떻게 그 상태가 되나 |
| --- | --- |
| 마지막 칸 (적립판, 기간 달력판) | 확인 `이 판을 완성할까요?` → [완성하기] → `placeSticker(..., { complete: true })` |
| 종료일 지남 | `settleExpiredPeriods`가 확인 없이 기록. 그 판을 처음 열 때 흐름이 뜬다 (4.7) |
| 수동 완성 (기간 없는 달력판) | 목표 설정 [이 판 완성하기] → 확인 → `completeGoal` → 상세로 돌아오면 흐름이 뜬다 |

앱이 모션 중에 종료돼도 다음에 열 때 다시 뜬다. 모션은 한 화면 방문에 한 번만 재생한다.

| 선택 | 결과 |
| --- | --- |
| 닫기 | `markCompletionSeen` → readonly. 다이얼로그는 다시 열지 않는다 |
| 계속하기 · 적립판 | `/goal/[id]/extend` → 더할 칸 수(기본 = 처음 만든 칸 수) 저장 시 `extendSlots`(되돌리기 포함) |
| 계속하기 · 기간 달력판 | `/goal/[id]/extend` → 종료일 저장 시 `extendEndDate`(되돌리기 포함) |
| 계속하기 · 기간 없는 달력판 | 바로 `reopenGoal` |

늘리기 화면에서 저장하지 않고 돌아오면 판은 완성 상태 그대로이고, 다이얼로그가 다시 뜬다.

**모션.** [완성] 스티커(`CompletionSticker`)가 `BoardProgressRow`의 `m% 달성중` 자리에 붙는 모션 하나 + 햅틱 한 번. 스티커 붙이기와 같은 결로 만들고, 모션 줄이기 설정이면 생략하고 바로 표시한다. 붙일 때 시각 피드백(HANDOFF 9절 "그 밖에")도 같은 모션을 짧게 써서 함께 처리한다. 구현할 때 `animate-expo` 스킬로 값을 정하고 Storybook에 스토리를 추가해 사용자 확인을 받는다.

**확인창.** 모두 `PixelDialogModal`(basic)이다. 문구는 확정 Storybook 그대로 쓴다. 이 전환에서 건드리는 라우트의 OS `Alert`도 함께 바꾼다. 사진 권한 안내는 설정 열기 버튼이 필요해 basic 다이얼로그의 두 버튼(`취소`/`설정 열기`)으로 옮긴다.

## 6. 화면 조립 방식

**화면 조합을 `src/design-system/`으로 옮긴다 (2026-09-30 결정).** 확정 Storybook의 화면은 `stories/HomeStructure.stories.tsx` 안의 함수(`Home`, `Detail`, `GoalSettings` 등)로 조립돼 있다. props만 받는 `GoalListScreen`, `BoardDetailScreen`, `GoalSettingsScreen`, `CompletedGoalSettingsScreen`, `ExtendScreen`, `FirstRunTutorial`을 새 파일에 두고, 스토리와 앱이 함께 쓴다. 옮긴 뒤 스토리를 390·320px로 전후 캡처해 픽셀이 같은지 확인한다.

앱 라우트에서 직접 조립하는 방식은 택하지 않았다. 같은 배치가 두 곳에 생기고 앱 화면을 Storybook으로 검증할 수 없다.

## 7. 첫 실행 튜토리얼 5단계

PRD 4.6 순서와 문구는 스토리 `tutorialSteps`에 이미 있다. 예시 데이터로 그린 목록·새 목표·상세 위에 스포트라이트를 씌운다. 실제 목표나 기록은 만들지 않는다. 스토리 안의 `SpotTarget`·`useSpotRef`는 6절 작업과 함께 `tutorial.tsx`로 옮긴다. 완료 상태는 기존 `tutorialDone` 플래그를 쓴다.

## 8. 작업 순서와 검증

커밋 시점은 사용자가 정한다. 화면이 많이 바뀌므로 커밋하지 않은 기존 앱 변경(2026-09-28–29)은 따로 묶지 않고, 화면 개발이 끝난 뒤 함께 커밋한다(2026-09-30). 모든 단계 끝에 `npm test`, `npm run test:components`, `npm run typecheck`, `npm run lint`를 돌리고, 화면을 만진 단계는 iOS export까지 돌린다.

| # | 작업 | 확인 |
| --- | --- | --- |
| 1 | 스키마 v4 마이그레이션, `Goal` 타입, `DbDriver.transaction` | `migrations.test.ts`: v3 DB → v4에서 `last_placed_at`·`initial_slots` 채움, 다 찬 적립판 완성 처리, 재실행 안전 |
| 2 | `progress.ts` 규칙 함수, `buildSlots` 월 인자 (테스트 먼저) | 월말·윤년, 자정 근처 로컬 날짜, 종료일 당일/다음 날, 기간 밖 날짜, 100칸 넘는 판, 떼기 뒤 정렬 유지 |
| 3 | 저장소 추가분, `listGoalSummaries`, `useGoals` 교체 | 완성한 판에 붙이기 거부, 트랜잭션 실패 시 스티커도 남지 않음, 삭제 수량, 만료 정리 |
| 4 | 어댑터: 카드 상태 문구(`m% 진행중`, `이번 달 m%`, `9월 m%`, `M/D 완성`), 판 종류 배지 | `pocketAdapter.test.ts` |
| 5 | 6절 화면 조합 이동. 새 스토리: 적립판 칸 늘리기. 목표 없음은 `Screens / Empty goal list`를 `GoalListScreen`의 빈 상태로 옮긴다 | 스토리 전후 캡처 390·320px 동일, Docs 반복 렌더 0. 새 스토리는 사용자 확인 |
| 6 | 라우트: 목록, 상세(붙이기·떼기·기록 열기), 목표 설정·삭제, 새 목표 종료일(칸 수 상한 제거), 늘리기 | iOS 시뮬레이터와 `Chagok_Pixel_7`에서 흐름 확인, Android 뒤로가기, 300칸 적립판 스크롤·붙이기 반응 |
| 7 | 완성 흐름 + 모션 + 붙이기 피드백 | 세 경로 모두 다이얼로그, 앱 종료 후 재진입, 모션 줄이기 켬/끔 |
| 8 | 튜토리얼 5단계 | 새로 설치한 상태에서 첫 실행, 건너뛰기, 320px |
| 9 | 정리: 안 쓰게 된 `GoalChip`·`HomeScreen`·옛 PRD additions 장면 제거, HANDOFF 갱신 **(2026-09-30 완료)** | 검사 전부 |

실기기 확인은 이 계획에 없다. 하게 되면 따로 적는다.

## 9. 결정 (2026-09-30)

| # | 항목 | 결정 |
| --- | --- | --- |
| 1 | 화면 조립 | 화면 조합을 `src/design-system/`으로 옮겨 스토리와 앱이 함께 쓴다 (6절) |
| 2 | 적립판 칸 늘리기 화면 | 종료일 늘리기와 같은 틀(`ScreenHeader` + 목표 요약 + 칸 수 선택 + [칸 늘리기]). 스토리를 먼저 만들어 확인받는다 |
| 3 | 칸 수 상한 | **없앤다.** 생성과 칸 늘리기 모두. 칸 늘리기의 입력은 "더할 칸 수"이고 기본값은 처음 만든 칸 수(`initial_slots`)다. 사용자가 고칠 수 있다. 완성 다이얼로그 문구는 그대로다 |
| 4 | 계속하기 뒤 이동 | 판 상세에 머문다. 판은 목록의 내 목표 탭으로 옮겨진다 |
| 5 | 달력판 지난 날 떼기 | 한 번 누르면 떼되, 지난 날은 기록이 없어도 떼기 확인을 받는다. 오늘 칸은 기록이 있을 때만 확인 |
| 6 | 지난 날짜를 종료일로 저장 | 허용한다. 저장하면 종료일이 지난 판이라 바로 완성 흐름이 뜬다 |
| — | 튜토리얼 다시 보기 진입 | TODO로만 남긴다. 이번 전환에서 만들지 않는다 |
| — | 목표 없음 화면 | **A안: 안내 상자만.** 목록 헤더·탭(`내 목표 0 / 완성한 판 0`)·`+`는 그대로 두고, 탭 아래에 `EmptyState` "아직 목표가 없어요 / 오른쪽 위 ＋를 눌러 첫 목표를 만들어요." 만드는 동작은 `+` 하나. 지금 앱의 '첫 판을 만들어요' 화면은 없앤다. 시안: Storybook `Screens / Empty goal list` |

칸 수 입력(`SlotCountPicker`)은 세 자리(`maxLength={3}`)라 한 번에 999칸까지 입력된다. 상한을 없앤 것과 별개로 이 입력 길이는 디자인 시스템 값이라 바꾸지 않는다. 생성 검증(`GoalEditorScreen`의 1–100)은 "1 이상"으로 바꾼다.

목표 설정에서의 칸 수·판 종류 변경은 PRD 미확정 그대로다.

## 10. 구현 기록 (2026-09-30)

설계 1–8절을 구현했다. 시안에 없어서 구현하면서 정한 것과 설계와 달라진 것을 여기에 모은다. **2026-09-30 사용자 확인:** 4·10번은 바꿨고, 나머지는 진행한 대로 둔다.

### 구현하면서 정한 것 (확인 필요)

| # | 항목 | 지금 동작 | 근거 |
| --- | --- | --- | --- |
| 1 | 진행 중인 목표 없이 완성한 판만 있을 때 목록 | "진행 중인 목표가 없어요 / 오른쪽 위 ＋를 눌러 새 목표를 만들어요." | 목표 없음 A안과 같은 결. 시안 없음 |
| 2 | 기간 달력판의 마지막 날 완성 확인 문구 | "기간의 마지막 빈 날이에요. 완성하면 …" | 시안은 적립판 문구("마지막 칸이에요")만 있다 |
| 3 | 수동 완성 확인 문구 | 시안 그대로 "완성하면 되돌릴 수 없고, …" | 그런데 기간 없는 달력판은 계속하기로 완성을 풀 수 있다. 문구와 동작이 어긋난다 |
| 4 | 저장 실패 알림 | **결정 (2026-09-30):** 버튼 하나짜리 basic 다이얼로그(`single`) "잠시 후 다시 시도해주세요. 입력한 내용은 그대로 있어요." [확인]. 버튼은 다이얼로그 너비를 채운다 | Storybook `Components / Dialog` · 일반 화면 · 버튼 하나 |
| 5 | 달력판 지난 날 떼기 확인 문구 | "지난 날은 다시 붙일 수 없어요." (기록도 있으면 두 문장을 합친다) | 9절 5번 결정의 문구 |
| 6 | [이 판 완성하기]를 누를 때 저장 안 한 입력 | 함께 저장한 뒤 완성한다 | 입력을 잃지 않는다 (PRD 7절) |
| 7 | 완성 다이얼로그를 고르지 않고 닫음(Android 뒤로가기, 화면 전환) | 닫기로 치지 않는다. 다음에 판을 열 때 다시 묻는다 | 실수로 완성한 판에 보관되지 않게 |
| 8 | 새 목표의 칸 수 위치 | 판 종류 바로 아래(적립판일 때) | PRD 순서(이름 → 판 종류 → 기본 스티커 → 종료일)에 칸 수 자리가 없다 |
| 9 | 새 목표를 만든 뒤 | 모달을 그 판 상세로 바꿔 연다(`router.replace`) | 3절 "해당 판이 열린다". iOS 전환 모양은 실기기 확인 필요 |
| 10 | 삭제 확인 수량 | **결정 (2026-09-30):** 0개인 항목은 쓰지 않는다. 둘 다 0개면 "이 목표가 지워지고, 되돌릴 수 없어요." | `deleteDescription` |

### 설계와 달라진 것

- **키보드가 입력칸을 가리지 않게 한다 (2026-09-30, 사용자 녹화에서 발견).** `KeyboardAvoidingView`는 보이는 영역만 줄이고 스크롤은 옮기지 않아 기록 메모가 키보드 뒤에 남았다. `RetroScreen`이 `keyboardDidShow`에서 포커스한 입력칸의 화면 위치를 재어 키보드 위로 올라오도록 내린다. 입력칸이 있는 화면(기록 메모, 새 목표·칸 늘리기의 칸 수 직접 입력, 이름)에 모두 적용된다. 시뮬레이터에서 메모에 임시 autoFocus를 넣어 확인했다. 키보드가 떠 있는 채로 같은 종류의 다른 입력칸으로 옮기면 iOS가 `keyboardDidShow`를 다시 보내지 않을 수 있다 — 실기기 확인 필요.

- **트랜잭션 안의 삭제는 CASCADE에 기대지 않는다.** expo의 `withExclusiveTransactionAsync`는 별도 연결이라 `PRAGMA foreign_keys`가 꺼져 있을 수 있다. 목표·스티커 삭제는 기록·스티커를 직접 지운다(외래키를 끈 연결로 테스트).
- **`upsertRecord`도 완성한 판이면 거부한다.** 화면의 readonly와 별개로 저장소에서 막는다.
- **`slots.ts`는 `board.ts`로 대체했다.** 칸 규칙은 모두 `src/domain/board.ts`, 날짜는 `src/domain/dates.ts`.
- **`PixelPanel` 제목에 `flexShrink:1`을 더했다.** 네이티브에서 긴 목표 이름이 톱니바퀴를 패널 밖으로 밀어냈다. RN Web은 원래 줄어들어 Storybook 캡처는 바뀌지 않는다(60장 동일 확인).
- **모션은 RN 기본 `Animated`로 만들었다(`StickMotion`).** Reanimated는 설치돼 있지만 쓰는 곳이 없고 Storybook(웹) 번들 위험이 있어 쓰지 않았다.
- **다이얼로그는 화면이 가려지면 닫힌다.** RN `Modal`은 네비게이션과 상관없이 맨 위에 그려져, 딥링크로 화면이 바뀌면 이전 화면의 다이얼로그가 남았다(시뮬레이터에서 발견).

### 검증

- 자동: `npm test` 118 / `test:components` 26 / typecheck / lint / iOS export 통과.
- Storybook `Screens / Home structure · proposals`: 화면 조합을 옮기기 전후 390·320px 58장 바이트 동일. 새 장면 `완성 흐름 3 · 적립판 칸 늘리기` 추가.
- iPhone 16 Pro 시뮬레이터(Expo Go): 기존 v3 DB의 v4 마이그레이션, 목록·완성한 판 탭, 적립판·기간 달력판·기간 없는 달력판 상세, 종료일 지난 판의 자동 완성과 완성 다이얼로그, 목표 설정(진행 중·완성), 칸 늘리기, 새 목표, 읽기 전용 기록, 튜토리얼 1단계를 딥링크와 시험 데이터로 열어 확인했다. 시험 데이터는 백업으로 되돌렸다.
- **확인하지 못한 것:** 탭 조작 전부(붙이기·떼기·두 번·꾹·스와이프 — 시뮬레이터 탭 도구 없음), 모션과 햅틱의 실제 느낌, 모션 줄이기 설정, Android(`Chagok_Pixel_7`), 실기기, 320px 네이티브 폭.
