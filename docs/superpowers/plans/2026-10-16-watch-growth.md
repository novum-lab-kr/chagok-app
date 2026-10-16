# 워치 계획 1: 폰 쪽 준비와 시험 구현 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 워치가 붙으면 바로 쓸 수 있게 폰 쪽(TS)을 다 만들어 두고, watchOS 앱을 Expo 프로젝트에서 만들 수 있는지 시험 구현으로 확인한다.

**Architecture:** 워치는 위젯처럼 「눌렀다」는 요청만 보내고 폰의 TS가 판단한다. 이 계획은 폰 쪽 다섯 부분을 만든다: 마지막 칸 완성 요청(`complete`), 성장 수(최고치 유지), 블록 색, 워치 스냅샷, 워치 동기화 한 번. 워치와 실제로 주고받는 네이티브 모듈은 아직 없으므로 `watchPort()`는 `null`을 돌려주고, 그때도 성장 수는 기록이 바뀔 때마다 갱신한다.

**Tech Stack:** Expo SDK 57, React Native 0.86, expo-sqlite, jest + ts-jest(`__tests__/**/*.test.ts`), Node 스크립트(`scripts/build-widget-art.mjs`).

**Spec:** [워치 설계](../specs/2026-10-16-watch-growth-design.md) (우선), [PRD 4.10](../../PRD.md), [위젯 계획](2026-10-06-home-widgets-ios.md)(같은 요청 처리를 쓴다)

**이 계획 밖 (계획 2, 시험 구현 결과를 본 뒤 쓴다):** watchOS 타깃과 설정 플러그인, WatchConnectivity 네이티브 모듈(`watchPort()`를 실제로 바꾸기), SwiftUI 화면 다섯 개와 모션, 컴플리케이션, 시뮬레이터 확인, Storybook 미리보기와 흐름도의 워치 진입점.

## spec과 달라지는 한 가지

- spec 「구조」의 요청 모양은 `kind: add|undo`라고 적었지만, 위젯은 2026-10-07부터 **`remove` + `slotIndex`**(오늘 붙인 그 칸을 뗀다)도 쓴다. 워치에서 「오늘 칸을 다시 누르면 뗀다」는 이것과 같다. 워치도 `add | undo | remove`를 그대로 쓴다. Task 1에서 spec 문장을 고친다.

## Global Constraints

- `package.json`의 `overrides: { "react-dom": "19.2.3" }`를 지우지 않는다. 이 계획의 실제 구현(Task 1, 3~8)은 의존성을 더하지 않는다. 시험 구현(Task 2)은 따로 만든 worktree에서만 설치한다.
- `jest-expo`를 들이지 않는다. 테스트는 `jest` + `ts-jest`, DB 테스트는 `withFreshDb()`(`__tests__/support/setup.ts`).
- PRD 절 번호를 바꾸지 않는다. 새 절은 4.14로 더한다.
- 화면 문구와 문서에 가운데 점(`·`)을 쓰지 않는다. 새로 쓰는 줄에만 해당한다(기존 줄은 손대지 않는다).
- 문서와 코드 주석은 한국어, 커밋 메시지는 영어, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 커밋은 이 브랜치(`docs/watch-plan`, worktree `chagok-wt-watch`)에서. 코드는 사용자가 직접 돌려 본 뒤 커밋하고, main에는 `--no-ff`로 합친다. push는 요청할 때만.
- 성장 수 규칙: **`max(저장된 최고치, 지금 붙어 있는 스티커 전체 수)`**. 완성한 판의 스티커도 센다. 복원하면 복원된 스티커 수로 다시 시작한다.
- 보관함 수치(워치가 쓴다, 이 계획은 성장 수만 넘긴다): 묶음 = 블록 3개, 보관함 하나 = 묶음 16개 = 스티커 48개.
- 마지막 칸은 `complete: true`가 붙은 요청만 붙인다. 없으면 지금처럼 건너뛴다(위젯은 그대로 앱을 연다).

## Review Focus

1. **완성 확인을 받은 요청인데 그사이 판이 바뀐 경우.** 폰에서 칸을 늘렸으면 `complete`를 무시하고 그냥 붙인다(완성하지 않는다). 폰에서 이미 다 채웠으면 붙이지 않는다. Task 3에 테스트.
2. **떼고 다시 붙여도 블록이 늘지 않는다.** 스티커 5개, 성장 5에서 하나 떼고 다시 붙이면 성장은 5. 목표를 지워도 5. Task 4에 테스트.
3. **로그아웃이나 복원 뒤 성장 수.** 기기를 비우면 0부터, 복원하면 복원된 스티커 수부터. 예전 최고치가 남아 있으면 안 된다. Task 4에 테스트.
4. **자정과 월말.** 23:59에 만든 스냅샷의 「자정 뒤 값」에서 오늘 붙인 칸은 지난 칸이 되고, 10월 31일 다음은 11월 달력이다. Task 6에 테스트.
5. **워치 요청에 이상한 값이 섞인 경우.** `complete`가 `true`가 아닌 값(문자열 `"true"` 등)이면 그 요청을 버린다. 같은 id가 두 번 와도 한 번만 처리한다. Task 3과 Task 8에 테스트.

---

## File Structure

| 파일 | 하는 일 |
| --- | --- |
| `src/widgets/requests.ts` (고침) | 요청에 `complete?: true`, 마지막 칸 판단 |
| `src/widgets/applyRequests.ts` (고침) | `complete`를 `placeSticker`에 넘긴다 |
| `src/widgets/snapshot.ts` (고침) | `remainingOf`를 내보낸다(워치 스냅샷이 같이 쓴다) |
| `src/repositories/stickerRepository.ts` (고침) | `countAllStickers`, `listRecentStickers` |
| `src/repositories/appSettingsRepository.ts` (고침) | 설정 키 `watchGrowth` |
| `src/sync/restore.ts` (고침) | 복원 뒤 `watchGrowth`를 지운다 |
| `src/watch/growth.ts` (새) | 성장 수 계산과 저장 |
| `scripts/build-widget-art.mjs` (고침) | 스티커마다 블록 색을 뽑아 생성 파일로 쓴다 |
| `src/watch/stickerColors.generated.ts` (생성) | 스티커 id → 블록 색 |
| `src/watch/blockColor.ts` (새) | 블록 색 찾기와 기본 색 |
| `src/watch/snapshot.ts` (새) | 워치 스냅샷(순수 함수) |
| `src/watch/loadSnapshot.ts` (새) | DB에서 스냅샷 입력 읽기 |
| `src/watch/syncCore.ts` (새) | 요청 처리, 성장 갱신, 스냅샷 보내기 한 번 |
| `src/watch/watchPort.ts` (새) | 워치 연결. 계획 2 전까지 `null` |
| `src/watch/syncWatch.ts` (새) | 앱에서 시작하는 동기화(위젯과 같은 계기) |
| `app/_layout.tsx` (고침) | `startWatchSync()` 연결 |
| `docs/PRD.md`, `docs/HANDOFF.md`, spec (고침) | 4.14, 2절, 11절, 12절, 인계 |
| `docs/superpowers/specs/2026-10-16-watch-spike-results.md` (새) | 시험 구현 결과 |

---

### Task 1: PRD와 인계 문서 반영

**Files:**
- Modify: `docs/PRD.md` (2절 26행, 4.13 뒤, 11절 403행, 12절 끝)
- Modify: `docs/HANDOFF.md` (갱신일, 「진행 중인 브랜치와 worktree」, 「다음 할 일」)
- Modify: `docs/superpowers/specs/2026-10-16-watch-growth-design.md` (「구조」 요청 모양 줄)

**Interfaces:**
- Consumes: 없음
- Produces: PRD 4.14 「워치」 (코드 주석이 `PRD 4.14`로 가리킨다)

- [ ] **Step 1: PRD 2절 성장 문장 고치기**

`docs/PRD.md` 26행을 아래로 바꾼다.

```markdown
- 캐릭터 「차곡이」(4.11)는 브랜드와 표정 반응에 쓴다. 돌보기 게임이 아니다. 성장은 워치에서만 보인다(4.14). 스티커 하나에 블록 하나가 차곡이 머리 위에 쌓이고, 세 개가 모이면 보관함에 넣는다. 떼거나 판을 지워도 줄지 않는다.
```

- [ ] **Step 2: PRD 4.14 「워치」 새로 쓰기**

4.13 절 끝(`- 기기에 없는 사진(복원 뒤 아직 받지 못함)은 작은 그림을 비운다.` 줄) 바로 뒤, `## 5. 데이터` 앞에 넣는다.

```markdown

### 4.14 워치

Apple Watch에서 목표를 골라 바로 붙이고, 붙일 때마다 차곡이 머리 위로 블록이 쌓이는 것을 본다(2026-10-16). 꾸준히 붙이게 돕는 것이 목적이고 게임이 아니다. 설계: [워치 설계](superpowers/specs/2026-10-16-watch-growth-design.md), 시안 14판.

- **역할:** 워치는 보여 주기와 붙임 요청만 한다. 칸 번호, 날짜, 완성 판단은 폰이 한다(위젯과 같다). 폰 없이 혼자 도는 워치 앱은 만들지 않는다.
- **첫 화면:** 위에 차곡이, 아래에 진행 중인 목표 목록(마지막으로 붙인 순). 오늘 하나라도 붙인 목표는 줄 바탕이 민트다. 차곡이를 누르면 차곡이 화면.
- **목표 판:** 적립판은 다음 빈칸이 든 10칸 묶음과 [붙이기]. 달력판은 큰 오늘 칸, 크라운으로 내리면 이번 달 달력. 붙인 수(`n / nn`)는 쓰지 않는다.
- **붙이기:** 위젯(4.10)과 같다. 적립판은 누를 때마다 다음 빈칸에, 달력판은 하루 하나. 오늘 붙인 칸을 다시 누르면 뗀다. 지난날 붙인 칸과 사진이나 메모가 있는 칸은 떼지 않고 「지난 칸은 폰에서 고칠 수 있어요」(달력판은 「지난 날은 폰에서 고칠 수 있어요」)를 잠깐 보인다.
- **마지막 칸:** 위젯과 달리 워치에서 「이 판을 완성할까요?」를 확인받고 붙인다. 종료일 없는 달력판은 워치에서 완성되지 않는다.
- **성장:** 스티커 하나 = 블록 하나. 폰, 위젯, 워치 어디서 붙여도 센다. 머리 위에는 0~2개, 셋째가 오면 차곡이가 걸어가 세 개를 한 묶음으로 보관함에 넣는다. 보관함 하나는 2단 4칸, 칸마다 묶음 둘(스티커 48개). 다 찬 보관함은 뒤로 겹치고 크라운으로 넘겨 본다. 떼거나 판을 지워도 줄지 않는다. 처음 연결하면 지금까지 붙인 스티커 전체가 이미 쌓여 있다.
- **붙인 뒤:** 차곡이 화면으로 넘어가 블록이 떨어지고(보관할 때면 걸어가 넣고) 판으로 돌아온다. [건너뛰기]로 바로 돌아올 수 있다. 모션 줄이기가 켜져 있으면 결과만 보인다.
- **목표가 없을 때:** 졸린 차곡이 + 「폰에서 첫 목표를 만들어 보세요」. 폰과 처음 연결하기 전에는 「폰에서 차곡차곡을 열어 주세요」.
- 화면에 「책장」이라는 말은 쓰지 않는다(「보관함」).
- Wear OS는 아직 하지 않는다.
```

- [ ] **Step 3: PRD 11절 워치 줄 지우기, 12절에 한 줄 더하기**

11절 「나중에」의 `- 워치: 쌓인 스티커만큼 자라는 차곡이 + 빠른 붙이기. ...` 줄을 지운다.

12절 마지막 줄(`- **10-13 결제 연결.** ...`) 뒤에 더한다.

```markdown
- **10-16 워치.** Apple Watch부터 붙이기와 차곡이 성장을 넣는다. 성장은 스티커 하나에 블록 하나, 세 개씩 묶어 보관함에 넣는 방식으로 정했다(이전: 「쌓인 스티커만큼 자란다」만 있고 단계는 미정). 「책장」은 책 앱처럼 읽혀 「보관함」으로 불렀다.
```

- [ ] **Step 4: spec 요청 모양 줄 고치기**

`docs/superpowers/specs/2026-10-16-watch-growth-design.md`의 줄

```markdown
- **요청 모양은 위젯과 같다:** `{id, goalId, kind: add|undo, at, dateKey}`. 워치에서 완성 확인을 받은 요청만 `complete: true`를 더한다. 스티커 id = 요청 id라 두 번 처리해도 두 번 붙지 않는다.
```

을 아래로 바꾼다.

```markdown
- **요청 모양은 위젯과 같다:** `{id, goalId, kind: add|undo|remove, at, dateKey, slotIndex?}`. 오늘 붙인 칸을 다시 누르면 `remove`와 그 칸 번호(달력판은 날짜 - 1)를 보낸다. 워치에서 완성 확인을 받은 요청만 `complete: true`를 더한다. 스티커 id = 요청 id라 두 번 처리해도 두 번 붙지 않는다.
```

- [ ] **Step 5: HANDOFF 고치기**

`docs/HANDOFF.md` 3행 `갱신: 2026-10-15`를 `갱신: 2026-10-16`으로.

「진행 중인 브랜치와 worktree」 표 맨 아래에 줄을 더한다.

```markdown
| `chagok-wt-watch` | `docs/watch-plan` | 워치 설계(spec 승인 2026-10-16)와 계획 1(폰 쪽 준비, 시험 구현). 계획: `docs/superpowers/plans/2026-10-16-watch-growth.md` |
```

「지금 개발할 수 있는 것」 목록 끝(5번 뒤)에 더한다.

```markdown
6. **워치** — 설계 승인(2026-10-16, PRD 4.14). 계획 1: 폰 쪽 TS(완성 요청, 성장 수, 블록 색, 스냅샷, 동기화)와 시험 구현(watchOS 타깃, WatchConnectivity, 글꼴과 그림, 시뮬레이터 짝짓기). 계획 2(워치 앱 본 구현)는 시험 구현 결과를 본 뒤 쓴다. 아직 정하지 않은 것(오늘 칸 표시 통일, 컴플리케이션, 출시 시점)은 spec 「아직 정하지 않은 것」.
```

- [ ] **Step 6: 가운데 점 확인**

Run: `cd /Users/eunjukim/Desktop/workspace/chagok-wt-watch && git diff -U0 docs/PRD.md docs/HANDOFF.md docs/superpowers/specs/2026-10-16-watch-growth-design.md | grep '^+' | grep -c '·'`
Expected: `0`

- [ ] **Step 7: 커밋 (사용자가 문서를 확인한 뒤)**

```bash
git add docs/PRD.md docs/HANDOFF.md docs/superpowers/specs/2026-10-16-watch-growth-design.md
git commit -m "docs: PRD 4.14 watch, growth rule, handoff"
```

---

### Task 2: 시험 구현 (코드는 버린다, 결과 문서만 남긴다)

spec 「먼저 확인할 것」 네 가지. 시험 구현 코드는 브랜치 `spike/watch`(worktree `../chagok-wt-watch-spike`, main에서 새로)에 두고 합치지 않는다. 결과 문서만 `docs/watch-plan`에 커밋한다. 다른 세션의 Metro와 Storybook은 건드리지 않는다. 시뮬레이터 확인이 끝나면 띄운 시뮬레이터를 끈다.

**Files:**
- Create: `docs/superpowers/specs/2026-10-16-watch-spike-results.md` (이 브랜치)
- 시험 구현 파일은 `spike/watch` 브랜치에만

**Interfaces:**
- Consumes: 없음
- Produces: 계획 2가 따를 결론. 아래 네 질문마다 「된다 / 안 된다 / 조건부」와 그 근거(명령, 로그, 캡처 경로)

- [ ] **Step 1: 시험 구현 worktree 만들기**

```bash
cd /Users/eunjukim/Desktop/workspace/chagok-app
git worktree add ../chagok-wt-watch-spike -b spike/watch main
cd ../chagok-wt-watch-spike && ln -s ../chagok-app/.env.local .env.local && npm ci
npm ls react-dom --all   # 19.2.3 하나여야 한다
```

- [ ] **Step 2: 질문 1, watchOS 타깃을 prebuild에서 만들고 유지할 수 있는가**

`@bacons/apple-targets`(Expo 57에 맞는 판)를 먼저 시험한다. 설치 전 `package.json`, `package-lock.json`을 백업한다.

```bash
cp package.json "$TMPDIR/pkg.bak" && cp package-lock.json "$TMPDIR/lock.bak"
npx expo install @bacons/apple-targets
npm ls react-dom --all
mkdir -p targets/watch && cat > targets/watch/expo-target.config.js <<'EOF'
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({ type: 'watch', name: 'ChagokWatch', deploymentTarget: '10.0' });
EOF
```

`targets/watch/`에 SwiftUI `@main` App 하나(「차곡이」 글자만)를 두고 `app.json` plugins에 `"@bacons/apple-targets"`를 더한 뒤:

```bash
npx expo prebuild --clean --platform ios
grep -c "ChagokWatch" ios/*.xcodeproj/project.pbxproj   # 0보다 커야 한다
npx expo prebuild --clean --platform ios && grep -c "ChagokWatch" ios/*.xcodeproj/project.pbxproj   # 다시 해도 남는가
```

위젯 확장(`expo-widgets`)과 함께 빌드되는지 본다: `npx expo run:ios`가 성공하고 위젯이 그대로 뜨는지. 안 되면 설정 플러그인을 직접 쓰는 길(`plugins/widget-goal`처럼)을 시험하고 결과에 둘을 비교해 적는다.

- [ ] **Step 3: 질문 2, WatchConnectivity를 RN 앱에서 쓸 수 있는가**

시험용 로컬 Expo 모듈(`npx create-expo-module@latest --local chagok-watch`)을 만들고 iOS 쪽에 다음만 둔다.
- `WCSession` 활성화, `updateApplicationContext(json)`.
- `didReceiveUserInfo`에서 받은 요청을 앱 그룹 UserDefaults 배열 `watchRequests`에 더한다.
- JS 함수 `readRequests(): string[]`, `ack(ids: string[])`, `send(json: string)`.

워치 쪽에는 버튼 하나(`transferUserInfo(["id": UUID, ...])`)와 받은 applicationContext를 글자로 보여 주는 화면.

확인할 것:
- 폰 앱이 앞에 있을 때 워치 버튼 → `readRequests()`에 보이는가.
- **폰 앱을 완전히 끈 상태**에서 워치 버튼 → 앱을 켜면 `readRequests()`에 남아 있는가(시스템이 앱을 깨우는지, 다음 실행 때 전달되는지).
- `send()` 뒤 워치 화면에 값이 오는가. 목표 50개, 적립판 300칸 크기 JSON(약 30KB)이 한 번에 가는가.

- [ ] **Step 4: 질문 3, 글꼴과 그림을 워치에서 그릴 수 있는가**

`src/design-system/assets/neodgm-1.601.ttf`를 워치 타깃에 넣어 `Font.custom`으로 그리고, `assets/widget-art/color-basic-book.png` 등 PNG 네 개, 차곡이 PNG(`mascot-*.png`), 블록 30개를 한 화면에 그린다. 시뮬레이터에서 블록 떨어지기 애니메이션을 돌려 끊기는지 눈으로 보고, 앱 크기(`.app` 폴더 크기)를 적는다.

- [ ] **Step 5: 질문 4, 시뮬레이터에서 짝지어 도는가**

```bash
xcrun simctl list devicetypes | grep -i "watch"
xcrun simctl list pairs
```

iOS 26.5 iPhone과 Apple Watch(46mm) 시뮬레이터를 짝지어(`xcrun simctl pair <watch> <phone>`) Step 3 흐름을 돌린다. 캡처는 시험 구현 worktree 안 `spike-shots/`에 둔다.

- [ ] **Step 6: 결과 문서 쓰기**

`docs/superpowers/specs/2026-10-16-watch-spike-results.md`(이 브랜치, `chagok-wt-watch`)에 아래 틀로 쓴다. 확인하지 못한 것은 「확인 못 함」으로 적는다.

```markdown
# 워치 시험 구현 결과

2026-10-16. 코드: 브랜치 `spike/watch`(합치지 않는다). 설계: [워치 설계](2026-10-16-watch-growth-design.md)

| 질문 | 결과 | 근거 |
| --- | --- | --- |
| 1. watchOS 타깃 유지 | | |
| 2. WatchConnectivity (앞, 꺼짐, 크기) | | |
| 3. 글꼴과 그림 성능, 앱 크기 | | |
| 4. 시뮬레이터 짝짓기 | | |

## 계획 2가 따를 것

## 확인 못 한 것
```

- [ ] **Step 7: 사용자에게 결과를 보이고 커밋**

시험 구현 결과는 사용자가 읽고 확인한 뒤 커밋한다.

```bash
git add docs/superpowers/specs/2026-10-16-watch-spike-results.md
git commit -m "docs: watch spike results"
```

---

### Task 3: 마지막 칸 완성 요청 (`complete`)

**Files:**
- Modify: `src/widgets/requests.ts`
- Modify: `src/widgets/applyRequests.ts:62-63`
- Test: `__tests__/widgetRequests.test.ts`, `__tests__/applyWidgetRequests.test.ts`

**Interfaces:**
- Consumes: `placeSticker(goalId, slotIndex, stickerType, { complete?, id?, placedAt?, pressedAt? })` (이미 있음, `complete`면 같은 트랜잭션에서 완성)
- Produces:
  - `WidgetRequest`에 `complete?: true`
  - `RequestPlan`의 place에 `complete?: true` (완성할 때만 키가 있다. 기존 `toEqual` 테스트가 그대로 통과한다)

- [ ] **Step 1: 실패하는 테스트 쓰기 (순수 함수)**

`__tests__/widgetRequests.test.ts` 끝에 더한다(파일 위쪽의 `t`, `goal`, `tally`, `st`, `req`, `none`을 쓴다).

```ts
describe('planRequest: 워치 완성 확인 (워치 설계 「마지막 칸」)', () => {
  it('complete가 있으면 적립판 마지막 칸에 붙이고 완성한다', () => {
    const stickers = [0, 1, 2, 3].map((i) => st(`s${i}`, t(2026, 10, 5), i));
    expect(planRequest(tally(), stickers, none, req({ complete: true })))
      .toEqual({ action: 'place', slotIndex: 4, placedAt: t(2026, 10, 6, 9), complete: true });
  });

  it('complete가 없으면 지금처럼 마지막 칸은 건너뛴다', () => {
    const stickers = [0, 1, 2, 3].map((i) => st(`s${i}`, t(2026, 10, 5), i));
    expect(planRequest(tally(), stickers, none, req())).toEqual({ action: 'skip', reason: 'last' });
  });

  it('그사이 칸을 늘려 마지막이 아니면 완성하지 않고 붙이기만 한다 (Review Focus 1)', () => {
    const stickers = [0, 1, 2, 3].map((i) => st(`s${i}`, t(2026, 10, 5), i));
    expect(planRequest(tally({ totalSlots: 10 }), stickers, none, req({ complete: true })))
      .toEqual({ action: 'place', slotIndex: 4, placedAt: t(2026, 10, 6, 9) });
  });

  it('종료일 있는 달력판의 마지막 날도 complete로 완성한다', () => {
    const g = goal({ endDate: '2026-10-06' });
    const stickers = [1, 2, 3, 4, 5].map((d) => st(`s${d}`, t(2026, 10, d), d - 1));
    expect(planRequest(g, stickers, none, req({ complete: true })))
      .toEqual({ action: 'place', slotIndex: 5, placedAt: t(2026, 10, 6, 9), complete: true });
  });
});

describe('isWidgetRequest: complete', () => {
  it('complete는 true만 받는다 (Review Focus 5)', () => {
    expect(isWidgetRequest(req({ complete: true }))).toBe(true);
    expect(isWidgetRequest({ ...req(), complete: 'true' })).toBe(false);
    expect(isWidgetRequest({ ...req(), complete: false })).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/widgetRequests.test.ts -t "complete"`
Expected: FAIL (`complete`가 타입에 없고, 마지막 칸이 skip)

- [ ] **Step 3: 구현**

`src/widgets/requests.ts`에서 타입과 검사를 고친다.

```ts
/**
 * 위젯이 "눌렀다"고 남긴 요청 (위젯 설계 「위젯에서 붙이기」). 위젯 타임라인 props.requests에 쌓인다.
 * dateKey는 누른 순간의 기기 날짜다 — 다음 날 처리해도 누른 날에 붙인다.
 * remove는 적립판 위젯에서 오늘 붙인 칸을 눌러 그 칸을 뗀다(slotIndex, 2026-10-07 결정).
 * complete는 워치가 마지막 칸에서 완성 확인을 받았을 때만 붙는다 (워치 설계, PRD 4.14). 위젯은 쓰지 않는다.
 */
export type WidgetRequest = { id: string; goalId: string; kind: 'add' | 'undo' | 'remove'; at: number; dateKey: DateKey; slotIndex?: number; complete?: true };

export type RequestPlan =
  | { action: 'place'; slotIndex: number; placedAt: number; complete?: true }
  | { action: 'remove'; stickerId: string }
  | { action: 'skip'; reason: 'gone' | 'completed' | 'done' | 'outside' | 'full' | 'last' | 'nothing' | 'record' };

export function isWidgetRequest(v: unknown): v is WidgetRequest {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.id === 'string' && typeof r.goalId === 'string'
    && (r.kind === 'add' || r.kind === 'undo' || (r.kind === 'remove' && Number.isInteger(r.slotIndex) && (r.slotIndex as number) >= 0))
    && typeof r.at === 'number' && typeof r.dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.dateKey)
    && (r.complete === undefined || r.complete === true);
}
```

`planRequest`의 달력판 쪽 `if (completesBoard(goal, stickers.length)) return { action: 'skip', reason: 'last' };`를 바꾼다(바로 아래 기존 `return { action: 'place', ... }` 줄은 그대로).

```ts
    if (completesBoard(goal, stickers.length)) {
      if (!req.complete) return { action: 'skip', reason: 'last' };
      return { action: 'place', slotIndex: Number(req.dateKey.slice(8, 10)) - 1, placedAt: placedAtFor(req.dateKey, req.at), complete: true };
    }
```

적립판 쪽 같은 줄을 바꾼다.

```ts
  if (completesBoard(goal, stickers.length)) {
    if (!req.complete) return { action: 'skip', reason: 'last' };
    return { action: 'place', slotIndex: slot, placedAt: req.at, complete: true };
  }
```

함수 주석 「마지막 칸은 붙이지 않는다 — ...」 줄 끝에 ` 워치가 완성 확인을 받은 요청(complete)만 붙이고 완성한다.`를 더한다.

`src/widgets/applyRequests.ts`의 `placeSticker` 호출에 `complete`를 넘긴다.

```ts
          await placeSticker(goal.id, plan.slotIndex, normalizeStickerId(goal.defaultStickerId), { id: req.id, placedAt: plan.placedAt, pressedAt: req.at, complete: plan.complete });
```

- [ ] **Step 4: 저장까지 테스트 (DB)**

`__tests__/applyWidgetRequests.test.ts` 위쪽 import를 `import { createGoal, deleteGoal, getGoal } from '../src/repositories/goalRepository';`로 바꾸고, `describe` 끝(마지막 `});` 앞)에 더한다.

```ts
  it('워치 완성 요청은 마지막 칸을 붙이고 판을 완성한다', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 2 });
    await placeSticker(g.id, 0);
    const r: WidgetRequest = { ...add(g.id, 'w-last'), complete: true };
    expect(await applyWidgetRequests([r])).toEqual({ handled: ['w-last'], changed: true });
    expect((await getGoal(g.id))!.completedAt).not.toBeNull();
  });

  it('완성 요청이 와도 이미 다 찬 판에는 붙이지 않는다 (Review Focus 1)', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 1 });
    await placeSticker(g.id, 0);
    const r: WidgetRequest = { ...add(g.id, 'w-full'), complete: true };
    expect(await applyWidgetRequests([r])).toEqual({ handled: ['w-full'], changed: false });
    expect(await listStickers(g.id)).toHaveLength(1);
  });
```

- [ ] **Step 5: 통과 확인**

Run: `npx jest __tests__/widgetRequests.test.ts __tests__/applyWidgetRequests.test.ts && npm run typecheck`
Expected: PASS, 타입 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add src/widgets/requests.ts src/widgets/applyRequests.ts __tests__/widgetRequests.test.ts __tests__/applyWidgetRequests.test.ts
git commit -m "feat: complete flag on last-slot requests for the watch"
```

---

### Task 4: 성장 수 (최고치 유지)

**Files:**
- Create: `src/watch/growth.ts`
- Modify: `src/repositories/stickerRepository.ts` (끝에 함수 둘)
- Modify: `src/repositories/appSettingsRepository.ts` (`SettingKey`에 `watchGrowth`)
- Modify: `src/sync/restore.ts` (`applyRestore`, 복원 뒤 지우기)
- Test: `__tests__/watchGrowth.test.ts`

**Interfaces:**
- Consumes: `getSetting`, `setSetting`, `placeSticker`, `removeSticker`, `deleteGoal`, `restoreAll`, `wipeDevice`, `pushOnce`, `FakeServer`, `FakePhotos`(`__tests__/support/fakeServer`)
- Produces:
  - `countAllStickers(): Promise<number>` (stickerRepository)
  - `listRecentStickers(limit: number): Promise<Sticker[]>` (stickerRepository, 붙인 시각 최근순)
  - `nextGrowth(stored: string | null, current: number): number` (growth.ts)
  - `updateGrowth(): Promise<number>` (growth.ts, 계산해서 저장하고 돌려준다)

- [ ] **Step 1: 실패하는 테스트 쓰기**

`__tests__/watchGrowth.test.ts`

```ts
import { createGoal, deleteGoal } from '../src/repositories/goalRepository';
import { listRecentStickers, placeSticker, removeSticker } from '../src/repositories/stickerRepository';
import { getSetting } from '../src/repositories/appSettingsRepository';
import { getDb } from '../src/db/client';
import { pushOnce } from '../src/sync/push';
import { restoreAll } from '../src/sync/restore';
import { wipeDevice } from '../src/sync/wipe';
import { nextGrowth, updateGrowth } from '../src/watch/growth';
import { FakePhotos, FakeServer } from './support/fakeServer';
import { withFreshDb } from './support/setup';

withFreshDb();

describe('nextGrowth', () => {
  it('저장된 값과 지금 수 중 큰 값', () => {
    expect(nextGrowth(null, 4)).toBe(4);
    expect(nextGrowth('7', 4)).toBe(7);
    expect(nextGrowth('3', 4)).toBe(4);
  });

  it('깨진 값은 무시한다', () => {
    expect(nextGrowth('abc', 4)).toBe(4);
    expect(nextGrowth('-2', 0)).toBe(0);
  });
});

describe('updateGrowth (워치 설계 「성장 수」)', () => {
  it('처음에는 지금까지 붙인 스티커 전체, 완성한 판도 센다', async () => {
    const a = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 1 });
    const b = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 5 });
    await placeSticker(a.id, 0, undefined, { complete: true });
    await placeSticker(b.id, 0);
    expect(await updateGrowth()).toBe(2);
    expect(await getSetting('watchGrowth')).toBe('2');
  });

  it('떼고 다시 붙여도, 목표를 지워도 줄거나 늘지 않는다 (Review Focus 2)', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 10 });
    for (let i = 0; i < 4; i++) await placeSticker(g.id, i);
    const fifth = await placeSticker(g.id, 4);
    expect(await updateGrowth()).toBe(5);
    await removeSticker(fifth.id);
    expect(await updateGrowth()).toBe(5);
    await placeSticker(g.id, 4);
    expect(await updateGrowth()).toBe(5);
    await deleteGoal(g.id);
    expect(await updateGrowth()).toBe(5);
  });

  it('기기를 비우면 0부터 (Review Focus 3)', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 10 });
    await placeSticker(g.id, 0);
    await updateGrowth();
    await wipeDevice(() => {});
    expect(await updateGrowth()).toBe(0);
  });

  it('복원하면 복원된 스티커 수부터 (Review Focus 3)', async () => {
    const server = new FakeServer();
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 10 });
    await placeSticker(g.id, 0);
    await pushOnce({ server, photos: new FakePhotos(), deviceId: 'old' });
    for (let i = 1; i < 6; i++) await placeSticker(g.id, i); // 백업하지 않은 5개
    expect(await updateGrowth()).toBe(6);
    const db = await getDb();
    await db.exec('DELETE FROM records; DELETE FROM stickers; DELETE FROM goals; DELETE FROM outbox;');
    await restoreAll(server);
    expect(await updateGrowth()).toBe(1);
  });
});

describe('listRecentStickers', () => {
  it('목표와 상관없이 붙인 시각 최근순', async () => {
    const a = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 5 });
    const b = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 5 });
    await placeSticker(a.id, 0, 'basic.book', { placedAt: 1000 });
    await placeSticker(b.id, 0, 'sports_normal.walk', { placedAt: 3000 });
    await placeSticker(a.id, 1, 'basic.book', { placedAt: 2000 });
    expect((await listRecentStickers(2)).map((s) => s.placedAt)).toEqual([3000, 2000]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/watchGrowth.test.ts`
Expected: FAIL (`Cannot find module '../src/watch/growth'`)

- [ ] **Step 3: 저장소 함수 더하기**

`src/repositories/stickerRepository.ts` 끝에 더한다. 여러 행을 읽는 메서드 이름은 같은 파일 `listStickers`가 쓰는 것을 따른다(아래는 `db.all`로 적었다).

```ts
/** 기기에 **현재 붙어 있는** 스티커 전체 수. 완성한 판도 센다. 워치 성장 수의 바탕이다 (PRD 4.14). */
export async function countAllStickers(): Promise<number> {
  const db = await getDb();
  const row = await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM stickers');
  return row?.n ?? 0;
}

/** 목표와 상관없이 붙인 시각 최근순. 워치 머리 위 블록 색에 쓴다. */
export async function listRecentStickers(limit: number): Promise<Sticker[]> {
  const db = await getDb();
  const rows = await db.all<StickerRow>('SELECT * FROM stickers ORDER BY placed_at DESC, id DESC LIMIT ?', limit);
  return rows.map(toSticker);
}
```

`src/repositories/appSettingsRepository.ts`의 `SettingKey` 마지막 줄 `| 'adChildDirected';`를 아래로 바꾼다.

```ts
  | 'adChildDirected'
  /** 워치 성장 수(블록 수). 지금 붙어 있는 스티커 수보다 작아지지 않는다. 복원하면 지운다 (PRD 4.14) */
  | 'watchGrowth';
```

- [ ] **Step 4: 성장 수 모듈**

`src/watch/growth.ts`

```ts
import { getSetting, setSetting } from '../repositories/appSettingsRepository';
import { countAllStickers } from '../repositories/stickerRepository';

/**
 * 성장 수 = max(저장된 최고치, 지금 붙어 있는 스티커 전체 수) (워치 설계 「성장 수」, PRD 4.14).
 * 떼거나 판을 지워도 줄지 않고, 뗀 칸에 다시 붙여도 늘지 않는다.
 */
export function nextGrowth(stored: string | null, current: number): number {
  const n = Number(stored);
  return Number.isInteger(n) && n > current ? n : current;
}

/** 지금 성장 수를 계산해 저장하고 돌려준다. 기록이 바뀔 때마다 부른다 — 지우기 전에 센 값이 남아야 줄지 않는다. */
export async function updateGrowth(): Promise<number> {
  const stored = await getSetting('watchGrowth');
  const growth = nextGrowth(stored, await countAllStickers());
  if (stored !== String(growth)) await setSetting('watchGrowth', String(growth));
  return growth;
}
```

- [ ] **Step 5: 복원 뒤 지우기**

`src/sync/restore.ts`의 `applyRestore`에서 `await setSetting('lastSyncedAt', String(Date.now()));` 바로 뒤에 더한다.

```ts
  await setSetting('watchGrowth', null); // 성장 수는 복원된 스티커 수부터 다시 센다 (PRD 4.14)
```

(로그아웃의 `wipeDevice`는 `deviceId` 말고 설정을 모두 지우므로 고치지 않는다.)

- [ ] **Step 6: 통과 확인**

Run: `npx jest __tests__/watchGrowth.test.ts __tests__/restore.test.ts __tests__/wipe.test.ts && npm run typecheck`
Expected: PASS

- [ ] **Step 7: 커밋**

```bash
git add src/watch/growth.ts src/repositories/stickerRepository.ts src/repositories/appSettingsRepository.ts src/sync/restore.ts __tests__/watchGrowth.test.ts
git commit -m "feat: watch growth count that never goes down"
```

---

### Task 5: 블록 색

**Files:**
- Modify: `scripts/build-widget-art.mjs` (컬러 스티커 반복문)
- Create (생성): `src/watch/stickerColors.generated.ts`
- Create: `src/watch/blockColor.ts`
- Test: `__tests__/watchBlockColor.test.ts`

**Interfaces:**
- Consumes: `src/stickers/color/source/sticker-packs-24.json` (스티커마다 `layers[]`, `layers[0]`은 윤곽선), `colorStickerData`(`src/stickers/color/stickers.generated.ts`), `normalizeStickerId`
- Produces:
  - `stickerBlockColors: Record<string, string>` (생성 파일, 값은 `#RRGGBB` 대문자)
  - `blockColorOf(stickerId: string): string`
  - `FALLBACK_BLOCK_COLORS: readonly string[]` (민트, 아이보리, 살구. 차곡이 머리 위 판 색과 같다)

- [ ] **Step 1: 실패하는 테스트 쓰기**

`__tests__/watchBlockColor.test.ts`

```ts
import { colorStickerData } from '../src/stickers/color/stickers.generated';
import { stickerBlockColors } from '../src/watch/stickerColors.generated';
import { blockColorOf, FALLBACK_BLOCK_COLORS } from '../src/watch/blockColor';

describe('블록 색 (워치 설계 「블록 색」)', () => {
  it('컬러 스티커마다 색이 하나씩 있다', () => {
    for (const s of colorStickerData) expect(stickerBlockColors[s.id]).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('윤곽선 색은 고르지 않는다', () => {
    for (const s of colorStickerData) expect(stickerBlockColors[s.id]).not.toBe(s.layers[0].color);
  });

  it('예전 흑백 id도 컬러로 옮겨 찾는다', () => {
    expect(blockColorOf('sprout')).toBe(stickerBlockColors['basic.sprout']);
  });

  it('모르는 id는 기본 색', () => {
    expect(FALLBACK_BLOCK_COLORS).toContain(blockColorOf('nope.nope'));
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/watchBlockColor.test.ts`
Expected: FAIL (`Cannot find module '../src/watch/stickerColors.generated'`)

- [ ] **Step 3: 스크립트에서 색 뽑기**

먼저 `layers[0]`이 정말 윤곽선인지 본다.

Run: `node -e "const s=require('./src/stickers/color/source/sticker-packs-24.json').stickers;console.log(new Set(s.map(x=>x.layers[0].color)))"`
Expected: 어두운 색 한두 개(`#1e1a2e` 등)뿐. 밝은 색이 섞여 나오면 멈추고 사용자에게 알린다.

`scripts/build-widget-art.mjs`의 컬러 스티커 반복문(`const stickerArt = [];`부터 반복문 끝까지)을 아래로 바꾼다. 칸 수가 가장 많은 색(윤곽선 제외)을 고른다.

```js
const stickerArt = [];
const blockColors = [];
for (const s of src.stickers) {
  const pack = PACK_IDS[s.theme] ?? s.theme;
  const name = STICKER_IDS[`${s.theme}.${s.id}`] ?? s.id;
  const grid = new Map();
  for (const l of s.layers) for (const [, x, y, w] of l.d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+Z/g))
    for (let i = 0; i < Number(w); i++) grid.set(`${Number(x) + i},${y}`, l.color);
  png(`color-${pack}-${name}`, 24, 24, (x, y) => grid.get(`${x},${y}`) ?? null);
  stickerArt.push(`  '${pack}.${name}': require('../../assets/widget-art/color-${pack}-${name}.png'),`);
  // 워치 블록 색: 윤곽선(첫 층)을 빼고 칸을 가장 많이 차지한 색 (워치 설계 「블록 색」)
  const counts = new Map();
  for (const c of grid.values()) if (c !== s.layers[0].color) counts.set(c, (counts.get(c) ?? 0) + 1);
  const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  blockColors.push(`  '${pack}.${name}': '${(top?.[0] ?? s.layers[0].color).toUpperCase()}',`);
}
```

`widgetStickerArt.generated.ts`를 쓰는 `fs.writeFileSync` 바로 뒤에 더한다.

```js
fs.mkdirSync('src/watch', { recursive: true });
fs.writeFileSync('src/watch/stickerColors.generated.ts', `// 생성 파일 — 직접 고치지 않는다. node scripts/build-widget-art.mjs로 다시 만든다.
// 워치 블록 색: 컬러 스티커 ID → 대표색 하나.
export const stickerBlockColors: Record<string, string> = {
${blockColors.join('\n')}
};
`);
```

Run: `node scripts/build-widget-art.mjs && git status --short assets/widget-art src/widgets/widgetStickerArt.generated.ts`
Expected: 출력 없음(기존 PNG와 위젯 생성 파일은 그대로). `src/watch/stickerColors.generated.ts`가 새로 생긴다.

- [ ] **Step 4: 찾기 함수**

기본 색은 디자인 토큰의 민트, 아이보리, 살구 값을 쓴다. 먼저 값을 확인한다.

Run: `grep -n -i "mint\|ivory\|apricot\|peach" src/design-system/tokens.ts | head -20`

`src/watch/blockColor.ts` (아래 세 값이 토큰과 다르면 토큰 값으로 바꾼다)

```ts
import { normalizeStickerId } from '../stickers/stickerIds';
import { stickerBlockColors } from './stickerColors.generated';

/** 색을 모를 때 돌려 쓰는 기본 색. 차곡이 머리 위 판 세 장(민트, 아이보리, 살구)과 같다 (PRD 4.11). */
export const FALLBACK_BLOCK_COLORS = ['#AFE1CB', '#FFF8E8', '#F7C8A0'] as const;

/** 그 스티커의 블록 색 (PRD 4.14). 예전 흑백 id는 컬러로 옮겨 찾는다. */
export function blockColorOf(stickerId: string): string {
  return stickerBlockColors[normalizeStickerId(stickerId)] ?? FALLBACK_BLOCK_COLORS[0];
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx jest __tests__/watchBlockColor.test.ts __tests__/widgetArt.test.ts && npm run typecheck`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add scripts/build-widget-art.mjs src/watch/stickerColors.generated.ts src/watch/blockColor.ts __tests__/watchBlockColor.test.ts
git commit -m "feat: block color per sticker for the watch"
```

---

### Task 6: 워치 스냅샷 (순수 함수)

**Files:**
- Create: `src/watch/snapshot.ts`
- Modify: `src/widgets/snapshot.ts` (`function remainingOf` → `export function remainingOf`)
- Test: `__tests__/watchSnapshot.test.ts`

**Interfaces:**
- Consumes: `remainingOf(goal, placedAll): number | null` (widgets/snapshot), `orderGoals`, `inPeriod`, `startDate`, `dateKeyOf`, `daysInMonth`, `localDateKey`, `nextMidnight`(widgets/widgetProps), `normalizeStickerId`, `blockColorOf`
- Produces:

```ts
export type WatchTallyCell = 'placed' | 'placedToday' | 'empty';
export type WatchDay = 'placed' | 'placedToday' | 'empty' | 'future' | 'outside';
export type WatchBoard =
  | { type: 'tally'; cells: WatchTallyCell[]; recorded: number[] }
  | { type: 'calendar'; year: number; month: number; firstWeekday: number; days: WatchDay[]; recorded: number[]; startDate: DateKey; endDate: DateKey | null };
export type WatchGoal = { id: string; name: string; sticker: string; color: string; remaining: number | null; locked: boolean; board: WatchBoard };
export type WatchDayView = { today: DateKey; goals: WatchGoal[] };
export type WatchSnapshot = WatchDayView & { v: 1; growth: number; recentColors: string[]; lastGoalId: string | null; afterMidnight: WatchDayView };
export type WatchStickerInput = { slotIndex: number; dateKey: DateKey; recorded: boolean };
export type WatchInput = { goal: Goal; stickers: WatchStickerInput[]; placedAll: number; usableUntil: number | null };
export function buildWatchDay(inputs: readonly WatchInput[], now: Date): WatchDayView;
export function buildWatchSnapshot(args: { now: WatchInput[]; afterMidnight: WatchInput[]; growth: number; recentStickers: string[]; date: Date }): WatchSnapshot;
```

`stickers`는 적립판이면 그 목표의 전체, 달력판이면 그 시점이 속한 달의 것이다. `recorded`의 숫자는 적립판이면 칸 번호, 달력판이면 날짜 - 1.

- [ ] **Step 1: 실패하는 테스트 쓰기**

`__tests__/watchSnapshot.test.ts`

```ts
import type { Goal } from '../src/domain/types';
import { buildWatchDay, buildWatchSnapshot } from '../src/watch/snapshot';
import type { WatchInput } from '../src/watch/snapshot';
import { blockColorOf } from '../src/watch/blockColor';

const t = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 'g', name: '산책', boardType: 'calendar', totalSlots: null, defaultStickerId: 'sports_normal.walk',
  createdAt: t(2026, 10, 3), endDate: null, completedAt: null, completionSeen: false,
  lastPlacedAt: null, initialSlots: null, ...over,
});
const tally = (over: Partial<Goal> = {}) => goal({ id: 't', name: '독서', boardType: 'tally', totalSlots: 12, defaultStickerId: 'basic.book', ...over });
const input = (g: Goal, stickers: WatchInput['stickers'] = [], over: Partial<WatchInput> = {}): WatchInput =>
  ({ goal: g, stickers, placedAll: stickers.length, usableUntil: null, ...over });

describe('buildWatchDay: 적립판', () => {
  it('칸마다 지난날 붙임, 오늘 붙임, 빈칸과 기록 칸', () => {
    const now = new Date(t(2026, 10, 16));
    const view = buildWatchDay([input(tally(), [
      { slotIndex: 0, dateKey: '2026-10-15', recorded: true },
      { slotIndex: 1, dateKey: '2026-10-16', recorded: false },
    ])], now);
    const board = view.goals[0].board;
    if (board.type !== 'tally') throw new Error('tally');
    expect(board.cells.slice(0, 3)).toEqual(['placed', 'placedToday', 'empty']);
    expect(board.cells).toHaveLength(12);
    expect(board.recorded).toEqual([0]);
    expect(view.goals[0].remaining).toBe(10);
    expect(view.goals[0].color).toBe(blockColorOf('basic.book'));
  });
});

describe('buildWatchDay: 달력판', () => {
  it('이번 달 날짜별 상태, 시작 전은 outside, 앞날은 future', () => {
    const now = new Date(t(2026, 10, 16));
    const view = buildWatchDay([input(goal(), [
      { slotIndex: 4, dateKey: '2026-10-05', recorded: false },
      { slotIndex: 15, dateKey: '2026-10-16', recorded: true },
    ])], now);
    const board = view.goals[0].board;
    if (board.type !== 'calendar') throw new Error('calendar');
    expect(board).toMatchObject({ year: 2026, month: 10, firstWeekday: 4, startDate: '2026-10-03', endDate: null, recorded: [15] });
    expect(board.days).toHaveLength(31);
    expect(board.days[1]).toBe('outside');      // 10/2, 시작 전
    expect(board.days[3]).toBe('empty');        // 10/4, 지난 빈 날
    expect(board.days[4]).toBe('placed');       // 10/5
    expect(board.days[15]).toBe('placedToday'); // 10/16
    expect(board.days[16]).toBe('future');      // 10/17
    expect(view.goals[0].remaining).toBeNull(); // 종료일 없음
  });

  it('종료일 뒤는 outside, 남은 칸은 기간 기준', () => {
    const now = new Date(t(2026, 10, 16));
    const view = buildWatchDay([input(goal({ endDate: '2026-10-20' }), [], { placedAll: 3 })], now);
    const board = view.goals[0].board;
    if (board.type !== 'calendar') throw new Error('calendar');
    expect(board.days[20]).toBe('outside');   // 10/21
    expect(view.goals[0].remaining).toBe(15); // 10/3~10/20 = 18일 - 3
  });
});

describe('buildWatchDay: 목록', () => {
  it('완성한 판은 빼고, 마지막으로 붙인 순', () => {
    const now = new Date(t(2026, 10, 16));
    const view = buildWatchDay([
      input(goal({ id: 'a', lastPlacedAt: t(2026, 10, 10) })),
      input(goal({ id: 'b', lastPlacedAt: t(2026, 10, 15) })),
      input(goal({ id: 'c', completedAt: t(2026, 10, 14) })),
    ], now);
    expect(view.goals.map((g) => g.id)).toEqual(['b', 'a']);
  });

  it('체험이 끝난 기본 스티커면 locked', () => {
    const now = new Date(t(2026, 10, 16));
    expect(buildWatchDay([input(goal(), [], { usableUntil: t(2026, 10, 15) })], now).goals[0].locked).toBe(true);
    expect(buildWatchDay([input(goal(), [], { usableUntil: t(2026, 10, 17) })], now).goals[0].locked).toBe(false);
  });
});

describe('buildWatchSnapshot', () => {
  it('성장 수, 최근 블록 색, 마지막으로 붙인 목표', () => {
    const date = new Date(t(2026, 10, 16, 23, 59));
    const a = goal({ id: 'a', lastPlacedAt: t(2026, 10, 10) });
    const b = tally({ id: 'b', lastPlacedAt: t(2026, 10, 16, 9) });
    const s = buildWatchSnapshot({
      now: [input(a), input(b)], afterMidnight: [input(a), input(b)],
      growth: 7, recentStickers: ['basic.book', 'sports_normal.walk'], date,
    });
    expect(s).toMatchObject({ v: 1, today: '2026-10-16', growth: 7, lastGoalId: 'b' });
    expect(s.recentColors).toEqual([blockColorOf('basic.book'), blockColorOf('sports_normal.walk')]);
    expect(s.afterMidnight.today).toBe('2026-10-17');
  });

  it('아무것도 붙이지 않았으면 lastGoalId는 null', () => {
    const s = buildWatchSnapshot({ now: [input(goal())], afterMidnight: [input(goal())], growth: 0, recentStickers: [], date: new Date(t(2026, 10, 16)) });
    expect(s.lastGoalId).toBeNull();
  });

  it('자정 뒤에는 오늘 붙인 칸이 지난 칸이 된다 (Review Focus 4)', () => {
    const date = new Date(t(2026, 10, 16, 23, 59));
    const stickers = [{ slotIndex: 0, dateKey: '2026-10-16', recorded: false }];
    const s = buildWatchSnapshot({ now: [input(tally(), stickers)], afterMidnight: [input(tally(), stickers)], growth: 1, recentStickers: [], date });
    const before = s.goals[0].board;
    const after = s.afterMidnight.goals[0].board;
    if (before.type !== 'tally' || after.type !== 'tally') throw new Error('tally');
    expect(before.cells[0]).toBe('placedToday');
    expect(after.cells[0]).toBe('placed');
  });

  it('10월 31일 자정 뒤는 11월 달력 (Review Focus 4)', () => {
    const date = new Date(t(2026, 10, 31, 23, 59));
    const s = buildWatchSnapshot({ now: [input(goal())], afterMidnight: [input(goal())], growth: 0, recentStickers: [], date });
    const after = s.afterMidnight.goals[0].board;
    if (after.type !== 'calendar') throw new Error('calendar');
    expect([after.year, after.month, after.days.length]).toEqual([2026, 11, 30]);
    expect(after.days[0]).toBe('empty'); // 11/1 = 그날 오늘, 빈칸
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/watchSnapshot.test.ts`
Expected: FAIL (`Cannot find module '../src/watch/snapshot'`)

- [ ] **Step 3: `remainingOf` 내보내기**

`src/widgets/snapshot.ts`의 `function remainingOf(`를 `export function remainingOf(`로 바꾼다.

- [ ] **Step 4: 구현**

`src/watch/snapshot.ts`

```ts
import type { Goal } from '../domain/types';
import type { DateKey } from '../domain/dates';
import { dateKeyOf, daysInMonth, localDateKey } from '../domain/dates';
import { inPeriod, orderGoals, startDate } from '../domain/board';
import { normalizeStickerId } from '../stickers/stickerIds';
import { remainingOf } from '../widgets/snapshot';
import { nextMidnight } from '../widgets/widgetProps';
import { blockColorOf } from './blockColor';

/** 칸 상태 (워치 설계 「워치 스냅샷」). 지난날 붙인 칸은 워치에서 떼지 않는다. */
export type WatchTallyCell = 'placed' | 'placedToday' | 'empty';
/** 달력판 날짜 상태. empty는 시작일부터 오늘까지의 빈 날(붙일 수 있다), future는 앞날 */
export type WatchDay = 'placed' | 'placedToday' | 'empty' | 'future' | 'outside';
export type WatchBoard =
  | { type: 'tally'; cells: WatchTallyCell[]; /** 기록(사진, 메모)이 있는 칸 번호 */ recorded: number[] }
  | { type: 'calendar'; year: number; month: number; firstWeekday: number; days: WatchDay[]; /** 기록이 있는 날짜 - 1 */ recorded: number[]; startDate: DateKey; endDate: DateKey | null };
export type WatchGoal = {
  id: string; name: string; sticker: string;
  /** 블록 색 (PRD 4.14) */
  color: string;
  /** 완성까지 남은 칸. 1이면 다음이 마지막 칸이라 워치가 완성 확인을 띄운다. 종료일 없는 달력판은 null */
  remaining: number | null;
  /** 기본 스티커 묶음 체험이 끝났다. 워치는 붙이지 않는다 (PRD 4.12) */
  locked: boolean;
  board: WatchBoard;
};
export type WatchDayView = { today: DateKey; goals: WatchGoal[] };
/** 폰이 워치에 보내는 값 하나 (updateApplicationContext). 자정 뒤 값을 함께 보내 폰을 열지 않아도 날이 바뀐다. */
export type WatchSnapshot = WatchDayView & {
  v: 1;
  /** 성장 수 = 블록 수 (growth.ts) */
  growth: number;
  /** 최근 붙인 스티커의 블록 색, 최근순. 머리 위 블록 색에 쓴다 */
  recentColors: string[];
  /** 마지막으로 붙인 진행 중 목표. 차곡이 화면 아래 작은 판 */
  lastGoalId: string | null;
  afterMidnight: WatchDayView;
};

export type WatchStickerInput = { slotIndex: number; dateKey: DateKey; recorded: boolean };
/** stickers: 적립판은 그 목표 전체, 달력판은 그 시점이 속한 달. placedAll: 그 목표에 붙어 있는 전체 수 */
export type WatchInput = { goal: Goal; stickers: WatchStickerInput[]; placedAll: number; usableUntil: number | null };

function tallyBoard(goal: Goal, stickers: readonly WatchStickerInput[], today: DateKey): WatchBoard {
  const bySlot = new Map(stickers.map((s) => [s.slotIndex, s]));
  const cells: WatchTallyCell[] = [];
  for (let i = 0; i < (goal.totalSlots ?? 0); i++) {
    const s = bySlot.get(i);
    cells.push(!s ? 'empty' : s.dateKey === today ? 'placedToday' : 'placed');
  }
  return { type: 'tally', cells, recorded: stickers.filter((s) => s.recorded).map((s) => s.slotIndex).sort((a, b) => a - b) };
}

function calendarBoard(goal: Goal, stickers: readonly WatchStickerInput[], now: Date): WatchBoard {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = localDateKey(now.getTime());
  const byDate = new Map(stickers.map((s) => [s.dateKey, s]));
  const days: WatchDay[] = [];
  const recorded: number[] = [];
  for (let d = 1; d <= daysInMonth(year, month); d++) {
    const key = dateKeyOf(year, month, d);
    const s = byDate.get(key);
    if (s?.recorded) recorded.push(d - 1);
    days.push(!inPeriod(goal, key) ? 'outside' : s ? (key === today ? 'placedToday' : 'placed') : key > today ? 'future' : 'empty');
  }
  return { type: 'calendar', year, month, firstWeekday: new Date(year, month - 1, 1).getDay(), days, recorded, startDate: startDate(goal), endDate: goal.endDate };
}

/** 그 시점의 목표 목록. 진행 중인 목표만, 앱 목록과 같은 순서(마지막으로 붙인 순, PRD 4.1). */
export function buildWatchDay(inputs: readonly WatchInput[], now: Date): WatchDayView {
  const today = localDateKey(now.getTime());
  const byId = new Map(inputs.map((i) => [i.goal.id, i]));
  const { active } = orderGoals(inputs.map((i) => i.goal));
  const goals = active.map((goal): WatchGoal => {
    const input = byId.get(goal.id)!;
    const sticker = normalizeStickerId(goal.defaultStickerId);
    return {
      id: goal.id,
      name: goal.name,
      sticker,
      color: blockColorOf(sticker),
      remaining: remainingOf(goal, input.placedAll),
      locked: input.usableUntil != null && now.getTime() >= input.usableUntil,
      board: goal.boardType === 'calendar' ? calendarBoard(goal, input.stickers, now) : tallyBoard(goal, input.stickers, today),
    };
  });
  return { today, goals };
}

export function buildWatchSnapshot(args: { now: WatchInput[]; afterMidnight: WatchInput[]; growth: number; recentStickers: string[]; date: Date }): WatchSnapshot {
  const day = buildWatchDay(args.now, args.date);
  const placed = args.now.map((i) => i.goal).filter((g) => g.completedAt === null && g.lastPlacedAt !== null);
  const last = placed.reduce<Goal | null>((a, g) => (a === null || g.lastPlacedAt! > a.lastPlacedAt! ? g : a), null);
  return {
    v: 1,
    ...day,
    growth: args.growth,
    recentColors: args.recentStickers.map(blockColorOf),
    lastGoalId: last?.id ?? null,
    afterMidnight: buildWatchDay(args.afterMidnight, nextMidnight(args.date)),
  };
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx jest __tests__/watchSnapshot.test.ts __tests__/widgetSnapshot.test.ts && npm run typecheck`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add src/watch/snapshot.ts src/widgets/snapshot.ts __tests__/watchSnapshot.test.ts
git commit -m "feat: watch snapshot builder"
```

---

### Task 7: 스냅샷 입력을 DB에서 읽기

**Files:**
- Create: `src/watch/loadSnapshot.ts`
- Test: `__tests__/loadWatchSnapshot.test.ts`

**Interfaces:**
- Consumes: `listGoals`, `listStickers`, `listStickersInMonth`, `listRecordedStickerIds(goalId): Promise<Set<string>>`, `listPackAccess`, `stickerUsableUntil(goal, access, nowMs)`, `listRecentStickers`, `isCompleted`, `buildWatchSnapshot`, `nextMidnight`
- Produces:
  - `loadWatchInputs(date: Date): Promise<WatchInput[]>`
  - `loadWatchSnapshot(date: Date, growth: number): Promise<WatchSnapshot>`

- [ ] **Step 1: 실패하는 테스트 쓰기**

`__tests__/loadWatchSnapshot.test.ts`

```ts
import { createGoal } from '../src/repositories/goalRepository';
import { placeSticker } from '../src/repositories/stickerRepository';
import { upsertRecord } from '../src/repositories/recordRepository';
import { loadWatchInputs, loadWatchSnapshot } from '../src/watch/loadSnapshot';
import { withFreshDb } from './support/setup';

withFreshDb();

describe('loadWatchInputs', () => {
  it('적립판은 전체 스티커와 기록 여부를 읽는다', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 5 });
    const s = await placeSticker(g.id, 0);
    await upsertRecord(s.id, { memo: '좋았다', photoUri: null });
    await placeSticker(g.id, 1);
    const [input] = await loadWatchInputs(new Date());
    expect(input.placedAll).toBe(2);
    expect([...input.stickers].sort((a, b) => a.slotIndex - b.slotIndex).map((x) => [x.slotIndex, x.recorded]))
      .toEqual([[0, true], [1, false]]);
  });

  it('완성한 판은 읽지 않는다', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 1 });
    await placeSticker(g.id, 0, undefined, { complete: true });
    expect(await loadWatchInputs(new Date())).toEqual([]);
  });
});

describe('loadWatchSnapshot', () => {
  it('성장 수와 최근 블록 색을 담는다', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 5 });
    await placeSticker(g.id, 0, 'basic.book');
    const s = await loadWatchSnapshot(new Date(), 9);
    expect(s.growth).toBe(9);
    expect(s.recentColors).toHaveLength(1);
    expect(s.goals.map((x) => x.id)).toEqual([g.id]);
    expect(s.lastGoalId).toBe(g.id);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/loadWatchSnapshot.test.ts`
Expected: FAIL (`Cannot find module '../src/watch/loadSnapshot'`)

- [ ] **Step 3: 구현**

`stickerUsableUntil`의 시그니처를 `src/app-data/placeGate.ts`에서 확인한다(`src/widgets/loadSnapshot.ts`가 `stickerUsableUntil(goal, access, now.getTime())`로 부른다). 다르면 그 호출을 따른다.

`src/watch/loadSnapshot.ts`

```ts
import { listGoals } from '../repositories/goalRepository';
import { listRecentStickers, listStickers, listStickersInMonth } from '../repositories/stickerRepository';
import { listRecordedStickerIds } from '../repositories/recordRepository';
import { listPackAccess } from '../repositories/packRepository';
import { stickerUsableUntil } from '../app-data/placeGate';
import { isCompleted } from '../domain/board';
import { nextMidnight } from '../widgets/widgetProps';
import { buildWatchSnapshot } from './snapshot';
import type { WatchInput, WatchSnapshot } from './snapshot';

/** 머리 위 블록은 0~2개다. 셋째가 막 묶였을 때 그 묶음 색까지 보이도록 셋을 보낸다. */
const RECENT = 3;

/** 진행 중인 목표의 워치 입력. 달력판은 date가 속한 달만 보이고, 남은 칸은 전체 수로 센다. */
export async function loadWatchInputs(date: Date): Promise<WatchInput[]> {
  const goals = (await listGoals()).filter((g) => !isCompleted(g));
  const access = await listPackAccess();
  const inputs: WatchInput[] = [];
  for (const goal of goals) {
    const recorded = await listRecordedStickerIds(goal.id);
    const all = await listStickers(goal.id);
    const shown = goal.boardType === 'tally' ? all : await listStickersInMonth(goal.id, date.getFullYear(), date.getMonth() + 1);
    inputs.push({
      goal,
      stickers: shown.map((s) => ({ slotIndex: s.slotIndex, dateKey: s.dateKey, recorded: recorded.has(s.id) })),
      placedAll: all.length,
      usableUntil: stickerUsableUntil(goal, access, date.getTime()),
    });
  }
  return inputs;
}

export async function loadWatchSnapshot(date: Date, growth: number): Promise<WatchSnapshot> {
  const midnight = nextMidnight(date);
  const now = await loadWatchInputs(date);
  const afterMidnight = midnight.getMonth() === date.getMonth() ? now : await loadWatchInputs(midnight);
  const recentStickers = (await listRecentStickers(RECENT)).map((s) => s.stickerType);
  return buildWatchSnapshot({ now, afterMidnight, growth, recentStickers, date });
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest __tests__/loadWatchSnapshot.test.ts && npm run typecheck`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/watch/loadSnapshot.ts __tests__/loadWatchSnapshot.test.ts
git commit -m "feat: load watch snapshot inputs from the device db"
```

---

### Task 8: 워치 동기화 한 번과 앱 연결

**Files:**
- Create: `src/watch/syncCore.ts`
- Create: `src/watch/watchPort.ts`
- Create: `src/watch/syncWatch.ts`
- Modify: `app/_layout.tsx` (import 줄과 77~81행 effect)
- Test: `__tests__/watchSyncCore.test.ts`

**Interfaces:**
- Consumes: `isWidgetRequest`, `WidgetRequest`, `applyWidgetRequests`, `updateGrowth`, `loadWatchSnapshot`, `createSyncRunner(once, onError)`(widgets/syncRunner), `subscribeLocalChange`
- Produces:

```ts
export type WatchPort = {
  readRequests(): Promise<unknown[]>;
  ack(ids: string[]): Promise<void>;
  send(snapshot: WatchSnapshot): Promise<void>;
};
export type WatchSyncDeps = {
  port: WatchPort | null;
  apply(requests: WidgetRequest[]): Promise<{ handled: string[]; changed: boolean }>;
  growth(): Promise<number>;
  snapshot(date: Date, growth: number): Promise<WatchSnapshot>;
  now(): Date;
};
export function syncWatchOnce(deps: WatchSyncDeps): Promise<{ changed: boolean }>; // syncCore.ts
export function watchPort(): WatchPort | null;                                      // watchPort.ts
export function startWatchSync(): () => void;                                       // syncWatch.ts
```

- [ ] **Step 1: 실패하는 테스트 쓰기**

`__tests__/watchSyncCore.test.ts`

```ts
import { syncWatchOnce } from '../src/watch/syncCore';
import type { WatchPort, WatchSyncDeps } from '../src/watch/syncCore';
import type { WatchSnapshot } from '../src/watch/snapshot';
import type { WidgetRequest } from '../src/widgets/requests';

const req = (id: string): WidgetRequest => ({ id, goalId: 'g', kind: 'add', at: 1, dateKey: '2026-10-16' });
const snap = (growth: number) => ({ v: 1, growth } as unknown as WatchSnapshot);

function fakePort(queue: unknown[]) {
  const sent: WatchSnapshot[] = [];
  const acked: string[][] = [];
  const port: WatchPort = {
    readRequests: async () => queue,
    ack: async (ids) => { acked.push(ids); },
    send: async (s) => { sent.push(s); },
  };
  return { port, sent, acked };
}

function deps(over: Partial<WatchSyncDeps>): WatchSyncDeps {
  return {
    port: null,
    apply: async (rs) => ({ handled: rs.map((r) => r.id), changed: rs.length > 0 }),
    growth: async () => 5,
    snapshot: async (_d, g) => snap(g),
    now: () => new Date(2026, 9, 16),
    ...over,
  };
}

describe('syncWatchOnce', () => {
  it('요청을 처리하고 처리한 것만 지운 뒤, 성장 수를 담은 스냅샷을 보낸다', async () => {
    const { port, sent, acked } = fakePort([req('w1'), req('w2')]);
    const apply = jest.fn(async () => ({ handled: ['w1'], changed: true }));
    const out = await syncWatchOnce(deps({ port, apply }));
    expect(apply).toHaveBeenCalledWith([req('w1'), req('w2')]);
    expect(acked).toEqual([['w1']]);
    expect(sent.map((s) => s.growth)).toEqual([5]);
    expect(out).toEqual({ changed: true });
  });

  it('모양이 틀린 요청은 버리고 같은 id는 한 번만 넘긴다 (Review Focus 5)', async () => {
    const { port } = fakePort([req('w1'), req('w1'), { id: 'bad' }, { ...req('w3'), complete: 'yes' }]);
    const apply = jest.fn(async (rs: WidgetRequest[]) => ({ handled: rs.map((r) => r.id), changed: true }));
    await syncWatchOnce(deps({ port, apply }));
    expect(apply).toHaveBeenCalledWith([req('w1')]);
  });

  it('요청 처리 뒤에 성장 수를 센다 — 방금 붙인 것이 들어간다', async () => {
    const order: string[] = [];
    const { port } = fakePort([req('w1')]);
    await syncWatchOnce(deps({
      port,
      apply: async (rs) => { order.push('apply'); return { handled: rs.map((r) => r.id), changed: true }; },
      growth: async () => { order.push('growth'); return 6; },
    }));
    expect(order).toEqual(['apply', 'growth']);
  });

  it('워치가 없어도 성장 수는 갱신하고 아무것도 보내지 않는다', async () => {
    const growth = jest.fn(async () => 3);
    const snapshot = jest.fn(async (_d: Date, g: number) => snap(g));
    expect(await syncWatchOnce(deps({ port: null, growth, snapshot }))).toEqual({ changed: false });
    expect(growth).toHaveBeenCalledTimes(1);
    expect(snapshot).not.toHaveBeenCalled();
  });

  it('요청이 없으면 apply를 부르지 않고 스냅샷만 보낸다', async () => {
    const { port, sent } = fakePort([]);
    const apply = jest.fn();
    await syncWatchOnce(deps({ port, apply }));
    expect(apply).not.toHaveBeenCalled();
    expect(sent).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/watchSyncCore.test.ts`
Expected: FAIL (`Cannot find module '../src/watch/syncCore'`)

- [ ] **Step 3: 동기화 한 번**

`src/watch/syncCore.ts`

```ts
import { isWidgetRequest } from '../widgets/requests';
import type { WidgetRequest } from '../widgets/requests';
import type { WatchSnapshot } from './snapshot';

export type WatchPort = {
  /** 워치가 보낸 아직 처리하지 않은 요청 (네이티브 큐, transferUserInfo로 받은 것) */
  readRequests(): Promise<unknown[]>;
  /** 처리한 요청 id를 큐에서 지운다 */
  ack(ids: string[]): Promise<void>;
  /** 스냅샷 하나를 워치에 보낸다 (updateApplicationContext, 마지막 하나만 남는다) */
  send(snapshot: WatchSnapshot): Promise<void>;
};

export type WatchSyncDeps = {
  /** 짝지은 워치가 없거나 네이티브 모듈이 없으면 null */
  port: WatchPort | null;
  apply(requests: WidgetRequest[]): Promise<{ handled: string[]; changed: boolean }>;
  growth(): Promise<number>;
  snapshot(date: Date, growth: number): Promise<WatchSnapshot>;
  now(): Date;
};

const uniq = (list: unknown[]): WidgetRequest[] => {
  const seen = new Map<string, WidgetRequest>();
  for (const v of list) if (isWidgetRequest(v) && !seen.has(v.id)) seen.set(v.id, v);
  return [...seen.values()];
};

/**
 * 워치 요청 처리 + 성장 갱신 + 스냅샷 보내기 한 번 (워치 설계 「구조」).
 * 요청은 위젯과 같은 applyWidgetRequests로 처리한다 — 처리한 id 목록을 함께 써서 두 번 붙지 않는다.
 * 성장 수는 요청을 처리한 뒤에 센다(방금 붙인 것이 들어가게). 워치가 없어도 센다 — 기록이 바뀔 때마다 세야
 * 판을 지우기 전의 수가 남아 줄지 않는다.
 */
export async function syncWatchOnce(deps: WatchSyncDeps): Promise<{ changed: boolean }> {
  let changed = false;
  if (deps.port) {
    const requests = uniq(await deps.port.readRequests());
    if (requests.length > 0) {
      const out = await deps.apply(requests);
      changed = out.changed;
      if (out.handled.length > 0) await deps.port.ack(out.handled);
    }
  }
  const growth = await deps.growth();
  if (deps.port) await deps.port.send(await deps.snapshot(deps.now(), growth));
  return { changed };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest __tests__/watchSyncCore.test.ts`
Expected: PASS

- [ ] **Step 5: 워치 연결 자리와 앱 시작**

`src/watch/watchPort.ts`

```ts
import type { WatchPort } from './syncCore';

/**
 * 워치와 주고받는 네이티브 모듈. 계획 2(워치 앱 본 구현)에서 WatchConnectivity 모듈로 채운다.
 * 그 전에는 워치가 없는 것과 같다 — 동기화는 성장 수만 갱신한다.
 */
export function watchPort(): WatchPort | null {
  return null;
}
```

`src/watch/syncWatch.ts`

```ts
import { AppState } from 'react-native';
import { subscribeLocalChange } from '../sync/changes';
import { applyWidgetRequests } from '../widgets/applyRequests';
import { createSyncRunner } from '../widgets/syncRunner';
import { updateGrowth } from './growth';
import { loadWatchSnapshot } from './loadSnapshot';
import { syncWatchOnce } from './syncCore';
import { watchPort } from './watchPort';

/** 한 번에 하나만 돈다. 워치 요청을 반영했으면 열린 판 화면이 다시 읽는다(notifyWidgetApplied, 위젯과 같은 신호). */
const runner = createSyncRunner(
  () => syncWatchOnce({ port: watchPort(), apply: applyWidgetRequests, growth: updateGrowth, snapshot: loadWatchSnapshot, now: () => new Date() }),
  (e) => { console.warn('watch sync failed', e); },
);

/** 앱을 열 때, 앞으로 올 때, 기록이 바뀔 때(1초 모아서) 워치를 맞춘다. 위젯 동기화와 같은 계기다 (PRD 4.14). */
export function startWatchSync(): () => void {
  runner.run();
  const app = AppState.addEventListener('change', (s) => { if (s === 'active') runner.run(); });
  let timer: ReturnType<typeof setTimeout> | null = null;
  const off = subscribeLocalChange(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; runner.run(); }, 1000);
  });
  return () => { app.remove(); off(); if (timer) clearTimeout(timer); };
}
```

`app/_layout.tsx`에서 `import { startWidgetSync } from '../src/widgets/syncWidgets';` 아래에 `import { startWatchSync } from '../src/watch/syncWatch';`를 더하고, 위젯 동기화 effect(주석 줄 포함)를 아래로 바꾼다.

```tsx
  // 위젯과 워치에서 누른 스티커를 기록에 반영하고 위젯과 워치를 맞춘다 (위젯 설계 「위젯에서 붙이기」, PRD 4.14). DB 준비가 끝난 뒤.
  useEffect(() => {
    if (!splashDone) return;
    const stopWidgets = startWidgetSync();
    const stopWatch = startWatchSync();
    return () => { stopWidgets(); stopWatch(); };
  }, [splashDone]);
```

- [ ] **Step 6: 전체 확인**

```bash
npm test
npm run test:components
npm run typecheck
npm run lint
npx expo export --platform ios --output-dir "$TMPDIR/check" && rm -rf "$TMPDIR/check"
```

Expected: 모두 통과. 화면은 바뀌지 않았으므로 흐름도와 Storybook은 고치지 않는다.

- [ ] **Step 7: 사용자 확인 요청**

사용자에게 알린다: 앱 화면은 바뀌지 않았다. 성장 수는 설정 `watchGrowth`에 쌓이지만 화면에 보이는 곳이 없어, 확인은 테스트 결과로 한다. 개발 빌드에서 앱이 평소처럼 열리고 붙이기, 떼기, 위젯 붙이기가 그대로 되는지만 직접 봐 달라고 한다.

Run: `npx jest __tests__/watchGrowth.test.ts __tests__/watchSyncCore.test.ts --verbose`

- [ ] **Step 8: 커밋 (사용자 확인 뒤)**

```bash
git add src/watch/syncCore.ts src/watch/watchPort.ts src/watch/syncWatch.ts app/_layout.tsx __tests__/watchSyncCore.test.ts
git commit -m "feat: watch sync loop that keeps growth up to date"
```

---

## 계획 2에서 할 것 (시험 구현 결과를 본 뒤 쓴다)

- watchOS 타깃과 설정 플러그인(시험 구현 질문 1의 결론대로).
- 네이티브 모듈: `readRequests`, `ack`, `send`를 WatchConnectivity로. `watchPort()`가 그 모듈을 돌려준다.
- SwiftUI 화면 다섯 개(시안 14판), 어림 그리기(받은 스냅샷 + 아직 처리되지 않은 요청), 붙인 뒤 흐름과 [건너뛰기], 모션 줄이기, VoiceOver 이름.
- 워치는 보여 준 성장 수보다 작은 값을 받아도 줄여 보이지 않는다. 몰아서 떨어뜨리기(「블록이 n개 늘었어요」).
- `locked` 목표(체험이 끝난 묶음 스티커)를 워치에서 눌렀을 때의 문구. spec에 없어 시안으로 사용자 확인.
- 컴플리케이션, 시뮬레이터 확인, Storybook 미리보기, 흐름도의 워치 진입점.
