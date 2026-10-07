# 홈 화면 위젯 본 구현 (공통 처리 + iOS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 화면 위젯 3종(목표 하나·이번 달·적립판)을 iOS에 출시할 수 있게 만든다. 위젯에서 누른 스티커가 실제 기록으로 저장되고, 위젯마다 위젯 편집에서 목표를 고른다.

**Architecture:** 위젯은 "눌렀다"는 요청만 자기 타임라인 props에 쌓고, 앱의 TS가 요청을 읽어 `placeSticker`/`removeSticker`로 처리한 뒤 새 스냅샷을 다시 쓴다(위젯 설계 「위젯에서 붙이기」). 타임라인은 위젯 종류마다 하나라, 앱은 모든 목표의 위젯 데이터를 한 번에 넣고 위젯이 위젯 편집에서 고른 목표를 꺼내 그린다. 목표 목록을 위젯 편집에 띄우는 Swift(`AppEntity`)와 위젯 확장의 글꼴은 로컬 설정 플러그인이 prebuild 때마다 넣는다.

**Tech Stack:** Expo SDK 57, React Native 0.86, `expo-widgets` ~57.0.22(+`@expo/ui` SwiftUI), expo-sqlite, jest + ts-jest(도메인·저장소), Maestro(시뮬레이터 확인).

**Spec:** [PRD 4.10](../../PRD.md) (우선) · [위젯 설계](../specs/2026-09-30-home-widget-design.md) · [시험 구현 결과](../specs/2026-10-05-widget-spike-results.md). 시험 구현 코드는 브랜치 `spike/widgets`(worktree `../chagok-wt-widgets`)에 있다 — 참고만 하고 그대로 합치지 않는다.

**이 계획 밖 (계획 2에서):** Android 위젯 전부(새 스타일, 목표 고르기, 앱이 꺼졌을 때 첫 탭 유실 A7). 처음 한 번 "위젯에서 붙일 수 있어요" 알려 주기(PRD 4.10 「방법 미정」).

## 2026-10-06 사용자 결정 (이 계획이 따른다)

- 계획 범위: 공통 처리 + iOS 먼저, Android는 계획 2.
- **마지막 칸**(판이 완성되는 칸): 위젯에서 바로 붙이지 않고 **앱의 그 판 화면을 열어** 평소처럼 「이 판을 완성할까요?」를 확인받는다(PRD 4.7).
- **되돌리기**: 따로 버튼을 그리지 않고 **같은 곳을 다시 누르면 뗀다.** 목표 하나 = 오늘 붙인 스티커, 이번 달 = 오늘 칸, 적립판 = 오늘 붙인 마지막 칸. 사진·메모가 있으면 위젯에서 떼지 않고 판 화면을 연다.
- **자정을 넘겨도 위젯에서 붙인 것이 보인다 (2026-10-06):** 위젯을 누르면 화면 값을 직접 고치지 않고 요청만 쌓는다. 위젯은 그릴 때마다 「앱이 준 값 + 아직 처리 안 된 요청」을 합쳐 그리고, 요청은 타임라인의 모든 항목(지금·자정)에 함께 보이게 한다. 그래서 10/6 23:50에 붙이고 앱을 안 열어도 0시 이후 10/6 칸은 채워져 있고, 10/7은 「오늘 아직」이라 다시 붙일 수 있다. 붙인 시각은 늘 누른 시각이다.
- 목표 고르기: iOS 위젯 편집의 「목표」 줄(가안). 바탕: 아이보리·흰색·먹색, 홈 화면 라이트·다크와 상관없이 고른 색 그대로.

## Global Constraints

- `package.json`의 `overrides: { "react-dom": "19.2.3" }`를 지우지 않는다. 의존성 설치 전 `package.json`·`package-lock.json`을 백업하고, 설치 뒤 `npm ls react-dom --all`이 `19.2.3` 하나만 내놓는지 확인한다(AGENTS.md).
- `jest-expo`를 들이지 않는다. 도메인·저장소 테스트는 `jest` + `ts-jest`, 파일은 `__tests__/**/*.test.ts`.
- `src/design-system/` 토큰·프레임·팔레트 기존 값은 바꾸지 않는다.
- 날짜는 로컬 날짜 키(`localDateKey`, `YYYY-MM-DD`)로 다룬다. `toISOString()`으로 날짜를 만들지 않는다(작업 방식 5절).
- 위젯 색(고정, PRD 4.10): 아이보리 `#FEF1D1`/글자 `#06261C`/강조 `#C2451F`, 흰색 `#FFFFFF`/`#1C2321`/`#D2502A`, 먹색 `#1A1A1C`/`#FEF1D1`/`#FD9B7A`. 오늘 칸 테두리 `#FD855F`.
- 말풍선 말: 아직 `Ready?`, 붙임 `Nice!`, 다 채움 `Done!`. 재촉 문구는 넣지 않는다(PRD 2절).
- 목표 이름 17pt, 두 줄 + 말줄임. 진행은 큰 숫자 %만(`9/15` 같은 개수 표기 금지).
- 위젯 버튼 안 이미지에 `widgetAccentedRenderingMode`를 쓰지 않는다 — 탭을 막는다(시험 구현 결과 2026-10-06).
- 위젯 함수(`'widget'` 지시어) 안에서는 바깥 상수·함수를 참조할 수 없다. 타입만 `import type`으로 가져온다.
- iOS 위젯 버튼은 iOS 17 이상.
- 화면 문구는 사용자 관점으로 쓴다(시스템 상태가 아니라 사용자가 할 일).

## Review Focus

1. **자정 근처 탭** — 23:59에 누르고 다음 날 앱을 열면, 스티커는 누른 날(요청의 `dateKey`)에 붙어야 한다 → Task 2 「어제 누른 요청은 어제 칸에 붙인다」, Task 1 「id와 붙인 시각을 정해 붙일 수 있다」.
2. **위젯에서 붙이고 앱을 안 연 채 자정이 지남** — 0시 이후에도 어젯밤 칸은 채워져 보이고, 오늘은 「오늘 아직」이라 다시 붙일 수 있어야 한다 → Task 7 「요청을 모든 항목에 합친다」, Task 9 「자정 항목에서도 어젯밤 요청이 보이고 오늘 붙일 수 있다」.
3. **앱이 처리 중에 꺼졌다 다시 켜짐** — 같은 요청을 두 번 처리해도 스티커가 하나만 붙어야 한다(적립판 포함) → Task 3 「같은 요청을 두 번 처리해도 한 장」.
4. **누른 뒤 앱에서 목표를 지우거나 완성함** — 남은 요청은 조용히 버리고 오류를 내지 않는다 → Task 2 「지운 목표·완성한 판은 건너뛴다」, Task 3 같은 이름.
5. **앱이 요청을 읽은 직후 또 누름** — 앱이 새 스냅샷을 쓰면서 그 사이 요청을 지우면 안 된다 → Task 8 「읽은 뒤 들어온 요청은 남긴다」.
6. **사진·메모를 남긴 오늘 스티커를 위젯에서 다시 누름** — 기록이 사라지면 안 된다 → Task 2 「기록이 있으면 떼지 않는다」, Task 3 같은 이름, Task 4 `undoable=false`.

---

## File Structure

| 파일 | 책임 |
| --- | --- |
| `src/repositories/stickerRepository.ts` (수정) | `placeSticker`가 요청 id·누른 시각을 받는다 |
| `src/widgets/requests.ts` (새) | 위젯 요청 타입, 요청 하나를 어떻게 처리할지 정하는 순수 함수 `planRequest` |
| `src/widgets/applyRequests.ts` (새) | 요청 목록을 DB에 반영 `applyWidgetRequests` |
| `src/widgets/snapshot.ts` (수정) | 위젯용 목표 값에 오늘 붙임·되돌리기 가능·마지막 칸·진행 수, 적립판 10칸 묶음 |
| `src/widgets/loadSnapshot.ts` (수정) | 입력 읽기를 `loadWidgetInputs`로 분리, 오늘 스티커의 기록 여부 |
| `src/widgets/widgetProps.ts` (새) | 스냅샷 → 위젯 3종 props (순수) |
| `src/widgets/syncCore.ts` (새) | 요청 처리 → 다시 읽기 → 쓰기 순서 (플랫폼 없음, 테스트 대상) |
| `src/widgets/syncWidgets.ios.ts`, `src/widgets/syncWidgets.ts` (새) | 앱 열 때·앞으로 올 때·기록 바뀔 때 실행(iOS), 그 밖 플랫폼은 아무것도 안 함 |
| `src/widgets/widgetArt.ios.ts` (새) | 위젯 그림 PNG를 App Group으로 복사하고 URI를 돌려줌 |
| `widgets/ios/ChagokGoal.tsx`, `ChagokMonth.tsx`, `ChagokTally.tsx` (새) | 위젯 3종 화면(SwiftUI, 위젯 런타임) |
| `scripts/build-widget-art.mjs` (새) + `assets/widget-art/*.png` | 컬러 스티커·차곡이·말풍선 PNG |
| `plugins/widget-goal/patch.js`, `plugins/widget-goal/index.js` (새) | 설정 플러그인: 위젯 Swift에 목표 고르기 끼워 넣기, 위젯 확장에 글꼴 넣기 |
| `app.json` (수정) | `expo-widgets` 위젯 3종 + 바탕 설정, 로컬 플러그인 등록 |
| `app/_layout.tsx` (수정) | `startWidgetSync()` 연결 |
| `app/goal/[id]/index.tsx` (수정) | `?place=1`로 열리면 붙이기 흐름(마지막 칸 확인) 한 번 실행 |

---

### Task 1: `placeSticker`가 요청 id와 누른 시각을 받는다

위젯 요청을 나중에 처리할 때, 스티커 id를 요청 id로 써서 같은 요청을 두 번 붙이지 않게 하고(Review Focus 3), 누른 시각으로 붙인다(Review Focus 1).

**Files:**
- Modify: `src/repositories/stickerRepository.ts:27-62`
- Test: `__tests__/stickerRepository.test.ts`

**Interfaces:**
- Produces: `placeSticker(goalId: string, slotIndex: number, stickerType?: StickerType, options?: { complete?: boolean; id?: string; placedAt?: number }): Promise<Sticker>`

- [ ] **Step 1: Write the failing tests** — `__tests__/stickerRepository.test.ts`의 `describe('stickerRepository', …)` 안 끝에 추가:

```ts
  it('id와 붙인 시각을 정해 붙일 수 있다 (위젯 요청)', async () => {
    const g = await goal();
    const at = new Date(2026, 9, 5, 23, 59).getTime();
    const s = await placeSticker(g.id, 0, 'sprout', { id: 'req-1', placedAt: at });
    expect(s.id).toBe('req-1');
    expect(s.placedAt).toBe(at);
    expect((await getSticker('req-1'))?.placedAt).toBe(at);
  });

  it('예전 시각으로 붙여도 마지막으로 붙인 시각은 뒤로 가지 않는다', async () => {
    const g = await goal();
    await placeSticker(g.id, 0);
    const before = (await getGoal(g.id))!.lastPlacedAt!;
    await placeSticker(g.id, 1, 'sprout', { placedAt: before - 60_000 });
    expect((await getGoal(g.id))!.lastPlacedAt).toBe(before);
  });
```

파일 맨 위 import를 `import { createGoal, getGoal } from '../src/repositories/goalRepository';`로 바꾼다.

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest __tests__/stickerRepository.test.ts -t "위젯 요청|뒤로 가지"`
Expected: FAIL — 첫 테스트는 `expect(s.id).toBe('req-1')`에서 실제 id가 달라서, 둘째는 `lastPlacedAt`이 더 이른 값이라서.

- [ ] **Step 3: Implement** — `placeSticker`를 다음으로 바꾼다:

```ts
/**
 * 붙인다. 목표의 마지막으로 붙인 시각도 함께 바꾼다 (PRD 4.1) — 더 늦은 시각일 때만.
 * complete면 같은 트랜잭션에서 완성한다. 마지막 칸 확인을 받은 뒤에만 쓴다 (PRD 4.7).
 * 완성한 판이면 거부한다. 달력판의 slotIndex는 그 달의 날짜 - 1이며, 날짜는 placedAt으로 정한다.
 * id·placedAt은 위젯 요청을 처리할 때 준다: 요청 id를 스티커 id로 써서 두 번 붙지 않게 하고, 누른 시각으로 붙인다.
 */
export async function placeSticker(
  goalId: string,
  slotIndex: number,
  stickerType: StickerType = STICKER_TYPE_DEFAULT,
  options: { complete?: boolean; id?: string; placedAt?: number } = {},
): Promise<Sticker> {
  const db = await getDb();
  const now = Date.now();
  const sticker: Sticker = {
    id: options.id ?? newId(),
    goalId,
    placedAt: options.placedAt ?? now,
    slotIndex,
    stickerType,
  };
  await db.transaction(async (tx) => {
    const goal = await tx.first<{ completed_at: number | null }>('SELECT completed_at FROM goals WHERE id = ?', goalId);
    if (!goal) throw new Error('목표가 없습니다.');
    if (goal.completed_at !== null) throw new Error(COMPLETED);
    await tx.run(
      'INSERT INTO stickers (id, goal_id, placed_at, slot_index, sticker_type, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      sticker.id, sticker.goalId, sticker.placedAt, sticker.slotIndex, sticker.stickerType, now,
    );
    await tx.run(
      'UPDATE goals SET last_placed_at = MAX(COALESCE(last_placed_at, 0), ?), updated_at = ? WHERE id = ?',
      sticker.placedAt, now, goalId,
    );
    if (options.complete) {
      await tx.run('UPDATE goals SET completed_at = ?, completion_seen = 0 WHERE id = ?', sticker.placedAt, goalId);
    }
    await enqueue(tx, 'sticker', sticker.id, now);
    await enqueue(tx, 'goal', goalId, now);
  });
  return sticker;
}
```

`updated_at`과 outbox 시각은 "지금"이다 — 백업의 수정 시각 비교가 예전 누른 시각 때문에 밀리지 않게 한다. 위젯 요청이 아닐 때는 `placedAt === now`라 기존 동작과 같다.

- [ ] **Step 4: Run the files**

Run: `npx jest __tests__/stickerRepository.test.ts __tests__/repositoryOutbox.test.ts __tests__/goalRepository.test.ts`
Expected: PASS (기존 테스트 포함)

- [ ] **Step 5: Commit**

```bash
git add src/repositories/stickerRepository.ts __tests__/stickerRepository.test.ts
git commit -m "feat(stickers): place with a given id and time for widget requests"
```

---

### Task 2: 위젯 요청을 어떻게 처리할지 정하는 순수 함수

**Files:**
- Create: `src/widgets/requests.ts`
- Test: `__tests__/widgetRequests.test.ts`

**Interfaces:**
- Consumes: `Goal`, `Sticker` (`src/domain/types`), `inPeriod`, `completesBoard`, `isCompleted`, `nextEmptySlot`, `stickerDate` (`src/domain/board`)
- Produces:

```ts
export type WidgetRequest = { id: string; goalId: string; kind: 'add' | 'undo'; at: number; dateKey: DateKey };
export type RequestPlan =
  | { action: 'place'; slotIndex: number; placedAt: number }
  | { action: 'remove'; stickerId: string }
  | { action: 'skip'; reason: 'gone' | 'completed' | 'done' | 'outside' | 'full' | 'last' | 'nothing' | 'record' };
export function planRequest(goal: Goal | null, stickers: readonly Sticker[], recorded: ReadonlySet<string>, req: WidgetRequest): RequestPlan;
export function isWidgetRequest(v: unknown): v is WidgetRequest;
```

- [ ] **Step 1: Write the failing tests** — `__tests__/widgetRequests.test.ts`:

```ts
import { isWidgetRequest, planRequest } from '../src/widgets/requests';
import type { WidgetRequest } from '../src/widgets/requests';
import type { Goal, Sticker } from '../src/domain/types';

const t = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 'g', name: '산책', boardType: 'calendar', totalSlots: null, defaultStickerId: 'sprout',
  createdAt: t(2026, 10, 1), endDate: null, completedAt: null, completionSeen: false,
  lastPlacedAt: null, initialSlots: null, ...over,
});
const tally = (over: Partial<Goal> = {}) => goal({ boardType: 'tally', totalSlots: 5, ...over });
const st = (id: string, placedAt: number, slotIndex: number): Sticker =>
  ({ id, goalId: 'g', placedAt, slotIndex, stickerType: 'sprout' });
const req = (over: Partial<WidgetRequest> = {}): WidgetRequest =>
  ({ id: 'r1', goalId: 'g', kind: 'add', at: t(2026, 10, 6, 9), dateKey: '2026-10-06', ...over });
const none = new Set<string>();

describe('planRequest · 붙이기', () => {
  it('달력판은 요청 날짜 칸에 누른 시각으로 붙인다', () => {
    expect(planRequest(goal(), [], none, req())).toEqual({ action: 'place', slotIndex: 5, placedAt: t(2026, 10, 6, 9) });
  });

  it('어제 누른 요청은 어제 칸에 붙인다 (Review Focus 1)', () => {
    const r = req({ at: t(2026, 10, 5, 23, 59), dateKey: '2026-10-05' });
    expect(planRequest(goal(), [], none, r)).toEqual({ action: 'place', slotIndex: 4, placedAt: t(2026, 10, 5, 23, 59) });
  });

  it('그날 이미 붙어 있으면 건너뛴다', () => {
    expect(planRequest(goal(), [st('s', t(2026, 10, 6, 8), 5)], none, req())).toEqual({ action: 'skip', reason: 'done' });
  });

  it('같은 요청 id의 스티커가 있으면 건너뛴다 (Review Focus 3)', () => {
    expect(planRequest(tally(), [st('r1', t(2026, 10, 6, 9), 0)], none, req())).toEqual({ action: 'skip', reason: 'done' });
  });

  it('기간 밖 날짜는 건너뛴다', () => {
    expect(planRequest(goal({ endDate: '2026-10-05' }), [], none, req())).toEqual({ action: 'skip', reason: 'outside' });
  });

  it('적립판은 번호가 가장 작은 빈칸에 붙인다', () => {
    expect(planRequest(tally(), [st('a', t(2026, 10, 2), 0), st('b', t(2026, 10, 3), 2)], none, req()))
      .toEqual({ action: 'place', slotIndex: 1, placedAt: t(2026, 10, 6, 9) });
  });

  it('마지막 칸은 위젯에서 붙이지 않는다 (앱에서 완성 확인)', () => {
    const four = [0, 1, 2, 3].map((i) => st(`s${i}`, t(2026, 10, 2), i));
    expect(planRequest(tally(), four, none, req())).toEqual({ action: 'skip', reason: 'last' });
    const cal = goal({ createdAt: t(2026, 10, 5), endDate: '2026-10-06' });
    expect(planRequest(cal, [st('a', t(2026, 10, 5), 4)], none, req())).toEqual({ action: 'skip', reason: 'last' });
  });

  it('지운 목표·완성한 판은 건너뛴다 (Review Focus 4)', () => {
    expect(planRequest(null, [], none, req())).toEqual({ action: 'skip', reason: 'gone' });
    expect(planRequest(goal({ completedAt: t(2026, 10, 6, 8) }), [], none, req())).toEqual({ action: 'skip', reason: 'completed' });
  });
});

describe('planRequest · 되돌리기', () => {
  it('달력판은 요청 날짜의 스티커를 뗀다', () => {
    expect(planRequest(goal(), [st('s', t(2026, 10, 6, 8), 5)], none, req({ kind: 'undo' })))
      .toEqual({ action: 'remove', stickerId: 's' });
  });

  it('적립판은 그날 마지막으로 붙인 스티커를 뗀다', () => {
    const list = [st('old', t(2026, 10, 5), 0), st('a', t(2026, 10, 6, 8), 1), st('b', t(2026, 10, 6, 10), 2)];
    expect(planRequest(tally(), list, none, req({ kind: 'undo' }))).toEqual({ action: 'remove', stickerId: 'b' });
  });

  it('기록이 있으면 떼지 않는다 (Review Focus 6)', () => {
    expect(planRequest(goal(), [st('s', t(2026, 10, 6, 8), 5)], new Set(['s']), req({ kind: 'undo' })))
      .toEqual({ action: 'skip', reason: 'record' });
  });

  it('그날 붙인 것이 없으면 건너뛴다', () => {
    expect(planRequest(goal(), [], none, req({ kind: 'undo' }))).toEqual({ action: 'skip', reason: 'nothing' });
  });
});

describe('isWidgetRequest', () => {
  it('위젯이 쌓은 모양만 받는다', () => {
    expect(isWidgetRequest(req())).toBe(true);
    expect(isWidgetRequest({ ...req(), kind: 'move' })).toBe(false);
    expect(isWidgetRequest({ ...req(), dateKey: '2026-10-6' })).toBe(false);
    expect(isWidgetRequest(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest __tests__/widgetRequests.test.ts`
Expected: FAIL — `Cannot find module '../src/widgets/requests'`

- [ ] **Step 3: Implement** — `src/widgets/requests.ts`:

```ts
import type { DateKey } from '../domain/dates';
import type { Goal, Sticker } from '../domain/types';
import { completesBoard, inPeriod, isCompleted, nextEmptySlot, stickerDate } from '../domain/board';

/**
 * 위젯이 "눌렀다"고 남긴 요청 (위젯 설계 「위젯에서 붙이기」). 위젯 타임라인 props.requests에 쌓인다.
 * dateKey는 누른 순간의 기기 날짜다 — 다음 날 처리해도 누른 날에 붙인다.
 */
export type WidgetRequest = { id: string; goalId: string; kind: 'add' | 'undo'; at: number; dateKey: DateKey };

export type RequestPlan =
  | { action: 'place'; slotIndex: number; placedAt: number }
  | { action: 'remove'; stickerId: string }
  | { action: 'skip'; reason: 'gone' | 'completed' | 'done' | 'outside' | 'full' | 'last' | 'nothing' | 'record' };

export function isWidgetRequest(v: unknown): v is WidgetRequest {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.id === 'string' && typeof r.goalId === 'string'
    && (r.kind === 'add' || r.kind === 'undo')
    && typeof r.at === 'number' && typeof r.dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.dateKey);
}

/**
 * 요청 하나를 어떻게 처리할지 정한다. 판단은 모두 여기서 하고 저장은 applyWidgetRequests가 한다.
 * 마지막 칸은 붙이지 않는다 — 위젯은 그 칸을 앱의 판 화면으로 열어 완성 확인을 받는다 (2026-10-06 결정, PRD 4.7).
 * 기록(사진·메모)이 있는 스티커는 떼지 않는다 — 위젯은 그때 판 화면을 연다.
 */
export function planRequest(goal: Goal | null, stickers: readonly Sticker[], recorded: ReadonlySet<string>, req: WidgetRequest): RequestPlan {
  if (!goal) return { action: 'skip', reason: 'gone' };
  if (isCompleted(goal)) return { action: 'skip', reason: 'completed' };
  const that = stickers.filter((s) => stickerDate(s) === req.dateKey);

  if (req.kind === 'undo') {
    if (that.length === 0) return { action: 'skip', reason: 'nothing' };
    const latest = that.reduce((a, b) => (b.placedAt > a.placedAt ? b : a));
    if (recorded.has(latest.id)) return { action: 'skip', reason: 'record' };
    return { action: 'remove', stickerId: latest.id };
  }

  if (stickers.some((s) => s.id === req.id)) return { action: 'skip', reason: 'done' };
  if (goal.boardType === 'calendar') {
    if (!inPeriod(goal, req.dateKey)) return { action: 'skip', reason: 'outside' };
    if (that.length > 0) return { action: 'skip', reason: 'done' };
    if (completesBoard(goal, stickers.length)) return { action: 'skip', reason: 'last' };
    return { action: 'place', slotIndex: Number(req.dateKey.slice(8, 10)) - 1, placedAt: req.at };
  }
  const slot = nextEmptySlot(goal, stickers);
  if (slot === null) return { action: 'skip', reason: 'full' };
  if (completesBoard(goal, stickers.length)) return { action: 'skip', reason: 'last' };
  return { action: 'place', slotIndex: slot, placedAt: req.at };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest __tests__/widgetRequests.test.ts`
Expected: PASS (13 tests)

- [ ] **Step 5: Commit**

```bash
git add src/widgets/requests.ts __tests__/widgetRequests.test.ts
git commit -m "feat(widgets): decide how to apply a widget tap request"
```

---

### Task 3: 요청 목록을 실제 기록으로 저장

**Files:**
- Create: `src/widgets/applyRequests.ts`
- Test: `__tests__/applyWidgetRequests.test.ts`

**Interfaces:**
- Consumes: `planRequest`, `WidgetRequest` (Task 2), `placeSticker` (Task 1), `removeSticker`, `listStickers`, `getGoal`, `listRecordedStickerIds`, `safeStickerId` (`src/app-data/pocketAdapter`)
- Produces: `applyWidgetRequests(requests: readonly WidgetRequest[]): Promise<{ handled: string[]; changed: boolean }>` — `handled`는 처리했거나 건너뛰기로 정한 요청 id(다시 볼 필요 없음), 누른 시각 순. 저장 중 오류가 난 요청과 그 뒤 요청은 넣지 않는다(다음에 다시 시도).

- [ ] **Step 1: Write the failing tests** — `__tests__/applyWidgetRequests.test.ts`:

```ts
import { createGoal, deleteGoal } from '../src/repositories/goalRepository';
import { listStickers, placeSticker } from '../src/repositories/stickerRepository';
import { upsertRecord } from '../src/repositories/recordRepository';
import { localDateKey } from '../src/domain/dates';
import { applyWidgetRequests } from '../src/widgets/applyRequests';
import type { WidgetRequest } from '../src/widgets/requests';
import { withFreshDb } from './support/setup';

withFreshDb();

const now = Date.now();
const today = localDateKey(now);
const add = (goalId: string, id: string, at = now): WidgetRequest => ({ id, goalId, kind: 'add', at, dateKey: localDateKey(at) });
const undo = (goalId: string, id: string, at = now): WidgetRequest => ({ id, goalId, kind: 'undo', at, dateKey: today });

describe('applyWidgetRequests', () => {
  it('요청 id를 스티커 id로 붙인다', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 10 });
    expect(await applyWidgetRequests([add(g.id, 'w1')])).toEqual({ handled: ['w1'], changed: true });
    expect((await listStickers(g.id)).map((s) => s.id)).toEqual(['w1']);
  });

  it('같은 요청을 두 번 처리해도 한 장 (Review Focus 3)', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 10 });
    await applyWidgetRequests([add(g.id, 'w1')]);
    expect(await applyWidgetRequests([add(g.id, 'w1')])).toEqual({ handled: ['w1'], changed: false });
    expect(await listStickers(g.id)).toHaveLength(1);
  });

  it('시각 순서대로 처리한다: 붙이고 되돌리면 남는 것이 없다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'calendar', totalSlots: null });
    const out = await applyWidgetRequests([undo(g.id, 'w2', now + 1), add(g.id, 'w1')]);
    expect(out.handled).toEqual(['w1', 'w2']);
    expect(await listStickers(g.id)).toHaveLength(0);
  });

  it('지운 목표·완성한 판은 건너뛴다 (Review Focus 4)', async () => {
    const g = await createGoal({ name: '산책', boardType: 'calendar', totalSlots: null });
    await deleteGoal(g.id);
    expect(await applyWidgetRequests([add(g.id, 'w1')])).toEqual({ handled: ['w1'], changed: false });
  });

  it('기록이 있으면 떼지 않는다 (Review Focus 6)', async () => {
    const g = await createGoal({ name: '산책', boardType: 'calendar', totalSlots: null });
    const s = await placeSticker(g.id, new Date(now).getDate() - 1);
    await upsertRecord(s.id, { memo: '좋았다', photoUri: null });
    await applyWidgetRequests([undo(g.id, 'w1')]);
    expect(await listStickers(g.id)).toHaveLength(1);
  });
});
```

`upsertRecord`의 실제 인자 모양은 `src/repositories/recordRepository.ts:34`를 보고 맞춘다(사진 없이 메모만 남기는 호출). 위 모양과 다르면 테스트 쪽을 고친다 — 저장소는 바꾸지 않는다.

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest __tests__/applyWidgetRequests.test.ts`
Expected: FAIL — `Cannot find module '../src/widgets/applyRequests'`

- [ ] **Step 3: Implement** — `src/widgets/applyRequests.ts`:

```ts
import { getGoal } from '../repositories/goalRepository';
import { listRecordedStickerIds } from '../repositories/recordRepository';
import { listStickers, placeSticker, removeSticker } from '../repositories/stickerRepository';
import { safeStickerId } from '../app-data/pocketAdapter';
import { planRequest } from './requests';
import type { WidgetRequest } from './requests';

/**
 * 위젯 요청을 누른 시각 순서대로 기록에 반영한다 (위젯 설계 ③).
 * 저장에 실패하면 거기서 멈춘다 — 그 요청과 뒤 요청은 handled에 넣지 않아 다음에 다시 시도한다.
 * 스티커 id가 요청 id라 처리 도중 앱이 꺼져 다시 처리해도 두 번 붙지 않는다.
 */
export async function applyWidgetRequests(requests: readonly WidgetRequest[]): Promise<{ handled: string[]; changed: boolean }> {
  const handled: string[] = [];
  let changed = false;
  const ordered = [...requests].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  for (const req of ordered) {
    try {
      const goal = await getGoal(req.goalId);
      const stickers = goal ? await listStickers(goal.id) : [];
      const recorded = goal ? await listRecordedStickerIds(goal.id) : new Set<string>();
      const plan = planRequest(goal, stickers, recorded, req);
      if (plan.action === 'place' && goal) {
        await placeSticker(goal.id, plan.slotIndex, safeStickerId(goal.defaultStickerId), { id: req.id, placedAt: plan.placedAt });
        changed = true;
      } else if (plan.action === 'remove') {
        await removeSticker(plan.stickerId);
        changed = true;
      }
      handled.push(req.id);
    } catch {
      break;
    }
  }
  return { handled, changed };
}
```

`safeStickerId`의 반환 타입이 `placeSticker`의 `StickerType`과 맞지 않으면, 판 화면이 넘기는 방식(`app/goal/[id]/index.tsx`의 `const sticker = safeStickerId(goal.defaultStickerId)` → `placeSticker(goal.id, slotIndex, sticker, …)`)을 그대로 따른다.

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest __tests__/applyWidgetRequests.test.ts __tests__/widgetRequests.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/widgets/applyRequests.ts __tests__/applyWidgetRequests.test.ts
git commit -m "feat(widgets): turn widget tap requests into real stickers"
```

---

### Task 4: 스냅샷에 위젯이 판단할 값 더하기

위젯 런타임은 DB를 못 읽으므로, "오늘 붙였는가 · 다시 누르면 뗄 수 있는가 · 완성까지 남은 칸 수 · 진행 수"를 스냅샷이 미리 계산한다. 「다음이 마지막 칸인가」는 위젯이 아직 처리 안 된 요청을 빼서 계산하므로(Task 9), 스냅샷은 참·거짓이 아니라 남은 칸 수를 준다. 적립판 묶음은 PRD 4.10대로 10칸(5×2).

**Files:**
- Modify: `src/widgets/snapshot.ts`, `src/widgets/loadSnapshot.ts`
- Test: `__tests__/widgetSnapshot.test.ts`, `__tests__/loadWidgetSnapshot.test.ts`

**Interfaces:**
- Produces:

```ts
export type WidgetInput = {
  goal: Goal; placedAll: number; placedDates: DateKey[]; slotIndexes: number[];
  /** 그날 마지막으로 붙인 스티커. 날짜가 스냅샷 날짜와 다르면(자정 타임라인) 무시한다 */
  todaySticker?: { dateKey: DateKey; hasRecord: boolean } | null;
};
export type WidgetGoal = WidgetGoalView & {
  placedToday: boolean;
  /** 같은 곳을 다시 누르면 뗄 수 있는가 — 오늘 붙였고 기록이 없을 때 */
  undoable: boolean;
  /** 완성까지 남은 칸 수. 붙여서 완성되지 않는 판(종료일 없는 달력판)은 null. 1이면 다음이 마지막 칸 — 위젯은 판 화면을 연다 */
  remaining: number | null;
  placed: number;
  total: number;
};
export type WidgetSnapshot = { today: DateKey; goals: WidgetGoal[]; defaultGoalId: string | null };
export const TALLY_CHUNK = 10;
export async function loadWidgetInputs(now: Date): Promise<WidgetInput[]>;   // loadSnapshot.ts
export async function loadWidgetSnapshot(now: Date): Promise<WidgetSnapshot>; // 그대로
```

`defaultGoalId`는 지금처럼 `goals[0]` — `orderGoals`가 가장 최근에 붙인 목표를 맨 앞에 둔다(기존 `loadWidgetSnapshot` 테스트가 확인).

- [ ] **Step 1: Write the failing tests** — `__tests__/widgetSnapshot.test.ts` 끝에 추가:

```ts
describe('위젯 스냅샷 · 위젯이 판단할 값', () => {
  const tallyInput = (totalSlots: number, placed: number): WidgetInput => ({
    goal: goal({ boardType: 'tally', totalSlots }), placedAll: placed, placedDates: [], slotIndexes: [...Array(placed).keys()],
  });

  it('오늘 붙였고 기록이 없으면 다시 눌러 뗄 수 있다', () => {
    const input = cal({ placedDates: ['2026-09-06'], placedAll: 1, todaySticker: { dateKey: '2026-09-06', hasRecord: false } });
    expect(buildWidgetSnapshot([input], at(2026, 9, 6)).goals[0]).toMatchObject({ placedToday: true, undoable: true });
  });

  it('기록이 있으면 뗄 수 없다 (Review Focus 6)', () => {
    const input = cal({ placedDates: ['2026-09-06'], placedAll: 1, todaySticker: { dateKey: '2026-09-06', hasRecord: true } });
    expect(buildWidgetSnapshot([input], at(2026, 9, 6)).goals[0]).toMatchObject({ placedToday: true, undoable: false });
  });

  it('자정 타임라인에서는 어제 붙인 것을 오늘 붙임으로 보지 않는다', () => {
    const input = cal({ placedDates: ['2026-09-06'], placedAll: 1, todaySticker: { dateKey: '2026-09-06', hasRecord: false } });
    expect(buildWidgetSnapshot([input], at(2026, 9, 7, 0, 0)).goals[0]).toMatchObject({ placedToday: false, undoable: false });
  });

  it('완성까지 남은 칸 수를 준다 (종료일 없는 달력판은 null)', () => {
    expect(buildWidgetSnapshot([tallyInput(3, 2)], at(2026, 9, 6)).goals[0].remaining).toBe(1);
    const ended = cal({ goal: goal({ endDate: '2026-09-10' }), placedAll: 5 });
    expect(buildWidgetSnapshot([ended], at(2026, 9, 6)).goals[0].remaining).toBe(5); // 9/1~9/10 10일 - 5
    expect(buildWidgetSnapshot([cal()], at(2026, 9, 6)).goals[0].remaining).toBeNull();
  });

  it('적립판은 다음 빈칸이 든 10칸 묶음을 보여 준다', () => {
    const mini = buildWidgetSnapshot([tallyInput(25, 12)], at(2026, 9, 6)).goals[0].mini;
    expect(mini).toMatchObject({ type: 'tally', from: 11, placed: 12, total: 25 });
    if (mini.type === 'tally') expect(mini.cells).toHaveLength(10);
  });

  it('진행 수(placed/total)를 함께 준다', () => {
    expect(buildWidgetSnapshot([tallyInput(20, 5)], at(2026, 9, 6)).goals[0]).toMatchObject({ placed: 5, total: 20, percent: 25 });
  });
});
```

`__tests__/loadWidgetSnapshot.test.ts`의 `describe` 안에 추가하고, import에 `upsertRecord`(`../src/repositories/recordRepository`)를 더한다:

```ts
  it('오늘 붙인 스티커의 기록 여부를 읽는다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'calendar', totalSlots: null });
    const s = await placeSticker(g.id, new Date().getDate() - 1);
    await upsertRecord(s.id, { memo: '메모', photoUri: null });
    const snap = await loadWidgetSnapshot(new Date());
    expect(snap.goals.find((x) => x.id === g.id)).toMatchObject({ placedToday: true, undoable: false });
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest __tests__/widgetSnapshot.test.ts __tests__/loadWidgetSnapshot.test.ts`
Expected: FAIL — `placedToday`가 `undefined`, 적립판 cells 길이 30.

- [ ] **Step 3: Implement** — `src/widgets/snapshot.ts`:
  1. `TALLY_CHUNK`를 `10`으로, 주석을 "적립판 위젯의 10칸 묶음(5×2, PRD 4.10)"으로.
  2. `WidgetInput`에 `todaySticker?` 필드, `WidgetGoal`·`WidgetSnapshot` 타입을 위 Interfaces대로.
  3. `buildWidgetSnapshot`의 `map`을 `(goal): WidgetGoal =>`로 바꾸고 안을 다음으로:

```ts
    const progress = progressOf(goal, placed, now);
    const placedToday = input.todaySticker?.dateKey === localDateKey(now.getTime());
    return {
      id: goal.id,
      name: goal.name,
      sticker: safeStickerId(goal.defaultStickerId),
      kind: kindLabel(goal),
      progressLabel: percentLabel(goal, placed, now),
      percent: progress.percent,
      placed: progress.value,
      total: progress.total,
      placedToday,
      undoable: placedToday && input.todaySticker?.hasRecord === false,
      remaining: remainingOf(goal, input.placedAll),
      mini: goal.boardType === 'calendar'
        ? calendarMini(goal, new Set(input.placedDates), now)
        : tallyMini(goal, input.slotIndexes, chunk),
    };
```

  같은 파일에 더한다(`completesBoard`와 같은 기준 — 남은 칸이 1이면 completesBoard가 참):

```ts
/** 완성까지 남은 칸 수 (PRD 4.3·4.7). 종료일 없는 달력판은 붙여서 완성되지 않는다. */
function remainingOf(goal: Goal, placedAll: number): number | null {
  if (goal.boardType === 'tally') return Math.max(0, (goal.totalSlots ?? 0) - placedAll);
  if (goal.endDate === null) return null;
  return Math.max(0, daysInclusive(startDate(goal), goal.endDate) - placedAll);
}
```

  `startDate`를 `../domain/board` import에, `daysInclusive`를 `../domain/dates` import에 더한다. `progressOf`의 필드 이름(`value`, `total`, `percent`)은 `src/domain/board.ts:18`.

  `src/widgets/loadSnapshot.ts`:

```ts
/** 진행 중인 목표의 위젯 입력. 종료일 없는 달력판은 이번 달만 읽는다 (PRD 6.3). */
export async function loadWidgetInputs(now: Date): Promise<WidgetInput[]> {
  const goals = (await listGoals()).filter((g) => !isCompleted(g));
  const [from, to] = monthRange(now.getFullYear(), now.getMonth() + 1);
  const today = localDateKey(now.getTime());
  const inputs: WidgetInput[] = [];
  for (const goal of goals) {
    const recorded = await listRecordedStickerIds(goal.id);
    const todaySticker = (list: readonly Sticker[]) => {
      const mine = list.filter((s) => localDateKey(s.placedAt) === today);
      if (mine.length === 0) return null;
      const last = mine.reduce((a, b) => (b.placedAt > a.placedAt ? b : a));
      return { dateKey: today, hasRecord: recorded.has(last.id) };
    };
    if (goal.boardType === 'tally') {
      const stickers = await listStickers(goal.id);
      inputs.push({ goal, placedAll: stickers.length, placedDates: [], slotIndexes: stickers.map((s) => s.slotIndex), todaySticker: todaySticker(stickers) });
      continue;
    }
    const month = await listStickersInRange(goal.id, from, to);
    const placedAll = goal.endDate === null ? month.length : (await listStickers(goal.id)).length;
    inputs.push({ goal, placedAll, placedDates: month.map((s) => localDateKey(s.placedAt)), slotIndexes: [], todaySticker: todaySticker(month) });
  }
  return inputs;
}

export async function loadWidgetSnapshot(now: Date): Promise<WidgetSnapshot> {
  return buildWidgetSnapshot(await loadWidgetInputs(now), now);
}
```

  import에 `listRecordedStickerIds`(`../repositories/recordRepository`), `Sticker` 타입(`../domain/types`)을 더한다.

  `src/design-system/widget-preview.tsx`·`stories/WidgetPreview.stories.tsx`는 `WidgetGoalView`를 그대로 쓰므로 건드리지 않는다(`WidgetGoal`은 그 확장).

- [ ] **Step 4: Run tests + typecheck**

Run: `npx jest __tests__/widgetSnapshot.test.ts __tests__/loadWidgetSnapshot.test.ts && npm run typecheck`
Expected: PASS. 기존 테스트 중 적립판 30칸 묶음을 기대하던 것이 있으면 10칸 기준으로 고친다(PRD 4.10이 바꾼 값 — 커밋 메시지에 적는다).

- [ ] **Step 5: Commit**

```bash
git add src/widgets/snapshot.ts src/widgets/loadSnapshot.ts __tests__/widgetSnapshot.test.ts __tests__/loadWidgetSnapshot.test.ts
git commit -m "feat(widgets): snapshot tells widgets today/undo/remaining; tally chunk 10 (PRD 4.10)"
```

---

### Task 5: 스냅샷 → 위젯 3종 props (순수)

타임라인은 위젯 종류마다 하나다. 모든 목표를 `goals`에 넣고, 위젯은 위젯 편집에서 고른 id(없으면 `defaultId`)로 꺼낸다. 위젯 파일은 이 파일의 **타입만** 가져간다.

**Files:**
- Create: `src/widgets/widgetProps.ts`
- Test: `__tests__/widgetProps.test.ts`

**Interfaces:**
- Consumes: `WidgetSnapshot`, `WidgetGoal` (Task 4), `WidgetRequest` (Task 2)
- Produces: 아래 Step 3의 export 전부 — `WidgetArt`, `GoalCard`, `MonthCard`, `TallyCard`, `GoalWidgetProps`, `MonthWidgetProps`, `TallyWidgetProps`, `goalWidgetProps(s, art)`, `monthWidgetProps(s, art, now)`, `tallyWidgetProps(s, art)`, `nextMidnight(now)`. `requests`는 늘 `[]`로 만든다 — 처리하지 못한 요청을 남기는 일은 Task 8이 한다.

- [ ] **Step 1: Write the failing tests** — `__tests__/widgetProps.test.ts`:

```ts
import { buildWidgetSnapshot } from '../src/widgets/snapshot';
import { goalWidgetProps, monthWidgetProps, nextMidnight, tallyWidgetProps } from '../src/widgets/widgetProps';
import type { WidgetArt } from '../src/widgets/widgetProps';
import type { Goal } from '../src/domain/types';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);
const goal = (over: Partial<Goal>): Goal => ({
  id: 'g', name: '산책', boardType: 'calendar', totalSlots: null, defaultStickerId: 'shoe',
  createdAt: at(2026, 10, 1).getTime(), endDate: null, completedAt: null, completionSeen: false,
  lastPlacedAt: null, initialSlots: null, ...over,
});
const art: WidgetArt = {
  mascotYet: 'y', mascotDone: 'd', mascotSleepy: 'z', bubbles: { ivory: 'bi', white: 'bw', ink: 'bk' },
  stickers: { sprout: 'file:///sprout.png', shoe: 'file:///shoe.png', book: 'file:///book.png' },
};
const snap = (now: Date) => buildWidgetSnapshot([
  { goal: goal({ id: 'run' }), placedAll: 1, placedDates: ['2026-10-02'], slotIndexes: [] },
  { goal: goal({ id: 'read', name: '독서', boardType: 'tally', totalSlots: 20, defaultStickerId: 'book' }), placedAll: 3, placedDates: [], slotIndexes: [0, 1, 2] },
], now);

describe('위젯 props', () => {
  it('목표 하나는 모든 목표를 id로 넣고 순서 목록을 준다', () => {
    const s = snap(at(2026, 10, 6));
    const p = goalWidgetProps(s, art);
    expect(Object.keys(p.goals).sort()).toEqual(['read', 'run']);
    expect(p.order.map((o) => o.id)).toEqual(s.goals.map((g) => g.id));
    expect(p.goals.read).toMatchObject({ sticker: 'file:///book.png', placed: 3, total: 20, remaining: 17 });
    expect(p.requests).toEqual([]);
  });

  it('이번 달은 달력판만, 오늘 칸 번호와 n월을 준다', () => {
    const p = monthWidgetProps(snap(at(2026, 10, 6)), art, at(2026, 10, 6));
    expect(Object.keys(p.goals)).toEqual(['run']);
    expect(p.order).toEqual([{ id: 'run', name: '산책' }]);
    expect(p.defaultId).toBe('run');
    expect(p.goals.run).toMatchObject({ monthLabel: '10월', todayIndex: 5 });
  });

  it('적립판은 적립판만', () => {
    expect(Object.keys(tallyWidgetProps(snap(at(2026, 10, 6)), art).goals)).toEqual(['read']);
  });

  it('고를 목표가 없으면 defaultId는 null', () => {
    expect(monthWidgetProps(buildWidgetSnapshot([], at(2026, 10, 6)), art, at(2026, 10, 6)).defaultId).toBeNull();
  });

  it('다음 자정은 기기 기준 다음 날 0시', () => {
    expect(nextMidnight(at(2026, 10, 31, 23))).toEqual(new Date(2026, 10, 1, 0, 0));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest __tests__/widgetProps.test.ts`
Expected: FAIL — `Cannot find module '../src/widgets/widgetProps'`

- [ ] **Step 3: Implement** — `src/widgets/widgetProps.ts`:

```ts
import type { DateKey } from '../domain/dates';
import type { WidgetCalendarCell, WidgetTallyCell } from '../design-system/widget-preview';
import type { WidgetGoal, WidgetSnapshot } from './snapshot';
import type { WidgetRequest } from './requests';

// 위젯 3종이 받는 props (PRD 4.10). 위젯 파일(widgets/ios/*)은 이 파일의 타입만 가져간다.
export type WidgetArt = { mascotYet: string; mascotDone: string; mascotSleepy: string; bubbles: { ivory: string; white: string; ink: string }; stickers: Record<string, string> };
export type CardBase = { id: string; name: string; placed: number; total: number; placedToday: boolean; undoable: boolean; remaining: number | null; sticker: string };
export type GoalCard = CardBase;
export type MonthCard = CardBase & { monthLabel: string; days: WidgetCalendarCell[]; firstWeekday: number; todayIndex: number };
export type TallyCard = CardBase & { from: number; cells: WidgetTallyCell[] };
type Shared = {
  order: { id: string; name: string }[]; defaultId: string | null; today: DateKey;
  mascotYet: string; mascotDone: string; mascotSleepy: string; bubbles: WidgetArt['bubbles']; requests: WidgetRequest[];
};
export type GoalWidgetProps = Shared & { goals: Record<string, GoalCard> };
export type MonthWidgetProps = Shared & { goals: Record<string, MonthCard> };
export type TallyWidgetProps = Shared & { goals: Record<string, TallyCard> };

const base = (g: WidgetGoal, art: WidgetArt): CardBase => ({
  id: g.id, name: g.name, placed: g.placed, total: g.total,
  placedToday: g.placedToday, undoable: g.undoable, remaining: g.remaining,
  sticker: art.stickers[g.sticker] ?? art.stickers.sprout ?? '',
});

function shared(goals: readonly WidgetGoal[], s: WidgetSnapshot, art: WidgetArt): Shared {
  // 기본 목표: 스냅샷의 기본(가장 최근에 붙인 목표)이 이 위젯 종류에 있으면 그것, 없으면 이 종류의 첫 목표.
  const defaultId = goals.some((g) => g.id === s.defaultGoalId) ? s.defaultGoalId : goals[0]?.id ?? null;
  return {
    order: goals.map((g) => ({ id: g.id, name: g.name })), defaultId, today: s.today,
    mascotYet: art.mascotYet, mascotDone: art.mascotDone, mascotSleepy: art.mascotSleepy, bubbles: art.bubbles, requests: [],
  };
}

export function goalWidgetProps(s: WidgetSnapshot, art: WidgetArt): GoalWidgetProps {
  return { ...shared(s.goals, s, art), goals: Object.fromEntries(s.goals.map((g) => [g.id, base(g, art)])) };
}

export function monthWidgetProps(s: WidgetSnapshot, art: WidgetArt, now: Date): MonthWidgetProps {
  const cal = s.goals.filter((g) => g.mini.type === 'calendar');
  const goals: Record<string, MonthCard> = {};
  for (const g of cal) {
    if (g.mini.type !== 'calendar') continue;
    goals[g.id] = { ...base(g, art), monthLabel: `${g.mini.month}월`, days: g.mini.days, firstWeekday: g.mini.firstWeekday, todayIndex: now.getDate() - 1 };
  }
  return { ...shared(cal, s, art), goals };
}

export function tallyWidgetProps(s: WidgetSnapshot, art: WidgetArt): TallyWidgetProps {
  const tal = s.goals.filter((g) => g.mini.type === 'tally');
  const goals: Record<string, TallyCard> = {};
  for (const g of tal) {
    if (g.mini.type !== 'tally') continue;
    goals[g.id] = { ...base(g, art), from: g.mini.from, cells: g.mini.cells };
  }
  return { ...shared(tal, s, art), goals };
}

export const nextMidnight = (now: Date): Date => new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest __tests__/widgetProps.test.ts && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/widgets/widgetProps.ts __tests__/widgetProps.test.ts
git commit -m "feat(widgets): build props for the three widgets from a snapshot"
```

---

### Task 6: 의존성, 위젯 그림, `app.json`

**Files:**
- Modify: `package.json`, `package-lock.json`, `app.json`
- Create: `scripts/build-widget-art.mjs`, `assets/widget-art/*.png`

- [ ] **Step 1: Back up and install**

```bash
cp package.json /tmp/package.json.bak && cp package-lock.json /tmp/package-lock.json.bak
npx expo install expo-widgets@~57.0.22
npm ls react-dom --all
npm ls @expo/ui
```

Expected: `react-dom@19.2.3` 하나만(중복·다른 판 없음), `@expo/ui` 57.x 하나. 아니면 백업으로 되돌리고 멈춘다. `@expo/ui`는 `expo-widgets`를 따라 들어온다(시험 구현과 같음).

- [ ] **Step 2: Art script** — 시험 구현 스크립트를 가져온다:

```bash
git show spike/widgets:scripts/spike-widget-art.mjs > scripts/build-widget-art.mjs
```

고칠 곳:
  - 첫 두 줄 주석: `// 위젯 그림을 PNG로 굽는다(PRD 4.10). zlib만 쓴다.` / `// node scripts/build-widget-art.mjs → assets/widget-art/`
  - 말풍선 `BUBBLE`을 바탕 세 가지로: `{ ivory: { fill: '#FFF8E8', ink: '#06261C' }, white: { fill: '#F4F4F2', ink: '#1C2321' }, ink: { fill: '#26262A', ink: '#FEF1D1' } }`. 파일 이름은 `bubble-${name}` 그대로라 `bubble-ivory.png` 등이 된다.

Run: `node scripts/build-widget-art.mjs && ls assets/widget-art`
Expected: `bubble-ink.png bubble-ivory.png bubble-white.png color-book.png color-cat.png color-flower.png color-shoe.png color-sprout.png color-star.png mascot-curious.png mascot-excited.png mascot-sleepy.png`

- [ ] **Step 3: `app.json`** — `plugins` 끝에 추가:

```json
[
  "expo-widgets",
  {
    "widgets": [
      { "name": "ChagokGoal", "displayName": "목표 하나", "description": "목표 하나의 진행과 오늘 스티커", "android": null,
        "ios": { "supportedFamilies": ["systemSmall"], "contentMarginsDisabled": true,
          "configuration": { "title": "목표 하나", "parameters": { "background": { "title": "바탕", "type": "enum", "default": "ivory",
            "values": [{ "name": "아이보리", "value": "ivory" }, { "name": "흰색", "value": "white" }, { "name": "먹색", "value": "ink" }] } } } } },
      { "name": "ChagokMonth", "displayName": "이번 달", "description": "달력판 목표의 이번 달", "android": null,
        "ios": { "supportedFamilies": ["systemMedium"], "contentMarginsDisabled": true,
          "configuration": { "title": "이번 달", "parameters": { "background": { "title": "바탕", "type": "enum", "default": "ivory",
            "values": [{ "name": "아이보리", "value": "ivory" }, { "name": "흰색", "value": "white" }, { "name": "먹색", "value": "ink" }] } } } } },
      { "name": "ChagokTally", "displayName": "적립판", "description": "적립판 목표의 다음 10칸", "android": null,
        "ios": { "supportedFamilies": ["systemMedium"], "contentMarginsDisabled": true,
          "configuration": { "title": "적립판", "parameters": { "background": { "title": "바탕", "type": "enum", "default": "ivory",
            "values": [{ "name": "아이보리", "value": "ivory" }, { "name": "흰색", "value": "white" }, { "name": "먹색", "value": "ink" }] } } } } }
    ]
  }
]
```

로컬 플러그인 `"./plugins/widget-goal"`은 Task 7 Step 4에서 이 뒤에 넣는다. `package.json`의 `expo.autolinking.android.exclude: ["expo-widgets"]`(시험 구현에서 Android 빌드 충돌 때문에 넣음)는 계획 2에서 판단한다. 이 계획은 Android 빌드를 하지 않는다.

- [ ] **Step 4: Bundle check**

Run: `npm run typecheck && npx expo export --platform ios --output-dir /tmp/check && rm -rf /tmp/check`
Expected: 성공.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app.json scripts/build-widget-art.mjs assets/widget-art
git commit -m "chore(widgets): add expo-widgets, widget art, and the three iOS widgets"
```

---

### Task 7: 설정 플러그인 — 위젯 편집의 「목표」와 위젯 글꼴

expo-widgets는 prebuild 때마다 위젯 폴더(`ios/ExpoWidgetsTarget`)를 지우고 Swift를 새로 만든다(`node_modules/expo-widgets/plugin/build/ios/withWidgetSourceFiles.js`). 그래서 **모든 mod가 끝난 뒤(`withFinalizedMod`)** 생성 파일을 고친다. 위젯마다 목표 목록 Swift(`AppEntity` + `EntityQuery`)를 **생성 파일 끝에 붙이고**(새 파일이 아니라 Xcode 타깃에 추가할 필요가 없다), 설정 의도에 `goal` 줄과 JS로 넘기는 `"goal"`을 끼워 넣는다. 그리고 **타임라인을 읽을 때 모든 항목의 `requests`를 합쳐 각 항목에 넣는다** — 위젯 버튼은 지금 보이는 항목에만 요청을 적기 때문에, 이렇게 해야 자정 항목도 어젯밤 요청을 보고 그린다(Review Focus 2). 끼워 넣을 자리를 못 찾으면 prebuild를 실패시킨다.

**Files:**
- Create: `plugins/widget-goal/patch.js` (순수 문자열 변환), `plugins/widget-goal/index.js` (플러그인)
- Create: `__tests__/fixtures/ChagokGoal.generated.swift` (생성 파일 사본)
- Test: `__tests__/widgetGoalPatch.test.ts`

**Interfaces:**
- Produces (`patch.js`, CommonJS):
  - `patchWidgetSwift(source: string, widgetName: string, label: string): string` — 이미 고친 파일이면 그대로 돌려준다. 자리를 못 찾으면 `Error('widget-goal: <widgetName> — …')`.
  - `addFontsToInfoPlist(plistXml: string, fontFile: string): string` — 이미 있으면 그대로.

- [ ] **Step 1: Fixture** — Task 6 상태에서 생성 파일을 한 번 만든다:

```bash
npx expo prebuild --platform ios --no-install
mkdir -p __tests__/fixtures
cp ios/ExpoWidgetsTarget/ChagokGoal.swift __tests__/fixtures/ChagokGoal.generated.swift
```

(`ios/`는 git이 무시한다. fixture만 커밋한다.)

- [ ] **Step 2: Write the failing test** — `__tests__/widgetGoalPatch.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';
// 플러그인은 Expo가 바로 읽는 CommonJS다.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { patchWidgetSwift, addFontsToInfoPlist } = require('../plugins/widget-goal/patch');

const generated = readFileSync(join(__dirname, 'fixtures/ChagokGoal.generated.swift'), 'utf8');

describe('widget-goal patch', () => {
  const out: string = patchWidgetSwift(generated, 'ChagokGoal', '목표');

  it('목표 목록 타입을 붙이고 위젯 자기 타임라인을 읽는다', () => {
    expect(out).toContain('struct ChagokGoalGoalEntity: AppEntity');
    expect(out).toContain('struct ChagokGoalGoalQuery: EntityQuery');
    expect(out).toContain('"__expo_widgets_ChagokGoal_timeline"');
  });

  it('설정 의도에 목표 줄을, JS 설정에 goal을 넣는다', () => {
    expect(out).toMatch(/@Parameter\(title: "목표"\)\n\s+var goal: ChagokGoalGoalEntity\?/);
    expect(out).toContain('"goal": entry.configuration.goal?.id ?? ""');
  });

  it('타임라인을 읽을 때 모든 항목의 요청을 합친다 (Review Focus 2)', () => {
    expect(out).toContain('let allRequests: [Any]');
    expect(out).toContain('props: props.merging(["requests": allRequests]) { _, new in new },');
    expect(out).not.toMatch(/\n\s+props: props,\n/);
  });

  it('두 번 돌려도 같다', () => {
    expect(patchWidgetSwift(out, 'ChagokGoal', '목표')).toBe(out);
  });

  it('자리를 못 찾으면 멈춘다 (expo-widgets 생성 모양이 바뀜)', () => {
    expect(() => patchWidgetSwift('struct Other {}', 'ChagokGoal', '목표')).toThrow('widget-goal: ChagokGoal');
  });

  it('위젯 Info.plist에 글꼴을 등록한다', () => {
    const plist = '<?xml version="1.0"?><plist version="1.0"><dict><key>NSExtension</key><dict/></dict></plist>';
    const p: string = addFontsToInfoPlist(plist, 'neodgm-1.601.ttf');
    expect(p).toContain('<key>UIAppFonts</key>');
    expect(p).toContain('<string>neodgm-1.601.ttf</string>');
    expect(addFontsToInfoPlist(p, 'neodgm-1.601.ttf')).toBe(p);
  });
});
```

Run: `npx jest __tests__/widgetGoalPatch.test.ts`
Expected: FAIL — `Cannot find module '../plugins/widget-goal/patch'`

- [ ] **Step 3: Implement `patch.js`** — 시험 구현에서 손으로 넣은 Swift(`git show spike/widgets:spike-native/ios-widgets/ChagokRing.swift`의 `ChagokGoalEntity`·`ChagokGoalQuery`)를 그대로 옮긴다:

```js
// 위젯 편집에 사용자 목표 목록을 띄운다 (PRD 4.10, 시험 구현 결과 2026-10-06).
// expo-widgets가 만든 <Widget>.swift를 고친다. 자리를 못 찾으면 멈춰서, 라이브러리가 바뀐 것을 빌드 때 알게 한다.
const MARK = '// widget-goal: patched';

function entitySwift(name, label) {
  return `
${MARK}
struct ${name}GoalEntity: AppEntity {
  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: ${JSON.stringify(label)})
  static var defaultQuery = ${name}GoalQuery()
  let id: String
  let name: String
  var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\\(name)") }
}

struct ${name}GoalQuery: EntityQuery {
  func goals() -> [${name}GoalEntity] {
    guard let first = WidgetsStorage.getArray(forKey: "__expo_widgets_${name}_timeline")?.first as? [String: Any],
          let props = first["props"] as? [String: Any],
          let order = props["order"] as? [[String: Any]] else { return [] }
    return order.compactMap { item in
      guard let id = item["id"] as? String, let name = item["name"] as? String else { return nil }
      return ${name}GoalEntity(id: id, name: name)
    }
  }
  func entities(for identifiers: [${name}GoalEntity.ID]) async throws -> [${name}GoalEntity] {
    goals().filter { identifiers.contains($0.id) }
  }
  func suggestedEntities() async throws -> [${name}GoalEntity] { goals() }
}
`;
}

const ALL_REQUESTS = `    let allRequests: [Any] = {
      var seen = Set<String>()
      var out: [Any] = []
      for case let item as [String: Any] in timeline {
        for case let request as [String: Any] in ((item["props"] as? [String: Any])?["requests"] as? [Any] ?? []) {
          if let id = request["id"] as? String, seen.insert(id).inserted { out.append(request) }
        }
      }
      return out
    }()
`;

function replaceOnce(source, pattern, replacement, widgetName, what) {
  if (!pattern.test(source)) {
    throw new Error(`widget-goal: ${widgetName} — ${what} 자리를 못 찾았어요. expo-widgets가 만든 Swift 모양이 바뀌었는지 보세요.`);
  }
  return source.replace(pattern, replacement);
}

function patchWidgetSwift(source, widgetName, label) {
  if (source.includes(MARK)) return source;
  let out = replaceOnce(
    source,
    new RegExp(`(struct ${widgetName}ConfigurationAppIntent: WidgetConfigurationIntent \\{[\\s\\S]*?)(\\n  func perform\\(\\))`),
    `$1  @Parameter(title: ${JSON.stringify(label)})\n  var goal: ${widgetName}GoalEntity?\n$2`,
    widgetName, '설정 의도(perform 앞)',
  );
  // 마지막 파라미터 뒤에는 쉼표가 없으므로 goal을 맨 앞에 넣는다.
  out = replaceOnce(out, /(env\["configuration"\] = \[\n)/, '$1      "goal": entry.configuration.goal?.id ?? "",\n', widgetName, 'env["configuration"]');
  // 위젯 버튼은 지금 보이는 항목에만 요청을 적는다. 읽을 때 모든 항목의 요청을 합쳐 자정 항목도 보게 한다.
  out = replaceOnce(
    out,
    /(let timeline = WidgetsStorage\.getArray\(forKey: "__expo_widgets_\w+_timeline"\) \?\? \[\]\n)/,
    `$1${ALL_REQUESTS}`,
    widgetName, 'parseTimeline의 timeline 읽기',
  );
  out = replaceOnce(out, /\n(\s+)props: props,\n/, '\n$1props: props.merging(["requests": allRequests]) { _, new in new },\n', widgetName, 'parseTimeline의 props');
  return out + entitySwift(widgetName, label);
}

function addFontsToInfoPlist(plistXml, fontFile) {
  if (plistXml.includes(`<string>${fontFile}</string>`)) return plistXml;
  const i = plistXml.lastIndexOf('</dict>');
  if (i < 0) throw new Error('widget-goal: 위젯 Info.plist 모양이 바뀌었어요.');
  return `${plistXml.slice(0, i)}<key>UIAppFonts</key><array><string>${fontFile}</string></array>${plistXml.slice(i)}`;
}

module.exports = { patchWidgetSwift, addFontsToInfoPlist };
```

`env["configuration"] = [` 다음 줄의 들여쓰기는 fixture에서 확인하고 맞춘다.

Run: `npx jest __tests__/widgetGoalPatch.test.ts`
Expected: PASS

- [ ] **Step 4: Plugin `index.js`** 와 등록

```js
// 로컬 설정 플러그인: 위젯 편집의 「목표」 + 위젯 확장 글꼴 (PRD 4.10, 위젯 설계).
// expo-widgets가 위젯 폴더를 지우고 다시 만들기 때문에, 모든 mod가 끝난 뒤(withFinalizedMod) 고친다.
const fs = require('fs');
const path = require('path');
const { withFinalizedMod, IOSConfig } = require('expo/config-plugins');
const xcode = require('xcode');
const { patchWidgetSwift, addFontsToInfoPlist } = require('./patch');

const TARGET = 'ExpoWidgetsTarget';
const FONT = 'neodgm-1.601.ttf';
const WIDGETS = ['ChagokGoal', 'ChagokMonth', 'ChagokTally'];

module.exports = function withWidgetGoal(config) {
  return withFinalizedMod(config, ['ios', async (cfg) => {
    const iosRoot = cfg.modRequest.platformProjectRoot;
    const dir = path.join(iosRoot, TARGET);
    for (const name of WIDGETS) {
      const file = path.join(dir, `${name}.swift`);
      if (!fs.existsSync(file)) throw new Error(`widget-goal: ${file}이 없어요. app.json expo-widgets 위젯 이름을 확인하세요.`);
      fs.writeFileSync(file, patchWidgetSwift(fs.readFileSync(file, 'utf8'), name, '목표'));
    }
    // 글꼴: 위젯 폴더에 복사 → 위젯 Info.plist UIAppFonts → 위젯 타깃 리소스
    fs.copyFileSync(path.join(cfg.modRequest.projectRoot, 'src/design-system/assets', FONT), path.join(dir, FONT));
    const plistPath = path.join(dir, 'Info.plist');
    fs.writeFileSync(plistPath, addFontsToInfoPlist(fs.readFileSync(plistPath, 'utf8'), FONT));
    const pbxPath = IOSConfig.Paths.getPBXProjectPath(iosRoot);
    const project = xcode.project(pbxPath);
    project.parseSync();
    const targetKey = project.findTargetKey(TARGET);
    if (!targetKey) throw new Error(`widget-goal: Xcode 타깃 ${TARGET}을 못 찾았어요.`);
    if (!project.hasFile(`${TARGET}/${FONT}`)) project.addResourceFile(`${TARGET}/${FONT}`, { target: targetKey });
    fs.writeFileSync(pbxPath, project.writeSync());
    return cfg;
  }]);
};
```

`app.json` plugins 맨 끝(`expo-widgets` 뒤)에 `"./plugins/widget-goal"`을 넣는다.

`xcode` 패키지는 `@expo/config-plugins`가 쓰는 의존성이다(`npm ls xcode`로 판 확인). 직접 `require`가 lint(`import/no-extraneous-dependencies` 등)에 걸리면 같은 판을 `devDependencies`에 명시한다(설치 전 백업 절차). `addResourceFile`이 그룹 없이 실패하면 시험 구현의 손 작업과 같은 결과가 되도록 위젯 타깃 그룹을 찾아 넘긴다(Ruling으로 남김).

- [ ] **Step 5: Prebuild check**

```bash
npx expo prebuild --platform ios --clean
grep -c "widget-goal: patched" ios/ExpoWidgetsTarget/ChagokGoal.swift ios/ExpoWidgetsTarget/ChagokMonth.swift ios/ExpoWidgetsTarget/ChagokTally.swift
grep -c "UIAppFonts" ios/ExpoWidgetsTarget/Info.plist
grep -c "neodgm-1.601.ttf" ios/*.xcodeproj/project.pbxproj
npx expo prebuild --platform ios --clean && grep -c "widget-goal: patched" ios/ExpoWidgetsTarget/ChagokGoal.swift
```

Expected: 각 Swift 파일 `1`, Info.plist `1`, pbxproj `1` 이상, 두 번째 `--clean` 뒤에도 `1`.

- [ ] **Step 6: Commit**

```bash
git add plugins/widget-goal __tests__/widgetGoalPatch.test.ts __tests__/fixtures/ChagokGoal.generated.swift app.json
git commit -m "feat(widgets): config plugin for the widget-edit goal list and widget font"
```

---

### Task 8: 앱이 요청을 처리하고 위젯을 갱신

앱을 열 때, 앞으로 올 때, 기록이 바뀔 때(1초 모아서) 한다. 순서: ① 세 위젯 타임라인의 요청 읽기 → ② 기록에 반영 → ③ 스냅샷(지금·다음 자정) 만들기 → ④ **쓰기 직전에 다시 읽어** 처리하지 않은 요청은 새 props에 남기기(Review Focus 5) → ⑤ 타임라인 쓰기.

**Files:**
- Create: `src/widgets/syncCore.ts` (플랫폼 없는 순서 로직, 테스트 대상)
- Create: `src/widgets/syncWidgets.ios.ts`, `src/widgets/syncWidgets.ts`, `src/widgets/widgetArt.ios.ts`
- Modify: `app/_layout.tsx`
- Test: `__tests__/widgetSyncCore.test.ts`

**Interfaces:**
- Consumes: `applyWidgetRequests` (Task 3), `loadWidgetInputs`, `buildWidgetSnapshot` (Task 4), `goalWidgetProps`·`monthWidgetProps`·`tallyWidgetProps`·`nextMidnight`·`WidgetArt` (Task 5), `isWidgetRequest` (Task 2), 위젯 3종 default export (Task 9)
- Produces:

```ts
// syncCore.ts
export type TimelineEntry<P> = { date: Date; props: P };
export type WidgetPort = {
  readRequests(): Promise<unknown[]>;
  write(entries: TimelineEntry<Record<string, unknown>>[]): void;
};
export type SyncDeps = {
  widgets: { goal: WidgetPort; month: WidgetPort; tally: WidgetPort };
  apply(requests: WidgetRequest[]): Promise<{ handled: string[]; changed: boolean }>;
  props(now: Date): Promise<{ goal: Record<string, unknown>; month: Record<string, unknown>; tally: Record<string, unknown> }>;
  now(): Date;
};
export async function syncWidgetsOnce(deps: SyncDeps): Promise<void>;
// syncWidgets.ios.ts / syncWidgets.ts
export function startWidgetSync(): () => void;
```

- [ ] **Step 1: Write the failing test** — `__tests__/widgetSyncCore.test.ts`:

```ts
import { syncWidgetsOnce } from '../src/widgets/syncCore';
import type { SyncDeps, TimelineEntry } from '../src/widgets/syncCore';
import type { WidgetRequest } from '../src/widgets/requests';

const r = (id: string): WidgetRequest => ({ id, goalId: 'g', kind: 'add', at: 1, dateKey: '2026-10-06' });

function port(batches: unknown[][]) {
  const written: TimelineEntry<Record<string, unknown>>[][] = [];
  let call = 0;
  return {
    written,
    readRequests: async () => batches[Math.min(call++, batches.length - 1)],
    write: (e: TimelineEntry<Record<string, unknown>>[]) => { written.push(e); },
  };
}

function deps(goal: ReturnType<typeof port>, applied: string[][] = []): SyncDeps {
  return {
    widgets: { goal, month: port([[]]), tally: port([[]]) },
    apply: async (reqs) => { applied.push(reqs.map((x) => x.id)); return { handled: reqs.map((x) => x.id), changed: reqs.length > 0 }; },
    props: async () => ({ goal: { requests: [] }, month: { requests: [] }, tally: { requests: [] } }),
    now: () => new Date(2026, 9, 6, 12),
  };
}

describe('syncWidgetsOnce', () => {
  it('요청을 반영하고 지금 + 다음 자정 두 항목을 쓴다', async () => {
    const goal = port([[r('a')], []]);
    const applied: string[][] = [];
    await syncWidgetsOnce(deps(goal, applied));
    expect(applied).toEqual([['a']]);
    expect(goal.written[0].map((e) => e.date)).toEqual([new Date(2026, 9, 6, 12), new Date(2026, 9, 7)]);
    expect(goal.written[0][0].props.requests).toEqual([]);
  });

  it('읽은 뒤 들어온 요청은 남긴다 (Review Focus 5)', async () => {
    const goal = port([[r('a')], [r('a'), r('b')]]);
    await syncWidgetsOnce(deps(goal));
    expect(goal.written[0][0].props.requests).toEqual([r('b')]);
    expect(goal.written[0][1].props.requests).toEqual([r('b')]);
  });

  it('모양이 틀린 요청은 버린다', async () => {
    const goal = port([[{ id: 'x' }, r('a')], []]);
    const applied: string[][] = [];
    await syncWidgetsOnce(deps(goal, applied));
    expect(applied).toEqual([['a']]);
  });
});
```

Run: `npx jest __tests__/widgetSyncCore.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 2: Implement `syncCore.ts`**

```ts
import { isWidgetRequest } from './requests';
import type { WidgetRequest } from './requests';
import { nextMidnight } from './widgetProps';

export type TimelineEntry<P> = { date: Date; props: P };
export type WidgetPort = {
  readRequests(): Promise<unknown[]>;
  write(entries: TimelineEntry<Record<string, unknown>>[]): void;
};
export type SyncDeps = {
  widgets: { goal: WidgetPort; month: WidgetPort; tally: WidgetPort };
  apply(requests: WidgetRequest[]): Promise<{ handled: string[]; changed: boolean }>;
  props(now: Date): Promise<{ goal: Record<string, unknown>; month: Record<string, unknown>; tally: Record<string, unknown> }>;
  now(): Date;
};

const uniq = (list: unknown[]): WidgetRequest[] => {
  const seen = new Map<string, WidgetRequest>();
  for (const v of list) if (isWidgetRequest(v) && !seen.has(v.id)) seen.set(v.id, v);
  return [...seen.values()];
};

/**
 * 위젯 요청 처리 + 스냅샷 쓰기 한 번 (위젯 설계 ③⑤).
 * 쓰기 직전에 요청을 다시 읽어, 처리하지 못했거나 그 사이 들어온 요청을 새 props에 남긴다 — 덮어써서 잃지 않게.
 */
export async function syncWidgetsOnce(deps: SyncDeps): Promise<void> {
  const kinds = ['goal', 'month', 'tally'] as const;
  const first = uniq((await Promise.all(kinds.map((k) => deps.widgets[k].readRequests()))).flat());
  const { handled } = await deps.apply(first);
  const done = new Set(handled);
  const now = deps.now();
  const midnight = nextMidnight(now);
  const [today, tomorrow] = await Promise.all([deps.props(now), deps.props(midnight)]);
  for (const k of kinds) {
    const left = uniq(await deps.widgets[k].readRequests()).filter((q) => !done.has(q.id));
    deps.widgets[k].write([
      { date: now, props: { ...today[k], requests: left } },
      { date: midnight, props: { ...tomorrow[k], requests: left } },
    ]);
  }
}
```

Run: `npx jest __tests__/widgetSyncCore.test.ts`
Expected: PASS

- [ ] **Step 3: iOS wiring** — `src/widgets/widgetArt.ios.ts` (시험 구현 `src/widgets/spikeSync.ios.ts`의 `ART`·`artUri`를 옮김):

```ts
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { widgetsDirectory } from 'expo-widgets';
import type { WidgetArt } from './widgetProps';

// 그림을 고치면 파일 이름도 바꾼다 — 이미 복사된 같은 이름의 파일은 다시 복사하지 않는다.
const ART = {
  'color-sprout': require('../../assets/widget-art/color-sprout.png'),
  'color-shoe': require('../../assets/widget-art/color-shoe.png'),
  'color-book': require('../../assets/widget-art/color-book.png'),
  'color-flower': require('../../assets/widget-art/color-flower.png'),
  'color-star': require('../../assets/widget-art/color-star.png'),
  'color-cat': require('../../assets/widget-art/color-cat.png'),
  'mascot-curious': require('../../assets/widget-art/mascot-curious.png'),
  'mascot-excited': require('../../assets/widget-art/mascot-excited.png'),
  'mascot-sleepy': require('../../assets/widget-art/mascot-sleepy.png'),
  'bubble-ivory': require('../../assets/widget-art/bubble-ivory.png'),
  'bubble-white': require('../../assets/widget-art/bubble-white.png'),
  'bubble-ink': require('../../assets/widget-art/bubble-ink.png'),
} as const;

/** 위젯은 App Group 안의 파일만 그린다. 앱 번들 그림을 widgetsDirectory로 복사한다. */
async function uri(key: keyof typeof ART): Promise<string> {
  const target = new File(`${widgetsDirectory}/${key}.png`);
  if (!target.exists) {
    const asset = Asset.fromModule(ART[key]);
    await asset.downloadAsync();
    await new File(asset.localUri!).copy(target);
  }
  return target.uri;
}

let cached: Promise<WidgetArt> | null = null;
export function widgetArt(): Promise<WidgetArt> {
  cached ??= (async () => ({
    mascotYet: await uri('mascot-curious'),
    mascotDone: await uri('mascot-excited'),
    mascotSleepy: await uri('mascot-sleepy'),
    bubbles: { ivory: await uri('bubble-ivory'), white: await uri('bubble-white'), ink: await uri('bubble-ink') },
    stickers: Object.fromEntries(await Promise.all(
      (['sprout', 'shoe', 'book', 'flower', 'star', 'cat'] as const).map(async (id) => [id, await uri(`color-${id}`)] as const),
    )),
  }))();
  return cached;
}
```

`src/widgets/syncWidgets.ios.ts`:

```ts
import { AppState } from 'react-native';
import { subscribeLocalChange } from '../sync/changes';
import ChagokGoal from '../../widgets/ios/ChagokGoal';
import ChagokMonth from '../../widgets/ios/ChagokMonth';
import ChagokTally from '../../widgets/ios/ChagokTally';
import { applyWidgetRequests } from './applyRequests';
import { buildWidgetSnapshot } from './snapshot';
import { loadWidgetInputs } from './loadSnapshot';
import { goalWidgetProps, monthWidgetProps, tallyWidgetProps } from './widgetProps';
import { syncWidgetsOnce } from './syncCore';
import type { WidgetPort } from './syncCore';
import { widgetArt } from './widgetArt';

type AnyWidget = { getTimeline(): Promise<{ props?: { requests?: unknown[] } }[]>; updateTimeline(e: { date: Date; props: never }[]): void };
const port = (w: unknown): WidgetPort => {
  const widget = w as AnyWidget;
  return {
    readRequests: async () => (await widget.getTimeline()).flatMap((t) => t.props?.requests ?? []),
    write: (entries) => widget.updateTimeline(entries as never),
  };
};

let running: Promise<void> | null = null;
let again = false;

/** 한 번에 하나만 돈다. 도는 중에 또 불리면 끝난 뒤 한 번 더. */
function run(): void {
  if (running) { again = true; return; }
  running = syncWidgetsOnce({
    widgets: { goal: port(ChagokGoal), month: port(ChagokMonth), tally: port(ChagokTally) },
    apply: applyWidgetRequests,
    props: async (now) => {
      const [inputs, art] = await Promise.all([loadWidgetInputs(now), widgetArt()]);
      const s = buildWidgetSnapshot(inputs, now);
      return { goal: goalWidgetProps(s, art), month: monthWidgetProps(s, art, now), tally: tallyWidgetProps(s, art) };
    },
    now: () => new Date(),
  })
    .catch(() => { /* 다음 계기에 다시 한다. 위젯은 이전 화면을 보여 준다 */ })
    .finally(() => { running = null; if (again) { again = false; run(); } });
}

/** 앱을 열 때·앞으로 올 때·기록이 바뀔 때(1초 모아서) 위젯을 맞춘다 (위젯 설계 「갱신 시점」). */
export function startWidgetSync(): () => void {
  run();
  const app = AppState.addEventListener('change', (s) => { if (s === 'active') run(); });
  let timer: ReturnType<typeof setTimeout> | null = null;
  const off = subscribeLocalChange(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; run(); }, 1000);
  });
  return () => { app.remove(); off(); if (timer) clearTimeout(timer); };
}
```

`loadWidgetInputs(midnight)`는 자정 날짜의 달을 읽는다 — 월말 자정 항목은 다음 달이라 비어 있는 게 맞다(기존 테스트 「다음 달 0시에는 0%」).

`src/widgets/syncWidgets.ts` (iOS 밖):

```ts
/** iOS 밖에서는 아직 위젯이 없다 (Android는 계획 2). */
export function startWidgetSync(): () => void {
  return () => {};
}
```

`app/_layout.tsx` — `RootLayout` 안, 스플래시 콜백들 바로 아래(시험 구현과 같은 자리):

```tsx
import { startWidgetSync } from '../src/widgets/syncWidgets';
// …
  // 위젯에서 누른 스티커를 기록에 반영하고 위젯을 맞춘다 (위젯 설계 「위젯에서 붙이기」). DB 준비가 끝난 뒤.
  useEffect(() => {
    if (!splashDone) return;
    return startWidgetSync();
  }, [splashDone]);
```

- [ ] **Step 3b: 복원·초기화 뒤에도 갱신** (위젯 설계 「갱신 시점」) — 복원 완료, 로그아웃·계정 삭제 뒤 기기 초기화도 위젯을 맞춰야 한다. `grep -n "notifyLocalChange" src/sync/restore.ts src/sync/wipe.ts`로 두 흐름이 끝에 신호를 보내는지 확인한다. 안 보내면 각 함수의 쓰기가 끝난 뒤(트랜잭션 밖) `notifyLocalChange()`를 한 줄 부르고, 그 파일의 기존 테스트(`__tests__/restore.test.ts`, `__tests__/wipe.test.ts`)에 「끝나면 로컬 변경 신호를 보낸다」 테스트를 더한다(`subscribeLocalChange`로 호출 횟수 확인). 이미 보내면 손대지 않는다.

- [ ] **Step 4: Checks** — Task 9의 위젯 파일이 있어야 번들이 된다. Task 8 Step 1~3을 커밋한 뒤 Task 9를 하고, Task 9 Step 4에서 함께 확인한다. 여기서는:

Run: `npx jest __tests__/widgetSyncCore.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/widgets/syncCore.ts src/widgets/syncWidgets.ios.ts src/widgets/syncWidgets.ts src/widgets/widgetArt.ios.ts app/_layout.tsx __tests__/widgetSyncCore.test.ts
git commit -m "feat(widgets): apply widget taps and refresh widgets on launch, resume, and edits"
```

---

### Task 9: 위젯 3종 화면

시험 구현 화면을 옮기고 결정을 반영한다. 위젯 함수 안에서는 바깥을 참조할 수 없으므로 색·요청 만들기를 위젯마다 다시 쓴다.

**Files:**
- Create: `widgets/ios/ChagokGoal.tsx`, `widgets/ios/ChagokMonth.tsx`, `widgets/ios/ChagokTally.tsx`

**Interfaces:**
- Consumes (타입만): `GoalWidgetProps`, `MonthWidgetProps`, `TallyWidgetProps` (Task 5)
- Produces: `export default createWidget<GoalWidgetProps, Config>('ChagokGoal', ChagokGoal)` 등. `type Config = { background: string; goal?: string }`. 이름은 `app.json`(Task 6)과 같아야 한다.

세 파일 공통 규칙:
- 고른 목표: `const g = props.goals[env.configuration?.goal ?? ''] ?? (props.defaultId ? props.goals[props.defaultId] : undefined);`
- `g`가 없으면 빈 상태: 졸린 차곡이(`props.mascotSleepy`, 40pt) + 문구(목표 하나 「첫 목표를 만들어 보세요」, 이번 달 「달력판 목표를 만들어 보세요」, 적립판 「적립판 목표를 만들어 보세요」), 가운데 정렬, 루트 `widgetURL('chagok://goal/new')`(새 목표 화면 `app/goal/new.tsx`). 중간 위젯(이번 달·적립판)은 문구 아래에 [목표 만들기] 단추 모양(살구색 바탕 `#FD855F`, 글자 `#06261C`, 13pt — 누르면 같은 주소, PRD 4.10 「목표가 없을 때」).
- 색: `const pal = env.configuration?.background === 'white' ? 'white' : env.configuration?.background === 'ink' ? 'ink' : 'ivory';` → Global Constraints의 값, 말풍선 `props.bubbles[pal]`.
- **그릴 값 = 앱이 준 값 + 아직 처리 안 된 요청** (Review Focus 2). 이 항목의 날짜는 `env.timestamp`(그 타임라인 항목의 시각, ms)로 정한다 — 자정 항목이면 다음 날이다. 위젯 함수 안에 그대로 쓴다:

```ts
const ts = (env as { timestamp?: number }).timestamp ?? Date.now();
const day = new Date(ts);
const pad = (n: number) => String(n).padStart(2, '0');
const todayKey = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
const mine = (props.requests ?? []).filter((r) => r.goalId === g.id).sort((a, b) => a.at - b.at);
let net = 0;
let todayState: boolean | null = null; // 오늘 날짜 요청의 마지막 결과: true 붙임, false 뗌
for (const r of mine) {
  net += r.kind === 'add' ? 1 : -1;
  if (r.dateKey === todayKey) todayState = r.kind === 'add';
}
const placedToday = todayState ?? g.placedToday;
const undoable = todayState ?? g.undoable;
const placed = Math.max(0, g.placed + net);
const remaining = g.remaining === null ? null : g.remaining - net;
const lastSlot = remaining !== null && remaining <= 1;
```

  `env.timestamp`가 `WidgetEnvironment` 타입에 있으면 단언 없이 쓴다(`node_modules/expo-widgets/build/*.d.ts` 확인). 이번 달은 `days`도 고친다:

```ts
const days = g.days.slice();
for (const r of mine) {
  if (!r.dateKey.startsWith(todayKey.slice(0, 8))) continue; // 이 달 요청만
  const i = Number(r.dateKey.slice(8, 10)) - 1;
  if (days[i] === undefined || days[i] === 'outside') continue;
  days[i] = r.kind === 'add' ? 'filled' : r.dateKey < todayKey ? 'missed' : 'future';
}
```

  적립판은 `cells`를 복사해 `net`만큼 앞의 `'empty'`를 `'filled'`로(음수면 뒤의 `'filled'`를 `'empty'`로) 바꾼다 — 칸 위치는 어림이고 앱이 열리면 맞춘다.
- `%`는 `Math.floor((placed / Math.max(1, g.total)) * 100)`.
- 말풍선: `placed >= g.total` → `Done!`, `placedToday` → `Nice!`, 그 밖 `Ready?`. 글자에 `offset({ x: 0.5, y: -1.5 })`(시험 구현에서 픽셀로 맞춘 값). 차곡이: 붙임·다 채움 = 신남(`mascotDone`), 아니면 갸웃(`mascotYet`).
- 루트: `containerBackground(bg, 'widget')`, `widgetURL(`chagok://goal/${g.id}`)`(숫자·이름을 누르면 판 상세).
- 누르는 곳(목표 하나 = 스티커, 이번 달 = 달력, 적립판 = 칸 묶음)의 동작 — 위에서 계산한 값으로 정한다:

| 상태 | 누르면 |
| --- | --- |
| `lastSlot && !placedToday` | 버튼 대신 `Link` → `chagok://goal/${g.id}?place=1` (Task 10, 완성 확인) |
| `placedToday && !undoable` | `Link` → `chagok://goal/${g.id}` (기록이 있어 위젯에서 떼지 않음) |
| `placedToday && undoable` | 버튼 → `undo` 요청 |
| 그 밖 | 버튼 → `add` 요청 |

  `Link`의 컴포넌트 이름과 주소 prop 이름은 `@expo/ui/swift-ui`의 타입 정의에서 확인한다(expo-widgets가 `LinkView`를 그린다 — `node_modules/expo-widgets/ios/Widgets/DynamicView.swift`).
- 버튼 `onPress`는 **요청만 더한다.** 화면 값(`goals`)은 고치지 않는다 — 다음에 그릴 때 위 계산이 요청을 반영한다:

```ts
onPress={() => {
  const kind = placedToday ? 'undo' : 'add';
  const now = new Date();
  const p2 = (n: number) => String(n).padStart(2, '0');
  const req = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    goalId: g.id, kind, at: now.getTime(),
    dateKey: `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}`,
  };
  return { requests: [...(props.requests ?? []), req] };
}}
```

  `at`·`dateKey`는 항목 날짜가 아니라 **누른 순간**(`new Date()`)이다 — 붙인 시각은 늘 누른 시각.
- 스티커 이미지에 `widgetAccentedRenderingMode`를 쓰지 않는다. 누르는 영역 라벨 맨 바깥에 `contentShape(shapes.rectangle())`.

- [ ] **Step 1: `ChagokGoal.tsx`** — 시작점 `git show spike/widgets:widgets/ios/ChagokRing.tsx`. 바꿀 것: 이름·props 타입(`GoalWidgetProps`)·`Config`, 위 공통 규칙, `placedToday`가 아니면 스티커 흐리게(`opacity(0.25)`, `grayscale(1)`), 마지막 칸 `Link`도 같은 흐린 스티커. 그릴 값은 위 「그릴 값」 계산을 쓴다.

- [ ] **Step 2: `ChagokMonth.tsx`** — 시작점 `git show spike/widgets:widgets/ios/ChagokBoard.tsx`. 칸 22×20pt·간격 2pt(6주짜리 달도 높이에 든다 — 시험 구현 결과), 붙인 날은 그날 스티커 20pt, 오늘 칸 테두리 `#FD855F` 2pt, 앞날 `opacity(0.3)`, 지난 빈 날 `opacity(0.7)`, 기간 밖(`'outside'`)은 빈칸, 맨 위 `n월` 11pt `opacity(0.6)`.

- [ ] **Step 3: `ChagokTally.tsx`** — 새로 만든다. 왼쪽은 `ChagokMonth`와 같은 뼈대(큰 % · 차곡이 · 말풍선 · 이름), 오른쪽은 10칸 5×2: 칸 26×26pt(위젯 높이에 맞춰 조정), 칸 번호 `g.from + i`(10pt, `opacity(0.7)`), 붙인 칸은 스티커 22pt, 다음 빈칸(첫 `'empty'`)은 살구색 테두리 2pt. 칸 묶음 전체가 버튼(또는 `Link`).

- [ ] **Step 4a: 위젯 로직 테스트** — 위젯 함수는 SwiftUI 부품을 그릴 뿐이라, 부품을 이름만 남기는 가짜로 바꾸면 jest에서 부를 수 있다(`tsconfig`의 `jsx: react-jsx`). `__tests__/widgetViews.test.ts`:

```ts
import type { ReactElement } from 'react';
import type { GoalWidgetProps, MonthWidgetProps } from '../src/widgets/widgetProps';

jest.mock('expo-widgets', () => ({ createWidget: (_name: string, fn: unknown) => fn }));
jest.mock('@expo/ui/swift-ui', () => new Proxy({}, { get: (_t, name) => (name === '__esModule' ? true : String(name)) }));
jest.mock('@expo/ui/swift-ui/modifiers', () => new Proxy({}, {
  get: (_t, name) => (name === '__esModule' ? true
    : name === 'shapes' ? { rectangle: () => ({ shape: 'rectangle' }) }
    : (...args: unknown[]) => ({ [String(name)]: args })),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ChagokGoal = require('../widgets/ios/ChagokGoal').default as (p: GoalWidgetProps, env: object) => ReactElement;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ChagokMonth = require('../widgets/ios/ChagokMonth').default as (p: MonthWidgetProps, env: object) => ReactElement;

type El = { type: unknown; props: Record<string, unknown> };
function all(node: unknown, out: El[] = []): El[] {
  if (Array.isArray(node)) { node.forEach((n) => all(n, out)); return out; }
  if (node && typeof node === 'object' && 'props' in node) {
    const el = node as El;
    out.push(el);
    all(el.props.children, out);
  }
  return out;
}
const texts = (root: unknown) => all(root).flatMap((e) => (typeof e.props.children === 'string' ? [e.props.children] : []));
const button = (root: unknown) => all(root).find((e) => e.type === 'Button')!;
const hasPlaceLink = (root: unknown) => JSON.stringify(all(root).map((e) => e.props)).includes('?place=1');

const t = (d: number, h = 12, m = 0) => new Date(2026, 9, d, h, m).getTime();
const shared = { order: [{ id: 'run', name: '런닝' }], defaultId: 'run', today: '2026-10-06', mascotYet: 'y', mascotDone: 'd', mascotSleepy: 'z', bubbles: { ivory: 'bi', white: 'bw', ink: 'bk' } };
const card = { id: 'run', name: '런닝', placed: 5, total: 31, placedToday: false, undoable: false, remaining: null as number | null, sticker: 's' };
const env = (ts: number) => ({ timestamp: ts, configuration: { background: 'ivory' } });
const lateTap = { id: 'w1', goalId: 'run', kind: 'add' as const, at: t(6, 23, 50), dateKey: '2026-10-06' };

describe('위젯 화면 로직', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(t(7, 0, 5)); });
  afterEach(() => jest.useRealTimers());

  it('누르면 요청만 더하고, 붙인 시각은 누른 순간이다', () => {
    const root = ChagokGoal({ ...shared, goals: { run: card }, requests: [] }, env(t(6)));
    const out = (button(root).props.onPress as () => { requests: { kind: string; at: number; dateKey: string }[]; goals?: unknown })();
    expect(out.goals).toBeUndefined();
    expect(out.requests).toEqual([expect.objectContaining({ kind: 'add', at: t(7, 0, 5), dateKey: '2026-10-07' })]);
  });

  it('같은 날 요청이 있으면 Nice!이고 다시 누르면 뗀다', () => {
    const root = ChagokGoal({ ...shared, goals: { run: card }, requests: [lateTap] }, env(t(6, 23, 51)));
    expect(texts(root)).toContain('Nice!');
    const out = (button(root).props.onPress as () => { requests: { kind: string }[] })();
    expect(out.requests[1].kind).toBe('undo');
  });

  it('자정 항목에서도 어젯밤 요청이 보이고 오늘 붙일 수 있다 (Review Focus 2)', () => {
    const days = Array.from({ length: 31 }, (_, i) => (i < 6 ? 'missed' : 'future')) as MonthWidgetProps['goals'][string]['days'];
    const month = { ...card, monthLabel: '10월', days, firstWeekday: 4, todayIndex: 6 };
    const root = ChagokMonth({ ...shared, todayIndex: 6, goals: { run: month }, requests: [lateTap] } as MonthWidgetProps, env(t(7, 0, 0)));
    expect(all(root).filter((e) => e.type === 'Image' && e.props.uiImage === 's')).toHaveLength(1); // 10/6 칸
    expect(texts(root)).toContain('Ready?');
    const out = (button(root).props.onPress as () => { requests: { kind: string; dateKey: string }[] })();
    expect(out.requests[1]).toMatchObject({ kind: 'add', dateKey: '2026-10-07' });
  });

  it('처리 안 된 요청을 빼고 남은 칸이 1이면 판 화면을 연다', () => {
    const tallyLike = { ...card, remaining: 2 };
    expect(hasPlaceLink(ChagokGoal({ ...shared, goals: { run: tallyLike }, requests: [lateTap] }, env(t(7, 9))))).toBe(true);
    expect(hasPlaceLink(ChagokGoal({ ...shared, goals: { run: tallyLike }, requests: [] }, env(t(7, 9))))).toBe(false);
  });
});
```

부품 이름(`Button`·`Image`·`uiImage`)이 위젯 파일과 다르면 테스트를 위젯 파일에 맞춘다. 차곡이 이미지(`mascotYet` 등)는 `uiImage`가 `'y'`/`'d'`라 스티커(`'s'`) 개수 세기에 섞이지 않는다.

Run: `npx jest __tests__/widgetViews.test.ts`
Expected: PASS (위젯 파일을 쓰기 전에 이 테스트를 먼저 만들어 FAIL을 본 뒤 Step 1~3을 진행해도 된다)

- [ ] **Step 4: Checks** (Task 8 포함)

Run: `npx jest && npm run typecheck && npm run lint && npx expo export --platform ios --output-dir /tmp/check && rm -rf /tmp/check`
Expected: 모두 통과.

- [ ] **Step 5: Commit**

```bash
git add widgets/ios __tests__/widgetViews.test.ts
git commit -m "feat(widgets): goal, month, and tally widgets for iOS"
```

---

### Task 10: 마지막 칸 — 위젯에서 판 화면을 열어 완성 확인

**Files:**
- Modify: `app/goal/[id]/index.tsx`

**Interfaces:**
- Consumes: 딥링크 `chagok://goal/{id}?place=1` (Task 9)

- [ ] **Step 1: Implement** — `useLocalSearchParams<{ id: string; place?: string }>()`로 바꿔 `place`를 받고, 데이터를 읽은 뒤 한 번만 실행한다. 이 effect는 `if (!data || !goal) return (…)` 이른 반환보다 **위**(다른 hook들과 같은 자리)에 둔다:

```tsx
  // 위젯에서 마지막 칸을 눌러 열렸다 → 평소처럼 완성을 확인받고 붙인다 (2026-10-06 결정, PRD 4.7).
  const placeHandled = useRef(false);
  useEffect(() => {
    if (place !== '1' || placeHandled.current || !data || !goal || isCompleted(goal)) return;
    placeHandled.current = true;
    router.setParams({ place: undefined });
    const now = new Date();
    if (goal.boardType === 'tally') {
      const slot = nextEmptySlot(goal, data.stickers);
      if (slot !== null) void place(slot, { slot });
    } else {
      const date = localDateKey(now.getTime());
      if (canPlace(goal, data.stickers, { date }, now)) void place(now.getDate() - 1, { date });
    }
    // place는 매 렌더 새로 만들어진다. 데이터가 처음 준비될 때 한 번만 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place, data, goal]);
```

`place` 함수가 이른 반환 아래에 정의돼 있어 effect에서 부를 수 없으면, `place`를 `useCallback` 없이 effect 위로 옮기지 말고 대신 **"위젯에서 왔다" 상태만 effect에서 세우고, 이른 반환 아래에서 그 상태를 보고 `place`를 부른다**(`useState`로 `pendingPlace` 두기). 달력판 `slotIndex`와 `at` 인자 모양은 같은 파일의 빈칸 누르기 처리와 같게 한다. `nextEmptySlot`·`localDateKey`·`useRef` import를 더한다.

- [ ] **Step 2: Checks**

Run: `npm run typecheck && npm run lint && npm run test:components && npx expo export --platform ios --output-dir /tmp/check && rm -rf /tmp/check`
Expected: 통과.

- [ ] **Step 3: Commit**

```bash
git add "app/goal/[id]/index.tsx"
git commit -m "feat(goal): open from the widget's last slot and confirm completion"
```

---

### Task 11: 시뮬레이터 확인과 문서

**Files:**
- Modify: `docs/HANDOFF.md`, `docs/superpowers/specs/2026-09-30-home-widget-design.md`
- Create: `docs/design/widgets/*.png`

- [ ] **Step 1: Build** — `npx expo prebuild --platform ios --clean && npx expo run:ios --device "iPhone 16 Pro"`

- [ ] **Step 2: 확인 목록** (Maestro 또는 손으로, 각각 스크린샷을 `docs/design/widgets/`에 남긴다. Maestro `tapOn point` 퍼센트는 정수만 받는다.)
  1. 위젯 추가 화면에 「목표 하나」「이번 달」「적립판」이 보인다.
  2. 위젯 편집: 「바탕」(아이보리·흰색·먹색) + 「목표」. 이번 달 목록엔 달력판만, 적립판 목록엔 적립판만.
  3. 목표 하나: 흐린 스티커를 누르면 앱이 열리지 않고 붙는다 → **앱을 열면 그 판에 실제로 붙어 있다** → 위젯에서 다시 누르면 떨어지고, 앱을 열면 앱에서도 없다.
  4. 같은 종류 위젯 두 개에 서로 다른 목표 → 한쪽을 눌러도 다른 쪽은 그대로.
  5. 마지막 칸 → 앱의 판 화면이 열리고 「이 판을 완성할까요?」.
  6. 앱에서 사진·메모를 남긴 오늘 스티커를 위젯에서 누름 → 떨어지지 않고 판 화면이 열린다.
  7. 목표를 모두 지움 → 졸린 차곡이 빈 상태, 누르면 새 목표 화면.
  8. 먹색은 라이트 홈 화면에서도 먹색, 아이보리는 다크 홈 화면에서도 아이보리.
  9. 앱을 연 채로 위젯을 눌러도(앱이 뒤에 있을 때) 요청이 사라지지 않는다 — 앱으로 돌아오면 반영된다.
  10. 자정 넘김: 시뮬레이터 시각을 23:58로 맞추고(또는 실제로 기다려) 위젯에서 붙인 뒤 앱을 열지 않고 0시를 넘긴다 → 이번 달 위젯에 어젯밤 칸이 채워져 있고, 오늘은 `Ready?`, 다시 누르면 오늘 칸에 붙는다 → 앱을 열면 두 스티커가 각각 누른 시각·날짜로 저장돼 있다.

- [ ] **Step 3: Docs**
  - 위젯 설계 「위젯에서 붙이기」 아래에 「2026-10-06 본 구현」 절: 요청 모양 `{id, goalId, kind, at, dateKey}`은 위젯 타임라인 props에 쌓는다(로컬 Expo 모듈은 만들지 않음), 스티커 id = 요청 id, 마지막 칸은 앱에서 확인, 되돌리기는 같은 곳 다시 누르기, 기록 있는 스티커는 위젯에서 떼지 않음, 목표는 위젯 편집(설정 플러그인 `plugins/widget-goal`). 위젯은 누르면 요청만 쌓고 「앱이 준 값 + 처리 안 된 요청」으로 그린다 — 요청은 타임라인 모든 항목에 합쳐 보여서 자정을 넘겨도 붙인 것이 유지된다. 붙인 시각은 늘 누른 시각.
  - HANDOFF: 위젯 iOS 구현 현황, 그리고 **"expo-widgets를 올릴 때: `npx expo prebuild --platform ios --clean` → iOS 빌드 → 위젯 편집 「목표」 확인. prebuild가 `widget-goal: … 자리를 못 찾았어요`로 멈추면 expo-widgets가 만드는 Swift 모양이 바뀐 것이니 `plugins/widget-goal/patch.js`와 fixture를 새 모양에 맞춘다."**

- [ ] **Step 4: Commit**

```bash
git add docs
git commit -m "docs(widgets): iOS widgets implemented; upgrade checklist"
```
