# 스티커 화면 앱 연결 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Storybook에 확정된 스티커 화면(「기본 스티커」·묶음 화면·앱 설정 「구매」 블럭)을 앱에 연결해, 모든 스티커를 컬러로 쓰고 묶음을 사기·광고 하루·붙인 날 3일 체험으로 열 수 있게 한다.

**Architecture:** 저장된 흑백 스티커 ID를 스키마 v6에서 컬러 ID(`basic.*`)로 옮기고, 묶음을 쓸 수 있는지는 새 표 `pack_access`(묶음 · 연 방법 · 끝나는 시각)와 순수 함수(`src/domain/packs.ts`)로 판단한다. 결제·광고는 `src/purchases/` 인터페이스 뒤에 두고 이번에는 **개발용 대역**(누르면 바로 성공)으로 연결한다 — 실제 RevenueCat·AdMob은 스토어 상품 등록이 필요해 다음 계획에서 같은 인터페이스에 끼운다. 화면 사이 고른 스티커는 작은 메모리 저장소로 넘긴다.

**Tech Stack:** Expo 57, expo-router, expo-sqlite(`PRAGMA user_version` 마이그레이션), jest + ts-jest(도메인·저장소), vitest(컴포넌트), expo-widgets(iOS 위젯)

**Spec:** `docs/PRD.md` 4.12, `docs/RELEASE-DECISIONS.md` 2026-10-05~08 줄, 시안 https://claude.ai/artifact/MX8DFS3TUf5KHFX5F3gMCH (19판), Storybook `Screens/Sticker Shop`

## Global Constraints

- 모든 스티커는 컬러. 판·목록 48pt, 달력 24pt (PRD 4.12, RELEASE-DECISIONS 2026-10-07).
- 묶음 10종, 2,200원. 광고 제거 5,500원 (RELEASE-DECISIONS 2026-10-05·07).
- 여는 길: ① 사기(영구) ② 광고를 끝까지 본 때부터 **24시간**(자정에 끊지 않음) ③ 붙인 날 **누적** 7일·14일, 그 뒤 30일마다 묶음 하나 **3일**. 하루 여러 장도 1일.
- 광고 제거를 산 사람에게는 [광고 보고 하루 써 보기]가 없다.
- 체험으로 붙인 스티커는 체험이 끝나도 판에 그대로 보인다. 막는 것은 **새로 붙이기**뿐이다.
- 화면 문구에 「보상」이라는 말을 쓰지 않는다. 문구는 `stickerShopDialogs`와 PRD 4.12 그대로.
- 구매 복원은 앱 설정 「구매」 블럭에만.
- `package.json` overrides(`react-dom 19.2.3`)는 건드리지 않는다. 디자인 시스템 토큰 기존 값은 바꾸지 않는다.
- 화면을 추가·변경했으면 같은 작업에서 `Flows/앱 전체` 흐름도(`stories/flows/app-flow.json`)를 맞춘다.
- `src/stickers/catalog.ts`(옛 카탈로그)는 지우지 않는다.

## 이 계획에서 정한 것 (사용자 확인 필요)

| # | 정한 것 | 이유 | 바꾸면 |
| --- | --- | --- | --- |
| A | 결제·광고는 **개발용 대역**으로 연결하고, 실제 RevenueCat·AdMob은 다음 계획 | 실제 연결은 App Store Connect 상품 등록·AdMob 계정·개발 빌드 재생성이 필요하다. 화면·저장·권한 규칙은 대역으로 먼저 끝까지 확인할 수 있다 | Task 5만 바뀐다 |
| B | 붙인 날 3일 체험으로 **같은 묶음을 다시 고를 수 있다**(지금 체험 중이거나 산 묶음만 빼고) | PRD 11절 미정. 가장 단순하고, 막는 규칙은 나중에 더할 수 있다 | `canStartDayTrial` 한 줄 |
| C | 남은 시간 배지: 24시간 넘게 남으면 「n일 남음」(올림), 24시간 이하면 「n시간 남음」(올림) | 시안은 「24시간 남음」「3일 남음」만 보여 준다. 광고 하루는 「24시간 남음」부터 시작한다 | `trialLabel` 한 함수 |
| D | 붙인 날은 **스티커를 실제로 누른 날**을 따로 기록한 표(`placed_days`)의 날짜 수로 센다 — 사용자 확인 2026-10-08. 달력판에서 10/8에 10/7·10/8 칸을 붙이면 판에는 두 칸, 누른 날은 10/8 하나. 떼도 줄지 않는다. 처음에는 지금 붙어 있는 스티커 날짜로 한 번 채운다. 받은 체험 수는 따로 저장해 같은 문턱을 두 번 받지 않는다 | 스티커의 붙인 시각으로 세면 달력판 지난 칸을 몰아 채워 붙인 날을 늘릴 수 있고, 떼면 줄어든다 | `placed_days` 표 |
| E | 묶음 권한(`pack_access`)과 누른 날(`placed_days`)은 **이 기기에만** 두고 서버로 올리지 않는다 | 산 것은 스토어(RevenueCat)가 원본이라 다음 계획의 복원으로 되살린다. 체험은 짧아서 앱을 지우면 사라져도 된다 | 서버 표·동기화 추가 |
| F | 홈 배너 광고는 이번에 넣지 않는다(`footer` 비움) | AdMob 연결과 함께 다음 계획에서 | — |

## Review Focus

1. 체험이 끝난 묶음 스티커가 기본인 목표: 판 화면에서 붙이면 붙지 않고 「n일 체험이 끝났어요」가 떠야 한다. 이미 붙은 칸은 그대로 보여야 한다.
2. 위젯 탭 요청이 체험이 끝난 뒤 앱에 반영될 때: 붙이지 않고 버린다(위젯은 앱을 열어 안내하는 링크로 바뀐다).
3. 옛 흑백 ID(`sprout` 등)가 서버 복원으로 다시 들어와도 화면이 컬러로 보여야 한다(`normalizeStickerId`).
4. 기기 시계를 돌려 체험을 늘리는 경우 — 막지 않는다(기기 시각 기준). 리뷰어는 「끝난 시각이 지나면 잠긴다」만 확인한다.
5. 붙인 날 문턱을 여러 개 넘긴 채 한 번도 받지 않은 경우: 받을 수 있는 체험 수 = 넘긴 문턱 수 − 받은 수.
6. 위젯 탭이 다음 날 앱에서 반영될 때: 누른 날은 반영한 날이 아니라 **위젯을 누른 날**(`req.at`)이다.

---

## 파일 구조

| 파일 | 할 일 |
| --- | --- |
| `src/stickers/stickerIds.ts` (새) | 저장값 → 컬러 ID 정규화 `normalizeStickerId` |
| `src/app-data/pocketAdapter.ts` | `safeStickerId` → `normalizeStickerId`로 바꾸고 타입을 `StickerId`로 |
| `src/db/schema.ts` | v6: 저장된 흑백 ID를 `basic.*`로, `pack_access`·`placed_days` 표 |
| `src/repositories/stickerRepository.ts` | 붙일 때 누른 날을 `placed_days`에 남김 |
| `src/domain/packs.ts` (새) | 묶음 상태·체험 시각·붙인 날 문턱 순수 함수 |
| `src/repositories/packRepository.ts` (새) | `pack_access` 읽기·쓰기, 붙인 날 수, 받은 체험 수 |
| `src/purchases/index.ts` (새) | 결제·광고 인터페이스와 개발용 대역 |
| `src/app-data/stickerChoice.ts` (새) | 「기본 스티커」 화면 → 부른 화면으로 고른 스티커 넘기기 |
| `app/stickers/choose.tsx` (새) | 「기본 스티커」 화면 |
| `app/stickers/pack/[packId].tsx` (새) | 묶음 화면 |
| `app/goal/new.tsx`, `app/goal/[id]/settings.tsx` | `onChooseSticker` 연결 |
| `app/goal/[id]/index.tsx` | 붙이기 전 묶음 확인, 「체험이 끝났어요」 |
| `app/settings.tsx` | 「구매」 블럭 |
| `src/widgets/*`, `widgets/ios/*.tsx`, `scripts/build-widget-art.mjs`, `assets/widget-art/` | 컬러 ID 전부 그림, 잠긴 목표는 앱 열기 링크 |
| `stories/flows/app-flow.json`, `docs/HANDOFF.md`, `docs/PRD.md` | 흐름도·현황 |

---

### Task 1: 스티커 ID를 컬러로 정규화

**Files:**
- Create: `src/stickers/stickerIds.ts`
- Modify: `src/app-data/pocketAdapter.ts`, `app/goal/new.tsx`, `app/goal/[id]/settings.tsx`, `app/goal/[id]/index.tsx`, `app/sticker/[id].tsx`, `src/widgets/snapshot.ts`, `src/widgets/applyRequests.ts`, `src/domain/types.ts`
- Test: `__tests__/stickerIds.test.ts`, 기존 `__tests__/pocketAdapter.test.ts`

**Interfaces:**
- Produces: `normalizeStickerId(raw: string): ColorStickerId`, `DEFAULT_STICKER_ID = 'basic.sprout'`

- [ ] **Step 1: 실패하는 테스트**

```ts
// __tests__/stickerIds.test.ts
import { normalizeStickerId } from '../src/stickers/stickerIds';

describe('normalizeStickerId', () => {
  it('컬러 ID는 그대로', () => expect(normalizeStickerId('animals.cat')).toBe('animals.cat'));
  it('옛 흑백 ID는 기본 묶음의 같은 그림으로', () => {
    for (const id of ['sprout', 'cat', 'star', 'flower', 'book', 'shoe']) expect(normalizeStickerId(id)).toBe(`basic.${id}`);
  });
  it('모르는 값은 새싹으로 — 저장값은 바꾸지 않는다', () => {
    expect(normalizeStickerId('stamp')).toBe('basic.sprout');
    expect(normalizeStickerId('animals.nope')).toBe('basic.sprout');
  });
});
```

- [ ] **Step 2: 실행해서 실패 확인** — `npx jest __tests__/stickerIds.test.ts` → Cannot find module

- [ ] **Step 3: 구현**

```ts
// src/stickers/stickerIds.ts
import { colorStickers, type ColorStickerId } from './color/catalog';
import { pocketStickers } from './pocket/catalog';

const COLOR = new Set<string>(colorStickers.map((s) => s.id));
const LEGACY = new Set<string>(pocketStickers.map((s) => s.id));
export const DEFAULT_COLOR_STICKER: ColorStickerId = 'basic.sprout';

/**
 * 저장값을 그릴 수 있는 컬러 ID로 (2026-10-07 모두 컬러). 스키마 v6이 기기 값은 옮기지만
 * 서버 복원으로 옛 흑백 ID가 다시 올 수 있어 읽을 때마다 거친다. 저장값은 바꾸지 않는다.
 */
export function normalizeStickerId(raw: string): ColorStickerId {
  if (COLOR.has(raw)) return raw as ColorStickerId;
  if (LEGACY.has(raw)) return `basic.${raw}` as ColorStickerId;
  return DEFAULT_COLOR_STICKER;
}
```

- `pocketAdapter.ts`: `safeStickerId`를 지우고 부르는 곳을 모두 `normalizeStickerId`로 바꾼다. `Record<number, PocketStickerId>` → `Record<number, StickerId>`.
- `domain/types.ts`: `DEFAULT_STICKER_ID = 'basic.sprout'`. `stickerRepository.placeSticker`의 `stickerType` 매개변수를 `string`으로 바꾼 뒤 `STICKER_TYPES`·`StickerType`을 부르는 곳이 없으면 지운다.
- 앱 화면의 `PocketStickerId` 상태 → `StickerId`(새 목표 기본값 `'basic.sprout'`).

- [ ] **Step 4: 통과 확인** — `npm test && npm run typecheck` → 모두 통과. 흑백 ID를 기대하던 기존 테스트(`pocketAdapter`, `widgetSnapshot`)는 기대값을 `basic.*`로 고친다 — 동작 변경이 맞다.

- [ ] **Step 5: 커밋** — `feat(stickers): read every stored sticker as a color id`

### Task 2: 스키마 v6 — 저장값 옮기기, `pack_access`, `placed_days`

**Files:**
- Modify: `src/db/schema.ts`, `src/repositories/stickerRepository.ts`, `src/widgets/applyRequests.ts`
- Test: `__tests__/migrations.test.ts`, `__tests__/stickerRepository.test.ts`, `__tests__/applyWidgetRequests.test.ts`

**Interfaces:**
- Produces:
  - 표 `pack_access(pack_id TEXT PRIMARY KEY, source TEXT NOT NULL CHECK (source IN ('purchase','ad','days')), granted_at INTEGER NOT NULL, expires_at INTEGER)` — `expires_at` null = 영구(산 묶음)
  - 표 `placed_days(date_key TEXT PRIMARY KEY)` — 스티커를 누른 로컬 날짜 'YYYY-MM-DD'(D)
  - `placeSticker(goalId, slotIndex, stickerType, opts?: { id?; placedAt?; complete?; pressedAt?: number })` — `pressedAt`(기본 지금)의 로컬 날짜를 같은 트랜잭션에서 `INSERT OR IGNORE INTO placed_days`

- [ ] **Step 1: 실패하는 테스트**
  - 마이그레이션: v5 DB에 `sprout`·`cat`·`stamp` 목표와 스티커를 넣고 v6으로 올리면 `basic.sprout`·`basic.cat`, 모르는 값 `stamp`는 그대로(읽을 때 정규화), `updated_at`은 바뀌지 않고 outbox에 줄이 생기지 않으며 `pack_access`는 비어 있다. `placed_days`는 기존 스티커의 로컬 날짜로 채워진다(같은 날 두 장 → 한 줄). (파일 안 기존 v4→v5 테스트처럼 앞 단계까지 올린 DB에서 시작한다.)
  - 저장소: 달력판에서 10/8(`pressedAt`)에 `placedAt` 10/7·10/8 두 장을 붙이면 `placed_days`는 `2026-10-08` 한 줄. 떼도 남는다.
  - 위젯 반영: 10/7에 누른 요청을 10/8에 반영하면 `placed_days`는 `2026-10-07`(`pressedAt: req.at`).

- [ ] **Step 2: 실패 확인** — `npx jest __tests__/migrations.test.ts`

- [ ] **Step 3: 구현** — `MIGRATIONS`에 여섯 번째 묶음:

```ts
  // v6 (2026-10-08): 모든 스티커를 컬러로. 흑백 6종은 기본 묶음의 같은 그림(basic.*)으로 옮긴다.
  // updated_at을 바꾸지 않는다 — 서버 값은 읽을 때 normalizeStickerId가 옮기므로 다시 올리지 않는다.
  // pack_access: 이 기기에서 쓸 수 있는 묶음. 산 묶음은 expires_at null. 서버로 올리지 않는다.
  [
    `UPDATE goals SET default_sticker_id = 'basic.' || default_sticker_id
       WHERE default_sticker_id IN ('sprout','cat','star','flower','book','shoe');`,
    `UPDATE stickers SET sticker_type = 'basic.' || sticker_type
       WHERE sticker_type IN ('sprout','cat','star','flower','book','shoe');`,
    `CREATE TABLE IF NOT EXISTS pack_access (
       pack_id TEXT PRIMARY KEY,
       source TEXT NOT NULL CHECK (source IN ('purchase','ad','days')),
       granted_at INTEGER NOT NULL,
       expires_at INTEGER
     );`,
    // placed_days: 스티커를 누른 로컬 날짜. 붙인 날 체험(7·14·이후 30일마다)을 센다. 떼도 지우지 않는다.
    // 달력판 지난 칸은 그 날짜로 붙지만 누른 날은 오늘이다 — 몰아 채워도 하루 (2026-10-08 사용자 확인).
    // 처음에는 지금 붙어 있는 스티커 날짜로 채운다. 'localtime'은 기기 시간대다.
    `CREATE TABLE IF NOT EXISTS placed_days (date_key TEXT PRIMARY KEY);`,
    `INSERT OR IGNORE INTO placed_days (date_key)
       SELECT DISTINCT date(placed_at / 1000, 'unixepoch', 'localtime') FROM stickers;`,
  ],
```

- 붙이기: `stickerRepository.placeSticker`가 스티커를 넣는 같은 트랜잭션에서 `INSERT OR IGNORE INTO placed_days (date_key) VALUES (?)` — 값은 `localDateKey(opts.pressedAt ?? Date.now())`. 앱 판 화면은 그대로 부르면 되고, `applyRequests`만 `pressedAt: req.at`을 넘긴다.

`goals.default_sticker_id`·`stickers.sticker_type`의 DEFAULT `'sprout'`은 그대로 둔다(SQLite는 기본값만 바꾸려면 표를 다시 만들어야 한다 — 앱은 항상 값을 넣는다).

- [ ] **Step 4: 통과 확인** — `npm test` 전체 통과
- [ ] **Step 5: 커밋** — `feat(db): schema v6 — color sticker ids, pack access and placed days`

### Task 3: 묶음 규칙 (순수 함수)

**Files:**
- Create: `src/domain/packs.ts`
- Test: `__tests__/packs.test.ts`

**Interfaces:**
- Produces:

```ts
export type PackAccess = { packId: ColorStickerPackId; source: 'purchase' | 'ad' | 'days'; grantedAt: number; expiresAt: number | null };
export type PackStatus = { state: 'free' | 'owned' | 'trial' | 'locked'; trialLabel?: string; trialKind?: '3일' | '하루'; endedKind?: '3일' | '하루' };
export const AD_TRIAL_MS = 24 * 60 * 60 * 1000;
export const DAY_TRIAL_MS = 3 * AD_TRIAL_MS;
export function packStatus(packId: ColorStickerPackId, access: readonly PackAccess[], now: number): PackStatus;
export function canUseSticker(id: ColorStickerId, access: readonly PackAccess[], now: number): boolean;
export function trialLabel(expiresAt: number, now: number): string;          // C
export function dayTrialThreshold(claimed: number): number;                  // 7, 14, 44, 74…
export function dayTrialsAvailable(days: number, claimed: number): number;   // Review Focus 5
export function canStartDayTrial(packId: ColorStickerPackId, access: readonly PackAccess[], days: number, claimed: number, now: number): boolean; // B
```

- [ ] **Step 1: 실패하는 테스트** (주요 경우)

```ts
const H = 3600_000, now = Date.UTC(2026, 9, 8, 14);
it('기본 묶음은 늘 free', () => expect(packStatus('basic', [], now).state).toBe('free'));
it('산 묶음은 owned, 끝나는 시각 없음', () => expect(packStatus('animals', [{ packId: 'animals', source: 'purchase', grantedAt: 0, expiresAt: null }], now).state).toBe('owned'));
it('광고 하루 체험 중 — 배지는 남은 시간', () => {
  const s = packStatus('animals', [{ packId: 'animals', source: 'ad', grantedAt: now, expiresAt: now + AD_TRIAL_MS }], now);
  expect(s).toEqual({ state: 'trial', trialLabel: '24시간 남음', trialKind: '하루' });
});
it('끝난 체험은 locked + 어떤 체험이 끝났는지', () => {
  expect(packStatus('animals', [{ packId: 'animals', source: 'days', grantedAt: 0, expiresAt: now - 1 }], now)).toEqual({ state: 'locked', endedKind: '3일' });
});
it('남은 시간: 24시간 넘으면 일(올림), 이하면 시간(올림)', () => {
  expect(trialLabel(now + DAY_TRIAL_MS, now)).toBe('3일 남음');
  expect(trialLabel(now + 25 * H, now)).toBe('2일 남음');
  expect(trialLabel(now + 24 * H, now)).toBe('24시간 남음');
  expect(trialLabel(now + 90_000, now)).toBe('1시간 남음');
});
it('문턱: 7, 14, 그 뒤 30일마다', () => expect([0, 1, 2, 3].map(dayTrialThreshold)).toEqual([7, 14, 44, 74]));
it('받을 수 있는 수 = 넘긴 문턱 − 받은 수', () => {
  expect(dayTrialsAvailable(6, 0)).toBe(0);
  expect(dayTrialsAvailable(14, 0)).toBe(2);
  expect(dayTrialsAvailable(14, 2)).toBe(0);
});
it('같은 묶음을 다시 체험할 수 있다 — 지금 체험 중이거나 산 묶음만 빼고 (B)', () => {
  const ended = [{ packId: 'animals' as const, source: 'days' as const, grantedAt: 0, expiresAt: now - 1 }];
  expect(canStartDayTrial('animals', ended, 14, 1, now)).toBe(true);
  expect(canStartDayTrial('basic', [], 14, 0, now)).toBe(false);
});
it('잠긴 묶음의 스티커는 새로 쓸 수 없다', () => {
  expect(canUseSticker('basic.sprout', [], now)).toBe(true);
  expect(canUseSticker('animals.cat' as ColorStickerId, [], now)).toBe(false);
});
```

- [ ] **Step 2: 실패 확인** — `npx jest __tests__/packs.test.ts`
- [ ] **Step 3: 구현** — 같은 묶음에 줄이 여럿이면(광고 뒤 붙인 날 체험) 산 것 > 끝나지 않은 체험 중 가장 늦게 끝나는 것 > 가장 최근에 끝난 것 순으로 본다. `free`는 `colorStickerPacks`의 `free`로.
- [ ] **Step 4: 통과 확인** — `npx jest __tests__/packs.test.ts`
- [ ] **Step 5: 커밋** — `feat(packs): pack access, trial and placed-day rules`

### Task 4: 묶음 저장소

**Files:**
- Create: `src/repositories/packRepository.ts`
- Modify: `src/repositories/appSettingsRepository.ts` (`SettingKey`에 `'dayTrialsClaimed'`, `'adFree'`)
- Test: `__tests__/packRepository.test.ts` (nodeDriver)

**Interfaces:**
- Produces:

```ts
export async function listPackAccess(): Promise<PackAccess[]>;
export async function grantPurchase(packId: ColorStickerPackId, now: number): Promise<void>;       // 기존 줄을 영구로 덮는다
export async function startAdTrial(packId: ColorStickerPackId, now: number): Promise<number>;     // 끝나는 시각
export async function startDayTrial(packId: ColorStickerPackId, now: number): Promise<number>;    // 받은 수 +1, 한 트랜잭션. 조건이 안 맞으면 throw
export async function loadPackState(now: number): Promise<{ access: PackAccess[]; days: number; claimed: number; adFree: boolean }>;
export async function setAdFree(on: boolean): Promise<void>;
```

- [ ] **Step 1: 실패하는 테스트** — 사기 뒤 owned; 광고 하루 뒤 끝 시각 = 지금 + 24시간; 붙인 날 7일이 안 되면 `startDayTrial`이 거절하고 받은 수가 그대로; 7일이면 3일 체험 + 받은 수 1; 산 묶음에 체험을 시작하면 거절.
- [ ] **Step 2~4: 실패 확인 → 구현 → 통과** (`npx jest __tests__/packRepository.test.ts`). 붙인 날은 `SELECT COUNT(*) FROM placed_days`(Task 2).
- [ ] **Step 5: 커밋** — `feat(packs): pack access repository`

### Task 5: 결제·광고 인터페이스와 개발용 대역 (A)

**Files:**
- Create: `src/purchases/index.ts`, `src/purchases/devStore.ts`
- Test: `__tests__/purchases.test.ts`

**Interfaces:**
- Produces:

```ts
export type BuyResult = { ok: true } | { ok: false; reason: 'cancelled' | 'failed' };
export type AdResult = { ok: true } | { ok: false; reason: 'closed' | 'unavailable' };
export interface Store {
  buyPack(packId: ColorStickerPackId): Promise<BuyResult>;
  buyAdFree(): Promise<BuyResult>;
  /** 산 묶음 id와 광고 제거 여부 */
  restore(): Promise<{ packs: ColorStickerPackId[]; adFree: boolean }>;
  showRewardedAd(): Promise<AdResult>;
}
export function store(): Store;                    // 지금은 devStore. 다음 계획에서 RevenueCat·AdMob으로
export function setStoreForTest(s: Store | null): void;
export async function buyPack(packId: ColorStickerPackId, now: number): Promise<BuyResult>;   // 성공하면 grantPurchase
export async function watchAdForPack(packId: ColorStickerPackId, now: number): Promise<{ ok: true; endsAt: number } | Extract<AdResult, { ok: false }>>; // 끝까지 봤을 때만 startAdTrial
export async function buyAdFree(): Promise<BuyResult>;                                        // 성공하면 setAdFree(true)
export async function restorePurchases(now: number): Promise<string[]>;                       // 되살린 이름 목록(묶음 라벨 + '광고 제거')
```

- devStore: 결제·광고 모두 바로 `{ ok: true }`. 복원은 이 기기 `pack_access`의 `purchase` 줄과 `adFree`를 그대로 돌려준다. 화면 문구는 실제와 같게 두고, `__DEV__`에서만 콘솔에 「개발용 결제」를 남긴다.
- [ ] **Step 1~5:** 테스트 — 광고를 닫으면 체험이 시작되지 않는다, 결제 취소면 권한이 생기지 않는다, 복원 이름 순서는 `colorStickerPacks` 순서 + 마지막에 「광고 제거」 → 구현 → 커밋 `feat(purchases): store interface with a dev stand-in`

### Task 6: 「기본 스티커」·묶음 화면 라우트

**Files:**
- Create: `src/app-data/stickerChoice.ts`, `src/app-data/packViews.ts`, `app/stickers/choose.tsx`, `app/stickers/pack/[packId].tsx`
- Modify: `app/goal/new.tsx`, `app/goal/[id]/settings.tsx`
- Test: `__tests__/stickerChoice.test.ts`, `__tests__/packViews.test.ts`

**Interfaces:**
- Consumes: Task 3 `packStatus`·`dayTrialThreshold`, Task 4 `loadPackState`·`startDayTrial`, Task 5 `buyPack`·`watchAdForPack`, 디자인 시스템 `StickerChooserScreen`·`PackScreen`·`stickerShopDialogs`
- Produces:

```ts
// src/app-data/stickerChoice.ts — 화면 사이 넘기기. 한 번 읽으면 비운다.
export function offerSticker(id: ColorStickerId): void;
export function takeOfferedSticker(): ColorStickerId | null;
// src/app-data/packViews.ts
export function packViews(access: readonly PackAccess[], now: number): PackView[];   // colorStickerPacks 순서
export function samplePlacement(pack: PackView): StickerId[];                         // 서로 다른 5개
export function endLabel(endsAt: number, now: number): string;                        // 예: '내일 밤 11:00'
```

- 라우트: `router.push({ pathname: '/stickers/choose', params: { current } })`. [선택 완료] → `offerSticker(selected)` → `router.back()`. 부른 화면은 `useFocusEffect`에서 `takeOfferedSticker()`가 있으면 `setSticker`.
- 「기본 스티커」: 처음 펼친 묶음 = 지금 고른 스티커의 묶음. 잠긴 카드 → `/stickers/pack/[packId]`. 붙인 날 안내는 `{ days, goal: dayTrialThreshold(claimed) }`. 포커스 때마다 `loadPackState`를 다시 읽는다(묶음 화면에서 열고 돌아왔을 때).
- 묶음 화면: [2,200원에 열기] → `buyPack` → `bought` 확인 창 → 「기본 스티커」로 돌아가 그 묶음을 펼친다(`openPack` 넘기기는 `stickerChoice`에 `offerOpenPack(packId)` 하나 더). [광고 보고 하루] → `watchAdForPack` → `adTrialStarted(endLabel(...))`. [3일 무료로 써 보기] → `startDayTrial` → 「기본 스티커」로. 광고 제거면 광고 버튼 없음.
- `endLabel`: 오늘/내일 + 때 + `h:mm`(12시간제). 시안에는 「내일 밤 11:00」 하나뿐이라 때는 0~6시 「새벽」, 6~12시 「아침」, 12~18시 「낮」, 18~24시 「밤」으로 정하고 ledger에 Ruling으로 남긴다.
- [ ] **Step 1~5:** `packViews`·`samplePlacement`·`endLabel`·`stickerChoice` 테스트 먼저 → 구현 → 라우트 연결 → `npm test && npm run test:components && npm run typecheck && npx expo export --platform ios` → 커밋 `feat(stickers): sticker chooser and pack screens in the app`

### Task 7: 붙일 때 묶음 확인과 「체험이 끝났어요」

**Files:**
- Create: `src/app-data/placeGate.ts`
- Modify: `app/goal/[id]/index.tsx`
- Test: `__tests__/placeGate.test.ts`

**Interfaces:**
- Produces: `placeGate(goal: Goal, access: readonly PackAccess[], now: number): { ok: true } | { ok: false; kind: '3일' | '하루'; packId: ColorStickerPackId }`

- 판 화면 `place()` 맨 앞에서 `placeGate`. 막히면 `stickerShopDialogs.trialEnded(kind)`: [묶음 열기] → `/stickers/pack/[packId]`, [다른 스티커] → 「기본 스티커」 — 고르면 `updateGoal(goalId, { defaultStickerId })`로 바로 저장하고 판으로 돌아온다(목표 설정을 거치지 않는다).
- 위젯 링크(`?place=1`)로 열려 붙일 때도 같은 `place()`를 거치므로 따로 할 일이 없다.
- [ ] **Step 1~5:** 테스트(기본 묶음·산 묶음·체험 중은 ok, 끝난 광고 체험은 `하루`, 체험 기록 없이 잠긴 묶음은 `3일`) → 구현 → 커밋 `feat(stickers): stop placing a sticker whose trial ended`

### Task 8: 위젯 — 컬러 스티커 그림 전부와 잠긴 목표

**Files:**
- Modify: `scripts/build-widget-art.mjs`, `assets/widget-art/`(컬러 스티커 전부 PNG), `src/widgets/widgetArt.ios.ts`, `src/widgets/widgetProps.ts`, `src/widgets/snapshot.ts`, `src/widgets/applyRequests.ts`, `widgets/ios/ChagokGoal.tsx`·`ChagokTally.tsx`·`ChagokMonth.tsx`
- Test: `__tests__/widgetSnapshot.test.ts`, `__tests__/applyWidgetRequests.test.ts`, `__tests__/widgetViews.test.ts`

- 그림: 스크립트가 `colorStickers` 전부를 `color-<묶음>-<이름>.png`로 만든다. `widgetArt`의 `stickers` 키는 컬러 ID. 앱 번들 크기 증가분을 커밋 메시지에 적는다.
- 스냅샷: 목표마다 `locked: boolean`(`placeGate`가 막는가). 위젯은 `locked`이면 버튼 대신 `chagok://goal/<id>?place=1` 링크 — 앱이 열리고 Task 7 안내가 뜬다(RELEASE-DECISIONS 2026-10-08 「위젯에서는 붙이지 않고 앱을 열어 같은 안내」).
- `applyRequests`: 쌓인 요청을 반영할 때 `placeGate`가 막으면 붙이지 않고 처리한 것으로 기록한다.
- [ ] **Step 1~5:** 테스트 먼저(스냅샷 `locked`, 막힌 요청은 붙지 않음, 위젯 뷰가 링크로 바뀜) → 구현 → `node scripts/build-widget-art.mjs` → 커밋 `feat(widgets): color art for every sticker and an app link for ended trials`

### Task 9: 앱 설정 「구매」 블럭

**Files:**
- Modify: `app/settings.tsx`

- 계정 블럭 아래에 `PurchasePanel`. [5,500원에 광고 없애기] → `buyAdFree`. [구매 복원] → `restorePurchases` → 이름이 있으면 `restoreDone(names)`, 없으면 `restoreNone`.
- [ ] **Step 1~5:** 구현 → `npm run typecheck && npx expo export --platform ios` → 커밋 `feat(settings): purchase block`

### Task 10: 흐름도·문서

**Files:**
- Modify: `stories/flows/app-flow.json`(「기본 스티커」·묶음 화면 노드와 새 목표·목표 설정·판 화면·앱 설정에서 가는 길), `docs/HANDOFF.md` 0절 2번, `docs/PRD.md` 4.12·확정 이력(B·C·D·E)

- [ ] `stories/flows/README.md`의 확인 명령 실행 → 커밋 `docs: sticker shop wired into the app`

## 시뮬레이터 확인 (사용자)

- 새 목표 [바꾸기] → 「기본 스티커」 → 잠긴 묶음 → [2,200원에 열기](대역) → 돌아와 펼쳐짐 → 고르고 [선택 완료] → 새 목표에 반영.
- 광고 하루 체험 → 시뮬레이터 시계를 25시간 넘겨 판에서 붙이기 → 「하루 체험이 끝났어요」.
- 위젯: 체험이 끝난 목표를 위젯에서 누르면 앱이 열리고 같은 안내.

## 다음 계획 (이번 범위 밖)

- RevenueCat(`react-native-purchases`) · AdMob(`react-native-google-mobile-ads`, Expo 57 설정 플러그인 문제 확인) 실제 연결 — App Store Connect 상품 등록·AdMob 계정이 먼저.
- 홈 배너(`GoalListScreen` `footer`).
- 서버 `entitlements` 표.
