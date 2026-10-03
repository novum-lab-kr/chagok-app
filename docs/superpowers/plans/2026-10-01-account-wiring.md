# 계정·백업 화면 앱 연결 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Storybook에 확정한 계정 화면(시작·동의·앱 설정 계정 칸·복원 충돌·복원 진행/실패·로그아웃·계정 삭제·로그인 풀림 안내)을 앱에 연결해, 개발용 이메일 로그인으로 Expo Go에서 처음부터 끝까지 돈다. 계정(Apple·Google)이 생기면 로그인 버튼 자리만 바꾼다.

**Architecture:** 판단은 화면 밖의 순수 함수·저장소 함수로 뺀다(연결 분기, 계정 상태, 기기 비우기, 복원 요약). 화면은 그 결과를 디자인 시스템 컴포넌트에 넘기고 다이얼로그 단계만 관리한다. 연결·로그아웃·삭제 동안 자동 전송이 끼어들지 않게 전송 잠금(`syncGate`)을 둔다.

**Tech Stack:** Expo Router, `@supabase/supabase-js`(개발용 `signInWithPassword`), expo-sqlite, expo-file-system, jest + ts-jest(도메인·저장소), vitest(컴포넌트).

**Spec:** [계정·백업 설계](../specs/2026-09-30-account-backup-design.md) ①·②·④, 「서버 단계 뒤에 남은 것」 / [약관 설계](../specs/2026-09-30-policy-terms-design.md) 「동의 화면」

## 이번에 정한 것 (2026-10-01 사용자)

| 항목 | 결정 |
| --- | --- |
| 로그인 자리 | 실제 동의 화면 + `__DEV__`에서만 보이는 [개발 계정으로 계속]. 동의 기록(`record_consent`)도 남긴다. 계정이 생기면 그 자리에 Apple·Google 버튼만 끼운다 |
| 시작 화면 | 이번에 같이 연결한다. 첫 실행, 로그아웃·계정 삭제 뒤에 나온다 |
| 다시 로그인할 때 동의 | 같은 동의 화면을 쓰되, 이 기기에서 연결한 적 있으면 두 체크가 켜진 채로 연다 |
| "백업하지 못한 기록이 있어요" | 마지막 전송이 실패했거나 서버가 거부한 기록(보류)이 남았을 때만. 마지막 백업 시각은 보류 없이 성공했을 때만 바꾼다 |

## Global Constraints

- Expo 57. API는 https://docs.expo.dev/versions/v57.0.0/ 에서 확인한다. 추측하지 않는다.
- 의존성을 추가하지 않는다(필요하면 멈추고 묻는다).
- `src/design-system/`의 토큰·프레임·팔레트 값을 바꾸지 않는다. 컴포넌트에는 선택(optional) prop이나 타입 추가만 한다.
- 문구는 사용자 쪽에서 쓴다("로그인이 필요해요"). 다이얼로그 문구는 `accountDialogs`를 그대로 쓴다.
- OS `Alert`를 쓰지 않는다. 확인·알림은 `useDialog` 또는 `PixelDialogModal`·`PixelBusyModal`.
- 만 14세 미만이라는 사실은 저장하지 않는다.
- 기록 저장과 outbox는 같은 트랜잭션(기존). outbox는 서버 성공 뒤에만 지운다(기존). 기기를 지우는 것은 **서버 쪽 일이 성공한 뒤**(로그아웃: 전송 성공 또는 보류 경고 동의, 삭제: `delete-account` 성공).
- 브랜치 `feat/account-wiring`. 커밋은 계획 승인 뒤, 태스크마다.
- 화면 코드를 고친 태스크는 `npx expo export --platform ios`까지 돌린다(출력 폴더는 scratchpad, 확인 뒤 삭제).

## Review Focus

1. **연결 중 자동 전송이 끼어듦** — 로그인 직후 `connectSync`가 바로 outbox를 보내면, 복원 충돌을 고르기 전에 기기 기록이 서버에 섞인다. 연결 흐름 동안 전송이 멈춰 있어야 한다 → Task 3 테스트.
2. **세션이 없는 상태로 앱 시작** — 지금 `connectSync`는 세션이 없으면 `accountUserId`를 비워 "로그인이 필요해요"를 띄울 근거가 사라진다. 비우지 않아야 한다 → Task 3 테스트.
3. **로그아웃 뒤 다시 켰을 때** — 기기 설정(`tutorialDone` 등)이 남으면 시작 화면이 안 나온다. `deviceId`만 남기고 지워야 한다 → Task 5 테스트.
4. **복원 충돌에서 뒤로 가기·복원 실패에서 [나중에]** — 반쯤 연결된 상태로 남으면 안 된다. 로그아웃하고 이전 계정 표시로 되돌린다 → Task 10 수동 확인 5번.
5. **로그인이 풀린 상태의 로그아웃** — 보낼 수 없으니 전송을 시도하지 않고 남은 기록 수로 경고한다 → Task 2 `localOnlyCount` 테스트, Task 10 수동 확인 7번.

---

## 파일 구조

| 파일 | 할 일 |
| --- | --- |
| `src/sync/syncGate.ts` (새) | 전송 잠금(pause/resume)과 상태 변경 알림 |
| `src/sync/accountStatus.ts` (새) | 전송 결과 기록, 앱 설정 칸 상태 계산, "오늘 9:20" 표기 |
| `src/sync/connectAccount.ts` (새) | 로그인 뒤 분기 판단(순수 함수) |
| `src/sync/restore.ts` | `pullAll`·`applyRestore`로 나누고 요약 함수 추가 |
| `src/sync/wipe.ts` (새) | 기기 기록·설정 비우기 |
| `src/sync/connect.ts` | 잠금 확인, 세션 없음에 `accountUserId` 유지 |
| `src/policy/manifest.ts` (새) | `versions.json` 받기, 지금 시행 중인 판 번호 |
| `src/repositories/appSettingsRepository.ts` | 키 추가 |
| `src/app-data/recordPhotos.ts` | 사진 폴더 통째 지우기 |
| `src/design-system/account-screens.tsx` | `AccountProvider`에 `'개발'` 추가 |
| `app/_layout.tsx` | 잠금·결과 기록 연결, 새 라우트 등록 |
| `app/index.tsx` | 시작 화면, 로그인 풀림 안내 한 번 |
| `app/settings.tsx` | 계정 칸, 로그아웃 다이얼로그 |
| `app/account/connect.tsx` (새) | 동의 → 로그인 → 분기 → 복원/충돌 |
| `app/account/delete.tsx` (새) | 계정 삭제 3단계 |
| `docs/HANDOFF.md`, 계정·백업 설계 | 현황·결정 기록 |

---

### Task 1: 앱 설정 키, 전송 잠금

**Files:**
- Modify: `src/repositories/appSettingsRepository.ts`
- Create: `src/sync/syncGate.ts`
- Test: `__tests__/syncGate.test.ts`

**Interfaces:**
- Produces: `AppFlag = 'tutorialDone' | 'startDone'`; `SettingKey`에 `'accountProvider' | 'syncProblem' | 'firstBackup' | 'sessionPrompted'` 추가.
  `pauseSync(): void`, `resumeSync(): void`, `isSyncPaused(): boolean`, `subscribeSyncStatus(fn: () => void): () => void`, `notifySyncStatus(): void`.

- [ ] **Step 1: 실패하는 테스트**

```ts
// __tests__/syncGate.test.ts
import { isSyncPaused, notifySyncStatus, pauseSync, resumeSync, subscribeSyncStatus } from '../src/sync/syncGate';

describe('syncGate', () => {
  afterEach(() => resumeSync());
  it('멈추면 멈춘 상태를 알려 주고, 다시 열면 상태 구독자에게 알린다', () => {
    const seen: number[] = [];
    const off = subscribeSyncStatus(() => seen.push(1));
    pauseSync();
    expect(isSyncPaused()).toBe(true);
    resumeSync();
    expect(isSyncPaused()).toBe(false);
    expect(seen).toHaveLength(1);
    off();
    notifySyncStatus();
    expect(seen).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 실패 확인** — `npx jest __tests__/syncGate.test.ts` → 모듈 없음으로 FAIL.

- [ ] **Step 3: 구현**

```ts
// src/sync/syncGate.ts
/**
 * 연결·로그아웃·계정 삭제 동안 자동 전송을 멈춘다 (계정·백업 설계 「서버 단계 뒤에 남은 것」).
 * 로그인 직후 바로 보내면 복원 충돌을 고르기 전에 기기 기록이 서버에 섞인다.
 * 앱 설정의 계정 칸은 subscribeSyncStatus로 전송 결과·연결 변화를 받아 다시 읽는다.
 */
let paused = false;
const listeners = new Set<() => void>();

export function pauseSync(): void { paused = true; }
export function resumeSync(): void { paused = false; notifySyncStatus(); }
export function isSyncPaused(): boolean { return paused; }
export function subscribeSyncStatus(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
export function notifySyncStatus(): void { for (const fn of [...listeners]) fn(); }
```

`appSettingsRepository.ts`:

```ts
export type AppFlag = 'tutorialDone' | 'startDone';
/** 문자열 값. 계정·동기화 상태를 담는다 (계정·백업 설계 ②). 동기화하지 않는다. */
export type SettingKey =
  | 'deviceId' | 'accountUserId' | 'lastSyncedAt' | 'syncCursor' | 'pendingPhotoDownloads'
  /** 'Apple' | 'Google' | '개발' — 앱 설정 계정 칸 문구 */
  | 'accountProvider'
  /** '1'이면 마지막 전송이 실패했거나 보류가 남았다 */
  | 'syncProblem'
  /** '1'이면 첫 백업을 올리는 중 */
  | 'firstBackup'
  /** 로그인 풀림 안내를 한 번 보여준 계정 id */
  | 'sessionPrompted';
```

- [ ] **Step 4: 통과 확인** — `npx jest __tests__/syncGate.test.ts __tests__/appSettings.test.ts` → PASS. `npm run typecheck` 통과.

- [ ] **Step 5: 커밋** — `git add src/sync/syncGate.ts src/repositories/appSettingsRepository.ts __tests__/syncGate.test.ts && git commit -m "feat(sync): pause gate and account setting keys"`

---

### Task 2: 계정 상태 계산과 전송 결과 기록

**Files:**
- Create: `src/sync/accountStatus.ts`
- Modify: `src/design-system/account-screens.tsx` (`AccountProvider` 타입만)
- Test: `__tests__/accountStatus.test.ts`

**Interfaces:**
- Consumes: Task 1 키, `pendingCount()` (`src/sync/outbox.ts`), `notifySyncStatus`.
- Produces:
  - `type AccountState = { state: 'local' } | { state: 'synced'; provider: AccountProvider; lastSyncedAt: number | null } | { state: 'pending' | 'firstBackup' | 'needsLogin'; provider: AccountProvider }`
  - `readAccountState(sessionUserId: string | null): Promise<AccountState>`
  - `recordSyncSuccess(now?: number): Promise<void>`, `recordSyncFailure(): Promise<void>`
  - `providerFromAuth(provider: string | undefined): AccountProvider`
  - `formatBackedUpAt(ms: number, now: Date): string`
  - `localOnlyCount(): Promise<number>` — 아직 서버에 없는 기록 수(보낼 것 + 보류)

- [ ] **Step 1: 실패하는 테스트**

```ts
// __tests__/accountStatus.test.ts
import { createGoal } from '../src/repositories/goalRepository';
import { getSetting, setSetting } from '../src/repositories/appSettingsRepository';
import { hold, takeBatch } from '../src/sync/outbox';
import { formatBackedUpAt, localOnlyCount, providerFromAuth, readAccountState, recordSyncFailure, recordSyncSuccess } from '../src/sync/accountStatus';
import { withFreshDb } from './support/setup';

withFreshDb();

describe('계정 상태', () => {
  it('연결한 적 없으면 local', async () => {
    expect(await readAccountState(null)).toEqual({ state: 'local' });
  });
  it('연결한 계정과 세션이 다르면(없으면) 로그인이 필요하다', async () => {
    await setSetting('accountUserId', 'u1'); await setSetting('accountProvider', 'Google');
    expect(await readAccountState(null)).toEqual({ state: 'needsLogin', provider: 'Google' });
  });
  it('첫 백업 중 → 실패 표시 → 성공 순서로 바뀐다', async () => {
    await setSetting('accountUserId', 'u1'); await setSetting('accountProvider', '개발');
    await setSetting('firstBackup', '1');
    expect((await readAccountState('u1')).state).toBe('firstBackup');
    await recordSyncFailure();
    expect((await readAccountState('u1')).state).toBe('firstBackup'); // 첫 백업이 끝나기 전에는 그대로
    await recordSyncSuccess(1000);
    expect(await readAccountState('u1')).toEqual({ state: 'synced', provider: '개발', lastSyncedAt: 1000 });
    await recordSyncFailure();
    expect((await readAccountState('u1')).state).toBe('pending');
  });
  it('보류가 남으면 성공해도 pending이고 마지막 백업 시각은 그대로다', async () => {
    await setSetting('accountUserId', 'u1'); await setSetting('accountProvider', 'Apple');
    await setSetting('lastSyncedAt', '500');
    await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const [e] = await takeBatch(1);
    await hold(e, '거부');
    await recordSyncSuccess(1000);
    expect((await readAccountState('u1')).state).toBe('pending');
    expect(await getSetting('lastSyncedAt')).toBe('500');
    expect(await localOnlyCount()).toBe(1);
  });
  it('로그인 방식 표시', () => {
    expect(providerFromAuth('apple')).toBe('Apple');
    expect(providerFromAuth('google')).toBe('Google');
    expect(providerFromAuth('email')).toBe('개발');
  });
  it('백업 시각 표기', () => {
    const now = new Date(2026, 9, 1, 15, 0);
    expect(formatBackedUpAt(new Date(2026, 9, 1, 9, 5).getTime(), now)).toBe('오늘 9:05');
    expect(formatBackedUpAt(new Date(2026, 8, 30, 21, 40).getTime(), now)).toBe('어제 21:40');
    expect(formatBackedUpAt(new Date(2026, 8, 27, 8, 0).getTime(), now)).toBe('9월 27일');
  });
});
```

- [ ] **Step 2: 실패 확인** — `npx jest __tests__/accountStatus.test.ts` → FAIL(모듈 없음).

- [ ] **Step 3: 구현**

`account-screens.tsx`: `export type AccountProvider='Apple'|'Google'|'개발';` (주석: `'개발'`은 계정 준비 전 개발용 이메일 로그인, 2026-10-01)

```ts
// src/sync/accountStatus.ts
import type { AccountProvider } from '../design-system/account-screens';
import { getSetting, setSetting } from '../repositories/appSettingsRepository';
import { pendingCount } from './outbox';
import { notifySyncStatus } from './syncGate';

export type AccountState =
  | { state: 'local' }
  | { state: 'synced'; provider: AccountProvider; lastSyncedAt: number | null }
  | { state: 'pending' | 'firstBackup' | 'needsLogin'; provider: AccountProvider };

export function providerFromAuth(provider: string | undefined): AccountProvider {
  if (provider === 'apple') return 'Apple';
  if (provider === 'google') return 'Google';
  return '개발';
}

/** 앱 설정 계정 칸 (시안 2C). 복원 중 표시는 연결 화면이 다이얼로그로 덮으므로 여기서 다루지 않는다. */
export async function readAccountState(sessionUserId: string | null): Promise<AccountState> {
  const userId = await getSetting('accountUserId');
  if (!userId) return { state: 'local' };
  const provider = ((await getSetting('accountProvider')) ?? '개발') as AccountProvider;
  if (sessionUserId !== userId) return { state: 'needsLogin', provider };
  if (await getSetting('firstBackup')) return { state: 'firstBackup', provider };
  if (await getSetting('syncProblem')) return { state: 'pending', provider };
  const last = await getSetting('lastSyncedAt');
  return { state: 'synced', provider, lastSyncedAt: last ? Number(last) : null };
}

/** 전송이 끝났다. 보류가 남으면 "백업하지 못한 기록"으로 두고 마지막 백업 시각은 바꾸지 않는다 (2026-10-01). */
export async function recordSyncSuccess(now = Date.now()): Promise<void> {
  const { held } = await pendingCount();
  await setSetting('firstBackup', null);
  if (held > 0) {
    await setSetting('syncProblem', '1');
  } else {
    await setSetting('syncProblem', null);
    await setSetting('lastSyncedAt', String(now));
  }
  notifySyncStatus();
}

/** 전송이 실패했다(네트워크 등). 첫 백업 중이면 첫 백업 표시를 그대로 둔다. */
export async function recordSyncFailure(): Promise<void> {
  await setSetting('syncProblem', '1');
  notifySyncStatus();
}

/** 아직 서버에 없는 기록 수. 로그인이 풀린 채 로그아웃할 때 경고에 쓴다. */
export async function localOnlyCount(): Promise<number> {
  const { pending, held } = await pendingCount();
  return pending + held;
}

const hm = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
/** 앱 설정 "오늘 9:20에 모두 백업했어요"의 앞부분. */
export function formatBackedUpAt(ms: number, now: Date): string {
  const d = new Date(ms);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86_400_000);
  if (diff === 0) return `오늘 ${hm(d)}`;
  if (diff === 1) return `어제 ${hm(d)}`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
```

- [ ] **Step 4: 통과 확인** — `npx jest __tests__/accountStatus.test.ts` PASS, `npm run test:components` PASS(타입 추가만), `npm run typecheck`.

- [ ] **Step 5: 커밋** — `feat(sync): account state for the settings panel`

---

### Task 3: 자동 전송이 잠금을 지키고, 세션이 없을 때 연결 기록을 지우지 않기

**Files:**
- Modify: `src/sync/connect.ts`
- Test: `__tests__/connect.test.ts`

**Interfaces:**
- Consumes: `isSyncPaused` (Task 1)
- Produces: `ConnectDeps.isPaused?: () => boolean`; `rememberUser: (userId: string) => Promise<void>`는 **로그인한 사용자 id가 있을 때만** 불린다.

- [ ] **Step 1: 실패하는 테스트** — `harness`에 `paused` 상태와 `remembered` 배열을 더하고 두 테스트를 추가한다.

```ts
function harness(paused = { value: false }) {
  let authFn: (userId: string | null) => void = () => {};
  let appFn: (active: boolean) => void = () => {};
  let localFn: () => void = () => {};
  const runs: string[] = [];
  const remembered: string[] = [];
  const stop = connectSync({
    onAuthChange: (fn) => { authFn = fn; return () => { authFn = () => {}; }; },
    onAppActive: (fn) => { appFn = fn; return () => { appFn = () => {}; }; },
    onLocalChange: (fn) => { localFn = fn; return () => { localFn = () => {}; }; },
    makeRun: (userId) => async () => { runs.push(userId); },
    rememberUser: async (u) => { remembered.push(u); },
    isPaused: () => paused.value,
    debounceMs: 0,
  });
  return { stop, runs, remembered, signIn: (u: string | null) => authFn(u), active: () => appFn(true), local: () => localFn() };
}

it('잠겨 있으면 로그인해도 보내지 않고, 풀린 뒤 기록이 바뀌면 보낸다', async () => {
  const paused = { value: true };
  const h = harness(paused);
  h.signIn('u1'); h.local(); await flush();
  expect(h.runs).toEqual([]);
  paused.value = false;
  h.local(); await flush();
  expect(h.runs).toEqual(['u1']);
  h.stop();
});

it('세션이 없으면 연결한 계정 기록을 지우지 않는다 (로그인 풀림을 알아야 한다)', async () => {
  const h = harness();
  h.signIn(null); h.signIn('u1'); h.signIn(null); await flush();
  expect(h.remembered).toEqual(['u1']);
  h.stop();
});
```

- [ ] **Step 2: 실패 확인** — `npx jest __tests__/connect.test.ts` → 두 테스트 FAIL.

- [ ] **Step 3: 구현** — `connect.ts`:

```ts
export type ConnectDeps = {
  // ...기존 그대로...
  rememberUser(userId: string): Promise<void>;
  /** 참이면 이번 회차를 건너뛴다(연결·로그아웃·삭제 중). 풀리면 다음 기록·앞으로 오기에 보낸다. */
  isPaused?: () => boolean;
};

// connectSync 안
    current = userId;
    if (!userId) return;            // 세션이 없어도 accountUserId는 남긴다 — 로그인 풀림 판단 근거 (2026-10-01)
    void deps.rememberUser(userId);
    const run = deps.makeRun(userId);
    scheduler = createSyncScheduler(async () => { if (!deps.isPaused?.()) await run(); }, { debounceMs: deps.debounceMs });
    scheduler.foreground();
```

- [ ] **Step 4: 통과 확인** — `npx jest __tests__/connect.test.ts` PASS(기존 세 테스트 포함).

- [ ] **Step 5: 커밋** — `fix(sync): respect the pause gate and keep the account id without a session`

---

### Task 4: 복원을 받기·적용으로 나누고 요약 만들기

**Files:**
- Modify: `src/sync/restore.ts`
- Test: `__tests__/restore.test.ts`

**Interfaces:**
- Produces:
  - `type ServerSnapshot = { goals: GoalRow[]; stickers: StickerRow[]; records: RecordRow[]; cursor: number }`
  - `pullAll(server: SyncServer, pageSize?: number): Promise<ServerSnapshot>`
  - `applyRestore(snapshot: ServerSnapshot): Promise<{ photos: PhotoToFetch[]; oldPhotoUris: string[] }>` — 바꾸기 전 기기 사진 경로를 돌려준다(호출자가 지운다)
  - `restoreAll(server, pageSize?)`는 `applyRestore(await pullAll(...))`로 남긴다(기존 테스트·개발 화면 유지). 반환은 `{ photos }` 그대로.
  - `type RecordSummary = { goals: number; stickers: number; goalNames: string[]; updatedAt: number | null }`
  - `summarizeSnapshot(s: ServerSnapshot): RecordSummary`, `summarizeDevice(): Promise<RecordSummary>`

- [ ] **Step 1: 실패하는 테스트** (`restore.test.ts`에 추가, `seedServer` 재사용)

```ts
it('받기만 하면 기기를 바꾸지 않고, 요약은 목표 이름·수·최근 수정 시각을 담는다', async () => {
  const { server } = await seedServer();
  const mine = await createGoal({ name: '물 마시기', boardType: 'tally', totalSlots: 5 });
  const snap = await pullAll(server, 2);
  expect((await listGoals()).map((x) => x.id)).toEqual([mine.id]); // 기기 그대로
  const s = summarizeSnapshot(snap);
  expect(s).toMatchObject({ goals: 1, stickers: 1, goalNames: ['산책'] });
  expect(s.updatedAt).toBe(Math.max(...[...snap.goals, ...snap.stickers, ...snap.records].map((r) => r.updated_at)));
  expect(await summarizeDevice()).toMatchObject({ goals: 1, stickers: 0, goalNames: ['물 마시기'] });
  expect(summarizeSnapshot({ goals: [], stickers: [], records: [], cursor: 0 })).toEqual({ goals: 0, stickers: 0, goalNames: [], updatedAt: null });
});

it('적용하면 바꾸기 전 기기 사진 경로를 돌려준다', async () => {
  const { server } = await seedServer();
  const mine = await createGoal({ name: '물 마시기', boardType: 'tally', totalSlots: 5 });
  const st = await placeSticker(mine.id, 0);
  await upsertRecord(st.id, { photoUri: 'record-photo:old.jpg', memo: null });
  const { oldPhotoUris } = await applyRestore(await pullAll(server));
  expect(oldPhotoUris).toEqual(['record-photo:old.jpg']);
});
```

- [ ] **Step 2: 실패 확인** — `npx jest __tests__/restore.test.ts` FAIL.

- [ ] **Step 3: 구현** — 기존 `restoreAll` 본문을 그대로 둘로 자른다.

```ts
export type ServerSnapshot = { goals: GoalRow[]; stickers: StickerRow[]; records: RecordRow[]; cursor: number };
export type RecordSummary = { goals: number; stickers: number; goalNames: string[]; updatedAt: number | null };

/** 서버 백업을 모두 받는다. 기기는 건드리지 않는다 — 복원 충돌에서 고르기 전에 보여줄 요약도 여기서 만든다. */
export async function pullAll(server: SyncServer, pageSize = 500): Promise<ServerSnapshot> {
  // (기존 for 루프와 부모 없는 행 버리기 그대로)
  return { goals: [...goals.values()], stickers: [...stickers.values()], records: [...records.values()], cursor };
}

/** 받은 백업으로 기기를 한 트랜잭션에 바꾼다. 바꾸기 전 기기 사진 경로를 돌려준다 — 호출자가 성공 뒤 지운다. */
export async function applyRestore(snap: ServerSnapshot): Promise<{ photos: PhotoToFetch[]; oldPhotoUris: string[] }> {
  const db = await getDb();
  const oldPhotoUris = (await db.all<{ photo_uri: string }>('SELECT photo_uri FROM records WHERE photo_uri IS NOT NULL')).map((r) => r.photo_uri);
  // (기존 transaction·INSERT 그대로, goals.values() → snap.goals 등)
  await setSetting('syncCursor', String(snap.cursor));
  await setSetting('lastSyncedAt', String(Date.now()));
  const photos = snap.records.filter((r) => r.photo_remote_path).map((r) => ({ recordId: r.id, remotePath: r.photo_remote_path! }));
  return { photos, oldPhotoUris };
}

export async function restoreAll(server: SyncServer, pageSize = 500): Promise<{ photos: PhotoToFetch[] }> {
  const { photos } = await applyRestore(await pullAll(server, pageSize));
  return { photos };
}

const latest = (rows: { updated_at: number }[]) => rows.reduce<number | null>((m, r) => (m === null || r.updated_at > m ? r.updated_at : m), null);
export function summarizeSnapshot(s: ServerSnapshot): RecordSummary {
  return { goals: s.goals.length, stickers: s.stickers.length, goalNames: s.goals.map((g) => g.name), updatedAt: latest([...s.goals, ...s.stickers, ...s.records]) };
}
export async function summarizeDevice(): Promise<RecordSummary> {
  const db = await getDb();
  const goals = await db.all<{ name: string; updated_at: number }>('SELECT name, updated_at FROM goals ORDER BY created_at');
  const stickers = await db.all<{ updated_at: number }>('SELECT updated_at FROM stickers');
  const records = await db.all<{ updated_at: number }>('SELECT updated_at FROM records');
  return { goals: goals.length, stickers: stickers.length, goalNames: goals.map((g) => g.name), updatedAt: latest([...goals, ...stickers, ...records]) };
}
```

- [ ] **Step 4: 통과 확인** — `npx jest __tests__/restore.test.ts` PASS(기존 포함). `npx jest` 전체 PASS.

- [ ] **Step 5: 커밋** — `refactor(sync): split restore into pull and apply, summarize both sides`

---

### Task 5: 기기 비우기, 연결 분기, 약관 판 번호

**Files:**
- Create: `src/sync/wipe.ts`, `src/sync/connectAccount.ts`, `src/policy/manifest.ts`
- Modify: `src/app-data/recordPhotos.ts` (`removeAllManagedPhotos`)
- Test: `__tests__/wipe.test.ts`, `__tests__/connectAccount.test.ts`, `__tests__/policyManifest.test.ts`

**Interfaces:**
- Produces:
  - `wipeDevice(removePhotoFiles: () => void): Promise<void>` — 목표·스티커·기록·outbox와 `deviceId`를 뺀 앱 설정을 한 트랜잭션에 지우고, 성공 뒤 사진 파일을 지운다
  - `type ConnectionPlan = 'same' | 'linkOnly' | 'firstBackup' | 'restore' | 'conflict'`
  - `decideConnection(p: { previousUserId: string | null; userId: string; deviceHasData: boolean; serverHasData: boolean }): ConnectionPlan`
  - `fetchPolicyManifest(fetchFn?: typeof fetch): Promise<PolicyManifest>` (실패하면 던진다)
  - `currentVersions(m: PolicyManifest, today: DateKey): { terms: number; privacy: number }` (시행 중인 판이 없으면 던진다)
  - `removeAllManagedPhotos(): void` (expo-file-system, jest 테스트 없음 — Task 10 수동 확인 4번)

- [ ] **Step 1: 실패하는 테스트**

```ts
// __tests__/wipe.test.ts
import { getDb } from '../src/db/client';
import { createGoal } from '../src/repositories/goalRepository';
import { getDeviceId, getFlag, getSetting, setFlag, setSetting } from '../src/repositories/appSettingsRepository';
import { pendingCount } from '../src/sync/outbox';
import { wipeDevice } from '../src/sync/wipe';
import { withFreshDb } from './support/setup';

withFreshDb();

it('기록·outbox·설정을 지우고 deviceId만 남긴 뒤 사진 파일을 지운다 → 다음 실행은 시작 화면부터', async () => {
  const device = await getDeviceId();
  await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
  await setFlag('tutorialDone', true); await setFlag('startDone', true);
  await setSetting('accountUserId', 'u1');
  let removed = 0;
  await wipeDevice(() => { removed += 1; });
  const db = await getDb();
  expect((await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM goals'))?.n).toBe(0);
  expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  expect(await getSetting('accountUserId')).toBeNull();
  expect(await getFlag('tutorialDone')).toBe(false);
  expect(await getFlag('startDone')).toBe(false);
  expect(await getDeviceId()).toBe(device);
  expect(removed).toBe(1);
});
```

```ts
// __tests__/connectAccount.test.ts
import { decideConnection } from '../src/sync/connectAccount';

const base = { previousUserId: null, userId: 'u1', deviceHasData: false, serverHasData: false };
it.each([
  [{ ...base, previousUserId: 'u1', deviceHasData: true, serverHasData: true }, 'same'],
  [base, 'linkOnly'],
  [{ ...base, deviceHasData: true }, 'firstBackup'],
  [{ ...base, serverHasData: true }, 'restore'],
  [{ ...base, deviceHasData: true, serverHasData: true }, 'conflict'],
  [{ ...base, previousUserId: 'u0', deviceHasData: true, serverHasData: true }, 'conflict'],
])('%o → %s', (input, expected) => {
  expect(decideConnection(input)).toBe(expected);
});
```

```ts
// __tests__/policyManifest.test.ts
import { currentVersions, fetchPolicyManifest } from '../src/policy/manifest';

const v = (version: number, effectiveAt: string) => ({ version, postedAt: effectiveAt, effectiveAt, summary: '', requiresConsent: true });
it('시행 중인 판 번호', () => {
  const m = { terms: [v(1, '2026-09-30'), v(2, '2026-10-15')], privacy: [v(1, '2026-09-30')] };
  expect(currentVersions(m, '2026-10-01')).toEqual({ terms: 1, privacy: 1 });
  expect(currentVersions(m, '2026-10-15')).toEqual({ terms: 2, privacy: 1 });
  expect(() => currentVersions(m, '2026-09-01')).toThrow();
});
it('받기에 실패하면 던진다', async () => {
  const bad = (async () => ({ ok: false, status: 404, json: async () => ({}) })) as unknown as typeof fetch;
  await expect(fetchPolicyManifest(bad)).rejects.toThrow();
});
```

- [ ] **Step 2: 실패 확인** — `npx jest __tests__/wipe.test.ts __tests__/connectAccount.test.ts __tests__/policyManifest.test.ts` FAIL.

- [ ] **Step 3: 구현**

```ts
// src/sync/wipe.ts
import { getDb } from '../db/client';

/**
 * 로그아웃·계정 삭제 뒤 기기를 새로 설치한 것처럼 비운다 (계정·백업 설계 ①). 서버 쪽 일이 성공한 뒤에만 부른다.
 * deviceId만 남긴다 — 시작 화면·튜토리얼 표시도 처음으로 돌아간다.
 * DB를 먼저 비우고 사진 파일은 그 뒤에 지운다: DB가 실패하면 사진이 남아 기록이 깨지지 않는다.
 */
export async function wipeDevice(removePhotoFiles: () => void): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.exec("DELETE FROM records; DELETE FROM stickers; DELETE FROM goals; DELETE FROM outbox; DELETE FROM app_settings WHERE key <> 'deviceId';");
  });
  removePhotoFiles();
}
```

```ts
// src/sync/connectAccount.ts
export type ConnectionPlan = 'same' | 'linkOnly' | 'firstBackup' | 'restore' | 'conflict';

/**
 * 로그인 직후 무엇을 할지 (계정·백업 설계 ① 연결 분기표).
 * 같은 계정으로 다시 로그인했으면 outbox를 이어 보낸다. 다른 계정이면 새 연결로 본다.
 */
export function decideConnection(p: { previousUserId: string | null; userId: string; deviceHasData: boolean; serverHasData: boolean }): ConnectionPlan {
  if (p.previousUserId === p.userId) return 'same';
  if (p.deviceHasData && p.serverHasData) return 'conflict';
  if (p.serverHasData) return 'restore';
  if (p.deviceHasData) return 'firstBackup';
  return 'linkOnly';
}
```

```ts
// src/policy/manifest.ts
import type { DateKey } from '../domain/dates';
import { POLICY_MANIFEST_URL } from './urls';
import { effectiveVersion, type PolicyManifest } from './versions';

/** 동의 기록에 남길 판을 정하려고 받는다. 실패하면 던진다 — 어느 판에 동의했는지 모른 채 연결하지 않는다. */
export async function fetchPolicyManifest(fetchFn: typeof fetch = fetch): Promise<PolicyManifest> {
  const res = await fetchFn(POLICY_MANIFEST_URL, { cache: 'no-store' } as RequestInit);
  if (!res.ok) throw new Error(`versions.json ${res.status}`);
  return (await res.json()) as PolicyManifest;
}

export function currentVersions(m: PolicyManifest, today: DateKey): { terms: number; privacy: number } {
  const terms = effectiveVersion(m.terms, today);
  const privacy = effectiveVersion(m.privacy, today);
  if (!terms || !privacy) throw new Error('시행 중인 약관이 없어요');
  return { terms: terms.version, privacy: privacy.version };
}
```

`recordPhotos.ts`:

```ts
/** 앱 사진 폴더를 통째로 지운다. 로그아웃·계정 삭제 뒤(wipeDevice)에만 쓴다. */
export function removeAllManagedPhotos(): void {
  if (folder.exists) folder.delete();
}
```

- [ ] **Step 4: 통과 확인** — 세 테스트 PASS, `npx jest` 전체, `npm run typecheck`.

- [ ] **Step 5: 커밋** — `feat(sync): wipe the device, decide the connection branch, read policy versions`

---

### Task 6: 자동 전송에 잠금·결과 기록 연결 (`_layout`)

**Files:**
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: `isSyncPaused`, `recordSyncSuccess`, `recordSyncFailure`.

- [ ] **Step 1: 구현** — `connectSync` 호출부:

```tsx
      makeRun: (userId) => async () => {
        try {
          await pushOnce(await syncDepsFor(supabase, userId));
        } catch (error) {
          await recordSyncFailure();
          throw error; // 스케줄러가 다시 시도한다
        }
        await recordSyncSuccess();
      },
      rememberUser: (userId) => setSetting('accountUserId', userId),
      isPaused: isSyncPaused,
```

기존 `setSetting('lastSyncedAt', ...)` 줄은 지운다(`recordSyncSuccess`가 한다). `Stack`에 `<Stack.Screen name="account/connect" />`, `<Stack.Screen name="account/delete" options={{ gestureEnabled: false }} />` 추가.

- [ ] **Step 2: 확인** — `npm run typecheck`, `npx jest`, `npx expo export --platform ios --output-dir <scratchpad>/check` 후 폴더 삭제.

- [ ] **Step 3: 커밋** — `feat(app): record sync results and honor the pause gate`

---

### Task 7: 연결 화면 (`app/account/connect.tsx`)

**Files:**
- Create: `app/account/connect.tsx`

**Interfaces:**
- 라우트 파라미터 `from: 'start' | 'settings' | 'relogin'`.
- Consumes: `ConsentScreen`, `RestoreConflictScreen`, `PixelBusyModal`, `PixelDialogModal`, `PixelButton`, `accountDialogs`, `useDialog`, `openPolicy`, `fetchPolicyManifest`·`currentVersions`, `localDateKey`(`src/domain/dates`), `recordConsent`, `decideConnection`, `pullAll`·`applyRestore`·`summarizeSnapshot`·`summarizeDevice`·`downloadRestoredPhotos`·`hasLocalData`·`replaceServerWithDevice`, `enqueueAll`, `pauseSync`·`resumeSync`, `providerFromAuth`, `removeManagedRecordPhoto`, `syncDepsFor`, `getSetting`·`setSetting`·`setFlag`.

화면 단계: `consent` → (로그인 중: 버튼 `loading`) → `restoring`(PixelBusyModal) | `conflict`(RestoreConflictScreen) → 끝.

- [ ] **Step 1: 구현**

```tsx
const DEV_EMAIL = process.env.EXPO_PUBLIC_DEV_EMAIL;
const DEV_PASSWORD = process.env.EXPO_PUBLIC_DEV_PASSWORD;

/**
 * 계정 연결 (계정·백업 설계 ①). 동의 → 로그인 → 분기. 계정 준비 전에는 로그인 자리에 개발 계정 버튼만 둔다(2026-10-01).
 * 연결이 끝날 때까지 자동 전송을 잠근다 — 복원 충돌을 고르기 전에 기기 기록이 올라가지 않게.
 */
export default function ConnectAccount() { /* 아래 흐름 */ }
```

- 처음 그릴 때 `previous = await getSetting('accountUserId')`를 읽고, 있으면(다시 로그인) 두 체크를 켠 채로 시작한다(2026-10-01).
- 로그인 버튼(`loginButtons`): `__DEV__ && DEV_EMAIL && DEV_PASSWORD`이면 `<PixelButton label="개발 계정으로 계속" loading={busy} onPress={connect}/>`, 아니면 `null`.

`connect()` 순서 (실패는 `ask`로 알림 — 제목 "연결하지 못했어요", 본문 "인터넷 연결을 확인하고 다시 시도해 주세요.", 버튼 "확인"):
1. `versions = currentVersions(await fetchPolicyManifest(), localDateKey(Date.now()))` — 실패하면 알리고 끝.
2. `pauseSync()`.
3. `signInWithPassword` → `user`. 실패하면 `resumeSync()` 후 알림.
4. `recordConsent(supabase, versions.terms, versions.privacy)` — 실패하면 `signOut()`·`resumeSync()` 후 알림.
5. `setSetting('accountProvider', providerFromAuth(user.app_metadata.provider))`, `setSetting('sessionPrompted', null)`.
6. `deps = await syncDepsFor(supabase, user.id)`; `serverHasData = (await deps.server.state()).goals > 0`; `plan = decideConnection({ previousUserId: previous, userId: user.id, deviceHasData: await hasLocalData(), serverHasData })`.
7. `plan`별:
   - `same` / `linkOnly`: `setSetting('accountUserId', user.id)` → `finish(false)`
   - `firstBackup`: `enqueueAll()` → `setSetting('firstBackup', '1')` → `setSetting('accountUserId', user.id)` → `finish(false)`
   - `restore`: `runRestore(await pullAll(deps.server))`
   - `conflict`: 스냅샷을 받아 두고 `step = 'conflict'`. 카드: 서버 = `summarizeSnapshot(snap)`, 기기 = `await summarizeDevice()`, `updatedAt`은 `M월 D일`(없으면 '없음').
8. `finish(restored)`: `resumeSync()`; `from === 'start'`이면 `setFlag('startDone', true)` 그리고 `restored`이면 `setFlag('tutorialDone', true)`; `from === 'start'`면 `router.replace('/')`, 아니면 `router.back()`.

`runRestore(snap)`: `step='restoring'` → `{photos, oldPhotoUris} = await applyRestore(snap)` → `oldPhotoUris.forEach(removeManagedRecordPhoto)` → `downloadRestoredPhotos(deps.photos, photos)` → `setSetting('accountUserId', user.id)` → `finish(true)`. 실패하면 `accountDialogs.restoreFailed`: [다시 시도]는 `pullAll`부터 다시, [나중에]는 `cancel()`.

충돌 [서버 백업 사용하기] → `runRestore(snapshot)`. [이 기기 기록 사용하기] → `restoring` 다이얼로그를 띄운 채 `replaceServerWithDevice(deps.server, deps.deviceId)` → `accountUserId` 저장 → `finish(false)`(사진은 잠금이 풀린 뒤 자동 전송이 올린다). 실패는 같은 실패 다이얼로그.

`cancel()` (충돌 화면 뒤로, 복원 실패 [나중에]): `signOut()` → `setSetting('accountUserId', previous)` → `resumeSync()` → `step='consent'`(체크 상태 유지).

동의 화면: 뒤로 → `router.back()`. 이용약관·처리방침 보기 → `openPolicy('terms'|'privacy', ask)`. 만 14세 미만 → `await ask(accountDialogs.under14)` 뒤 `router.back()`.

복원 진행: `<PixelBusyModal visible={step==='restoring'} {...accountDialogs.restoring}/>`. `restoring` 동안 `BackHandler`로 Android 뒤로가기를 막는다.

- [ ] **Step 2: 확인** — `npm run typecheck`, `npm run lint`, iOS export.

- [ ] **Step 3: 커밋** — `feat(app): connect an account with consent, restore and conflict choice`

---

### Task 8: 앱 설정 계정 칸과 로그아웃, 계정 삭제 화면

**Files:**
- Modify: `app/settings.tsx`
- Create: `app/account/delete.tsx`

**Interfaces:**
- Consumes: `AccountBackupPanel`, `readAccountState`, `formatBackedUpAt`, `subscribeSyncStatus`, `pauseSync`·`resumeSync`, `pushOnce`·`syncDepsFor`, `pendingCount`, `localOnlyCount`, `wipeDevice`, `removeAllManagedPhotos`, `deleteAccountOnServer`, `DeleteAccountScreen`·`AccountDeletedScreen`, `PixelDialogModal`, `accountDialogs`.

`settings.tsx`:
- 화면에 들어올 때와 `subscribeSyncStatus` 알림마다 `readAccountState(session?.user.id ?? null)`를 읽어 `AccountBackupPanel status`로 바꾼다(`synced`의 `backedUpAt`은 `lastSyncedAt ? formatBackedUpAt(lastSyncedAt, new Date()) : '방금'`). Supabase가 없으면(`getSupabase()===null`) 기존 "이 기기의 기록" 판을 그대로 둔다.
- 연결 → `router.push({pathname:'/account/connect', params:{from:'settings'}})`, 로그인 → `from:'relogin'`, 계정 삭제 → `/account/delete`.
- 로그아웃: 상태 `logout: null | {step:'confirm'|'busy'|'failed'} | {step:'held'; count:number}`를 `PixelDialogModal`로 그린다(`busy`는 `accountDialogs.logout` + `loading`).
  - 확인 → `busy` → `pauseSync()` → 세션이 있으면 `pushOnce(deps)`(실패하면 `failed`) → 남은 수: 세션 있으면 `(await pendingCount()).held`, 없으면 `await localOnlyCount()` → 0보다 크면 `held`(`accountDialogs.logoutHeld(count)`), 아니면 `finishLogout()`.
  - `failed`(`accountDialogs.logoutFailed`): [다시 시도] → `busy`부터 다시, [닫기] → `resumeSync()`.
  - `held`: [로그아웃] → `finishLogout()`, [취소] → `resumeSync()`.
  - `finishLogout()`: `signOut()` → `wipeDevice(removeAllManagedPhotos)` → `resumeSync()` → `router.replace('/')`.
- 개발 판(`서버 동기화 (개발)`)은 그대로 둔다.

`delete.tsx`:
- `step: 'review' | 'confirm' | 'busy' | 'failed' | 'done'`. `review`는 `DeleteAccountScreen`(뒤로·취소 → `router.back()`). [계정 삭제하기] → `confirm`(`accountDialogs.deleteAccount`) → `busy`(같은 다이얼로그 `loading`) → `pauseSync()` → `deleteAccountOnServer(supabase)` → 성공: `signOut({scope:'local'})` → `wipeDevice(removeAllManagedPhotos)` → `resumeSync()` → `done`(`AccountDeletedScreen`, [처음으로] → `router.replace('/')`). 실패: `failed`(`accountDialogs.deleteFailed`, [다시 시도] → `busy`부터, [닫기] → `resumeSync()`·`review`).
- `busy`·`done`에서 `BackHandler`로 Android 뒤로가기를 막는다.

- [ ] **Step 1: 구현** (위 흐름)
- [ ] **Step 2: 확인** — `npm run typecheck`, `npm run lint`, iOS export.
- [ ] **Step 3: 커밋** — `feat(app): account panel, logout and account deletion`

---

### Task 9: 시작 화면과 로그인 풀림 안내 (`app/index.tsx`)

**Files:**
- Modify: `app/index.tsx`

- [ ] **Step 1: 구현**
- 시작 화면 표시: `!(await getFlag('startDone')) && !(await getFlag('tutorialDone'))` — 튜토리얼을 마친 기존 설치에는 띄우지 않는다. 튜토리얼보다 먼저 확인한다. Supabase가 없으면 시작 화면을 건너뛴다.
- `AccountStartScreen`: 기본 선택 `account`. [계속] — `local`이면 `setFlag('startDone', true)` → 튜토리얼, `account`면 `router.push({pathname:'/account/connect', params:{from:'start'}})`. 돌아오면(연결 취소) 시작 화면 그대로.
- 로그인 풀림 안내: 홈에 들어올 때 `readAccountState(session)`가 `needsLogin`이고 `sessionPrompted !== accountUserId`면 `ask(accountDialogs.session)` 한 번 → `setSetting('sessionPrompted', accountUserId)` → [로그인]이면 `/account/connect?from=relogin`.
- 홈은 `useDialog`의 `dialog`를 함께 렌더한다.

- [ ] **Step 2: 확인** — `npm run typecheck`, `npm run lint`, iOS export, `npm test`, `npm run test:components`.
- [ ] **Step 3: 커밋** — `feat(app): start screen and one-time re-login prompt`

---

### Task 10: 문서와 Expo Go 확인

**Files:**
- Modify: `docs/HANDOFF.md`, `docs/superpowers/specs/2026-09-30-account-backup-design.md`

- [ ] **Step 1: 문서** — 설계 「서버 단계 뒤에 남은 것」에서 처리한 항목(백업 상태 규칙, 로그아웃·삭제 전 전송 멈춤, 세션 없을 때 `accountUserId` 유지, 다른 계정 로그인 분기)에 날짜와 처리 내용을 적고, 이번 결정 4개를 결정 표에 더한다. HANDOFF 「화면에 연결되지 않은 것」의 계정 화면 줄을 "연결됨(개발 로그인)"으로, 다음 할 일 목록을 갱신한다.
- [ ] **Step 2: Expo Go 수동 확인 목록** (사용자와 함께, 개발 서버 `chagok-dev`)
  1. 새로 설치한 것처럼(로그아웃 또는 앱 삭제 뒤) 시작 → [이 기기에서만 쓰기] → 튜토리얼.
  2. 앱 설정 [계정 연결하기] → 동의 → 개발 계정 → 서버가 비었으면 연결만/첫 백업 → "오늘 H:MM에 모두 백업했어요".
  3. 비행기 모드로 기록 → 전송 실패 뒤 "백업하지 못한 기록이 있어요" → 복귀 후 사라짐.
  4. 로그아웃 → 기기 기록·사진 비워짐 → 시작 화면 → [계정 연결하기] → 복원 진행 → 튜토리얼 없이 목록, 사진 다시 받음.
  5. 기기에 기록을 만든 채 다시 연결 → 복원 충돌 → 각 선택, 뒤로 가기(연결 취소 → 앱 설정은 이전 상태).
  6. 계정 삭제 → 완료 → 시작 화면. 삭제 뒤 `npm run server:dev-user`로 개발 계정을 다시 만든다.
  7. 로그인 풀림: 개발 화면에서 [로그아웃 (개발)]만 하고 앱 재시작 → 안내 한 번 → [로그인] → 체크가 켜진 동의 화면. 같은 상태에서 앱 설정 로그아웃 → "기록 N개가 사라져요" 경고.
- [ ] **Step 3: 커밋** — `docs: account wiring status and decisions`
