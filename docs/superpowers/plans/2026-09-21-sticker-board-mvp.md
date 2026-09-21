# 차곡차곡 스티커판 MVP 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 목표를 만들고 스티커를 직접 붙여 판을 채우며, 원하면 사진·메모를 첨부하고, 판을 여는 것만으로 쌓인 기록을 회고할 수 있는 로컬 동작 앱을 만든다.

**Architecture:** Expo Router 기반 3화면(목표 목록 / 판 / 스티커 상세) 구조. 판 타입(`calendar` | `tally`)은 **데이터 모델을 공유하고 렌더링만 분기**하며, 슬롯 배치는 순수 함수(`src/domain/slots.ts`)로 분리해 UI 없이 테스트한다. 저장은 expo-sqlite 위에 리포지토리 계층을 두어, Plan B(클라우드 동기화)에서 구현체만 교체할 수 있게 한다.

**Tech Stack:** Expo (React Native) + TypeScript, expo-router, expo-sqlite, expo-image-picker, expo-haptics, react-native-reanimated, **jest + ts-jest** (jest-expo 아님 — 아래 결정 기록 참조)

**Spec:** `/Users/eunjukim/.omc/specs/deep-interview-chamjal-sticker-app.md`

## Global Constraints

- 플랫폼: Expo (React Native), iOS + Android 동시 대상
- 언어: TypeScript (strict)
- 앱 이름: 차곡차곡 / slug `chagok` / bundle `com.eunjukim.chagok`
- 판 타입 2종 `calendar` | `tally` — **데이터 모델 공통, 렌더링만 분기**
- 스티커는 사용자가 **자유롭게 붙이고 뗄 수 있다** (취소 불가 아님)
- 기록(사진·메모)은 **선택 사항** — 없어도 모든 기능이 정상 동작해야 한다
- 스티커 종류: **5종** — `stamp`(참 잘했어요 도장), `star`, `heart`, `flower`, `dot`. 판 하단 팔레트에서 사용자가 고르고 **선택은 유지**된다 (한 번 고르면 계속 그걸로 붙는다). 한 판 안에서 섞어 쓸 수 있다
- 목표 개수 상한: 없음
- 기록 형식: 사진(expo-image-picker) + 메모(텍스트). **음성 제외**
- Expo SDK **57.0.24** (React Native 0.86.3, React 19.2.3) — Task 1에서 `create-expo-app@latest`가 설치한 실제 버전
- 테스트: **jest + ts-jest**. 순수 로직은 그대로, 리포지토리는 Node 24 내장 `node:sqlite`로 실제 SQL을 실행해 검증한다. 이를 위해 DB 드라이버를 주입 가능한 인터페이스로 둔다 (Task 3)
- **Non-Goals (구현 금지):** 타인 판정, AI 자동 판정, 취소 불가/기록 잠금, 등급 시스템, 통계·잔디밭·연속일수, 별도 회고 화면, 보상 시스템, 계정·클라우드 동기화(Plan B)

---

## File Structure

```
chagok-app/
├── app/                        # expo-router (파일 기반 라우팅)
│   ├── _layout.tsx             # 루트 스택, 테마 적용
│   ├── index.tsx               # 목표 목록 = 홈
│   ├── goal/
│   │   ├── new.tsx             # 목표 생성 폼
│   │   └── [id].tsx            # 판 화면 (타입에 따라 보드 컴포넌트 분기)
│   └── sticker/
│       └── [id].tsx            # 스티커 상세 = 기록 보기/편집/스티커 떼기
├── src/
│   ├── domain/
│   │   ├── types.ts            # Goal, Sticker, RecordNote 타입 + 상수
│   │   └── slots.ts            # 슬롯 배치 순수 함수 (판 로직의 심장)
│   ├── db/
│   │   ├── client.ts           # expo-sqlite 연결 + 마이그레이션 실행
│   │   └── schema.ts           # CREATE TABLE 문
│   ├── repositories/
│   │   ├── goalRepository.ts
│   │   ├── stickerRepository.ts
│   │   └── recordRepository.ts
│   ├── components/
│   │   ├── Sticker.tsx         # 스티커 비주얼 + 붙는 모션
│   │   ├── StickerSlot.tsx     # 칸 하나 (빈칸 | 스티커)
│   │   ├── CalendarBoard.tsx
│   │   └── TallyBoard.tsx
│   └── theme/
│       └── tokens.ts           # 색·간격·타이포 토큰
└── __tests__/
    ├── slots.test.ts
    ├── goalRepository.test.ts
    ├── stickerRepository.test.ts
    └── recordRepository.test.ts
```

**분할 근거:** `slots.ts`는 UI 없이 테스트 가능한 순수 로직이라 별도 파일로 뺀다 — 판 타입 2종의 차이가 전부 여기 모인다. 리포지토리는 테이블별로 나눠 Plan B에서 개별 교체가 가능하게 한다.

---

### Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json` (create-expo-app 생성물)
- Create: `src/theme/tokens.ts`
- Modify: `app/_layout.tsx`
- Modify: `docs/superpowers/plans/2026-09-21-sticker-board-mvp.md` (SDK 버전 기록)

**Interfaces:**
- Consumes: 없음 (최초 태스크)
- Produces: `tokens` 객체 — `tokens.color.paper`, `tokens.color.ink`, `tokens.color.slotEmpty`, `tokens.space(n)`, `tokens.radius.sticker`

- [ ] **Step 1: Expo 프로젝트 생성**

```bash
cd /Users/eunjukim/Desktop/workspace
npx create-expo-app@latest chagok-app --template blank-typescript
cd chagok-app
```

- [ ] **Step 2: 의존성 설치**

```bash
npx expo install expo-router expo-sqlite expo-image-picker expo-haptics \
  react-native-reanimated react-native-safe-area-context react-native-screens \
  expo-linking expo-constants expo-status-bar
npm install --save-dev jest@^29 ts-jest@^29 @types/jest@^29
```

- [ ] **Step 3: app.json 설정**

`app.json`의 `expo` 객체를 다음 값으로 수정한다:

```json
{
  "expo": {
    "name": "차곡차곡",
    "slug": "chagok",
    "scheme": "chagok",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "ios": { "bundleIdentifier": "com.eunjukim.chagok", "supportsTablet": false },
    "android": { "package": "com.eunjukim.chagok" },
    "plugins": ["expo-router", "expo-sqlite", "expo-image-picker"],
    "experiments": { "typedRoutes": true }
  }
}
```

- [ ] **Step 4: expo-router 진입점 설정**

`package.json`의 `main`을 `"expo-router/entry"`로 바꾸고, `jest` 설정을 추가한다:

```json
{
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "test": "jest"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 5: babel.config.js에 reanimated 플러그인 추가**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

- [ ] **Step 6: 테마 토큰 작성**

`src/theme/tokens.ts`:

```ts
export const tokens = {
  color: {
    paper: '#F5F3EE',
    ink: '#2A2622',
    inkSoft: '#7A736B',
    slotEmpty: '#E5E1D8',
    slotLine: '#D6D1C6',
    accent: '#C8553D',
  },
  space: (n: number) => n * 4,
  radius: { sticker: 999, card: 12 },
  font: { title: 20, body: 15, caption: 12 },
} as const;
```

- [ ] **Step 7: 루트 레이아웃 작성**

`app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { tokens } from '../src/theme/tokens';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tokens.color.paper },
        headerTintColor: tokens.color.ink,
        contentStyle: { backgroundColor: tokens.color.paper },
      }}
    >
      <Stack.Screen name="index" options={{ title: '차곡차곡' }} />
      <Stack.Screen name="goal/new" options={{ title: '새 목표', presentation: 'modal' }} />
    </Stack>
  );
}
```

- [ ] **Step 8: 실행 확인**

Run: `npx expo start`
Expected: 앱이 빌드되고 시뮬레이터에서 빈 화면이 뜬다 (에러 없음)

- [ ] **Step 9: SDK 버전을 계획서에 기록**

`package.json`의 `dependencies.expo` 값을 읽어 이 문서 Global Constraints의 SDK 줄을 실제 버전으로 갱신한다.

- [ ] **Step 10: 커밋**

```bash
git init
git add -A
git commit -m "chore: scaffold expo project with router, sqlite, theme tokens"
```

---

### Task 2: 도메인 타입과 슬롯 배치 로직

판 타입 2종의 차이가 전부 이 태스크에 모인다. UI가 없으므로 순수 TDD로 진행한다.

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/slots.ts`
- Test: `__tests__/slots.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `type BoardType = 'calendar' | 'tally'`
  - `type Goal = { id: string; name: string; boardType: BoardType; totalSlots: number | null; createdAt: number }`
  - `type Sticker = { id: string; goalId: string; placedAt: number; slotIndex: number; stickerType: string }`
  - `type RecordNote = { id: string; stickerId: string; photoUri: string | null; memo: string | null; createdAt: number }`
  - `type Slot = { index: number; label: string; sticker: Sticker | null }`
  - `buildSlots(goal: Goal, stickers: Sticker[], now: Date): Slot[]`
  - `nextSlotIndex(goal: Goal, stickers: Sticker[], now: Date): number | null`

- [ ] **Step 1: 실패하는 테스트 작성**

`__tests__/slots.test.ts`:

```ts
import { buildSlots, nextSlotIndex } from '../src/domain/slots';
import type { Goal, Sticker } from '../src/domain/types';

const tallyGoal: Goal = {
  id: 'g1', name: '러닝 30회', boardType: 'tally',
  totalSlots: 30, createdAt: 0,
};

const calendarGoal: Goal = {
  id: 'g2', name: '매일 독서', boardType: 'calendar',
  totalSlots: null, createdAt: 0,
};

const sticker = (slotIndex: number, placedAt = 0): Sticker => ({
  id: `s${slotIndex}`, goalId: 'g1', placedAt, slotIndex, stickerType: 'default',
});

describe('buildSlots - tally', () => {
  it('총 칸 수만큼 슬롯을 만든다', () => {
    const slots = buildSlots(tallyGoal, [], new Date('2026-09-21'));
    expect(slots).toHaveLength(30);
  });

  it('붙인 스티커를 해당 슬롯에 넣고 나머지는 빈칸이다', () => {
    const slots = buildSlots(tallyGoal, [sticker(0), sticker(1)], new Date('2026-09-21'));
    expect(slots[0].sticker).not.toBeNull();
    expect(slots[1].sticker).not.toBeNull();
    expect(slots[2].sticker).toBeNull();
  });

  it('슬롯 라벨은 1부터 시작하는 번호다', () => {
    const slots = buildSlots(tallyGoal, [], new Date('2026-09-21'));
    expect(slots[0].label).toBe('1');
    expect(slots[29].label).toBe('30');
  });
});

describe('buildSlots - calendar', () => {
  it('해당 월의 일수만큼 슬롯을 만든다', () => {
    const slots = buildSlots(calendarGoal, [], new Date('2026-09-15'));
    expect(slots).toHaveLength(30); // 9월은 30일
  });

  it('2월 윤년을 올바르게 처리한다', () => {
    const slots = buildSlots(calendarGoal, [], new Date('2028-02-10'));
    expect(slots).toHaveLength(29);
  });

  it('붙인 날짜에 스티커가 들어간다', () => {
    const placedAt = new Date('2026-09-03T10:00:00').getTime();
    const s: Sticker = { ...sticker(2, placedAt), goalId: 'g2' };
    const slots = buildSlots(calendarGoal, [s], new Date('2026-09-15'));
    expect(slots[2].sticker).not.toBeNull(); // 3일 = index 2
    expect(slots[0].sticker).toBeNull();
  });
});

describe('nextSlotIndex', () => {
  it('tally: 다음 빈 칸 번호를 준다', () => {
    expect(nextSlotIndex(tallyGoal, [sticker(0), sticker(1)], new Date())).toBe(2);
  });

  it('tally: 판이 다 차면 null을 준다', () => {
    const full = Array.from({ length: 30 }, (_, i) => sticker(i));
    expect(nextSlotIndex(tallyGoal, full, new Date())).toBeNull();
  });

  it('calendar: 오늘 날짜의 슬롯 번호를 준다', () => {
    expect(nextSlotIndex(calendarGoal, [], new Date('2026-09-21'))).toBe(20);
  });

  it('calendar: 오늘 이미 붙였으면 null을 준다', () => {
    const today = new Date('2026-09-21T09:00:00');
    const s: Sticker = { ...sticker(20, today.getTime()), goalId: 'g2' };
    expect(nextSlotIndex(calendarGoal, [s], today)).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- slots`
Expected: FAIL — "Cannot find module '../src/domain/slots'"

- [ ] **Step 3: 타입 정의 작성**

`src/domain/types.ts`:

```ts
export type BoardType = 'calendar' | 'tally';

export const STICKER_TYPE_DEFAULT = 'default';

export type Goal = {
  id: string;
  name: string;
  boardType: BoardType;
  totalSlots: number | null; // tally일 때만 값, calendar는 null
  createdAt: number;
};

export type Sticker = {
  id: string;
  goalId: string;
  placedAt: number;
  slotIndex: number;
  stickerType: string;
};

export type RecordNote = {
  id: string;
  stickerId: string;
  photoUri: string | null;
  memo: string | null;
  createdAt: number;
};

export type Slot = {
  index: number;
  label: string;
  sticker: Sticker | null;
};
```

- [ ] **Step 4: 슬롯 로직 구현**

`src/domain/slots.ts`:

```ts
import type { Goal, Sticker, Slot } from './types';

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function slotCount(goal: Goal, now: Date): number {
  return goal.boardType === 'tally' ? (goal.totalSlots ?? 0) : daysInMonth(now);
}

export function buildSlots(goal: Goal, stickers: Sticker[], now: Date): Slot[] {
  const count = slotCount(goal, now);
  const byIndex = new Map<number, Sticker>();

  for (const s of stickers) {
    const idx =
      goal.boardType === 'tally' ? s.slotIndex : new Date(s.placedAt).getDate() - 1;
    if (idx >= 0 && idx < count) byIndex.set(idx, s);
  }

  return Array.from({ length: count }, (_, i) => ({
    index: i,
    label: String(i + 1),
    sticker: byIndex.get(i) ?? null,
  }));
}

export function nextSlotIndex(
  goal: Goal,
  stickers: Sticker[],
  now: Date,
): number | null {
  const slots = buildSlots(goal, stickers, now);

  if (goal.boardType === 'calendar') {
    const todayIdx = now.getDate() - 1;
    return slots[todayIdx]?.sticker ? null : todayIdx;
  }

  const empty = slots.find((s) => s.sticker === null);
  return empty ? empty.index : null;
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- slots`
Expected: PASS — 9개 테스트 전부 통과

- [ ] **Step 6: 커밋**

```bash
git add src/domain __tests__/slots.test.ts
git commit -m "feat: add domain types and slot layout logic for both board types"
```

---

### Task 3: DB 스키마와 클라이언트

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/client.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `getDb(): Promise<SQLiteDatabase>` — 싱글턴 연결, 최초 호출 시 마이그레이션 실행
  - `resetDbForTest(): void` — 테스트에서 싱글턴 초기화

- [ ] **Step 1: 스키마 작성**

`src/db/schema.ts`:

```ts
export const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS goals (
     id TEXT PRIMARY KEY NOT NULL,
     name TEXT NOT NULL,
     board_type TEXT NOT NULL CHECK (board_type IN ('calendar','tally')),
     total_slots INTEGER,
     created_at INTEGER NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS stickers (
     id TEXT PRIMARY KEY NOT NULL,
     goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
     placed_at INTEGER NOT NULL,
     slot_index INTEGER NOT NULL,
     sticker_type TEXT NOT NULL DEFAULT 'default'
   );`,
  `CREATE INDEX IF NOT EXISTS idx_stickers_goal ON stickers(goal_id);`,
  `CREATE TABLE IF NOT EXISTS records (
     id TEXT PRIMARY KEY NOT NULL,
     sticker_id TEXT NOT NULL UNIQUE REFERENCES stickers(id) ON DELETE CASCADE,
     photo_uri TEXT,
     memo TEXT,
     created_at INTEGER NOT NULL
   );`,
];
```

- [ ] **Step 2: 클라이언트 작성**

`src/db/client.ts`:

```ts
import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('chagok.db');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  for (const sql of MIGRATIONS) {
    await db.execAsync(sql);
  }
  return db;
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = open();
  return dbPromise;
}

export function resetDbForTest(): void {
  dbPromise = null;
}
```

- [ ] **Step 3: 앱이 여전히 뜨는지 확인**

Run: `npx expo start`
Expected: 빌드 성공, 에러 없음 (아직 DB를 호출하는 화면은 없음)

- [ ] **Step 4: 커밋**

```bash
git add src/db
git commit -m "feat: add sqlite schema and client with migrations"
```

---

### Task 4: goalRepository

**Files:**
- Create: `src/repositories/goalRepository.ts`
- Test: `__tests__/goalRepository.test.ts`

**Interfaces:**
- Consumes: `getDb()` (Task 3), `Goal`, `BoardType` (Task 2)
- Produces:
  - `createGoal(input: { name: string; boardType: BoardType; totalSlots: number | null }): Promise<Goal>`
  - `listGoals(): Promise<Goal[]>` — 최신 생성순
  - `getGoal(id: string): Promise<Goal | null>`
  - `deleteGoal(id: string): Promise<void>`

- [ ] **Step 1: 실패하는 테스트 작성**

`__tests__/goalRepository.test.ts`:

```ts
import { createGoal, listGoals, getGoal, deleteGoal } from '../src/repositories/goalRepository';
import { resetDbForTest } from '../src/db/client';

beforeEach(() => { resetDbForTest(); });

describe('goalRepository', () => {
  it('목표를 만들고 id를 부여한다', async () => {
    const g = await createGoal({ name: '러닝 30회', boardType: 'tally', totalSlots: 30 });
    expect(g.id).toBeTruthy();
    expect(g.name).toBe('러닝 30회');
    expect(g.totalSlots).toBe(30);
  });

  it('calendar 목표는 totalSlots가 null이다', async () => {
    const g = await createGoal({ name: '매일 독서', boardType: 'calendar', totalSlots: null });
    expect(g.totalSlots).toBeNull();
  });

  it('목표를 최신순으로 나열한다', async () => {
    await createGoal({ name: '첫번째', boardType: 'tally', totalSlots: 10 });
    await createGoal({ name: '두번째', boardType: 'tally', totalSlots: 10 });
    const list = await listGoals();
    expect(list[0].name).toBe('두번째');
  });

  it('id로 목표를 찾는다', async () => {
    const g = await createGoal({ name: '찾기', boardType: 'tally', totalSlots: 5 });
    expect((await getGoal(g.id))?.name).toBe('찾기');
  });

  it('없는 id면 null을 준다', async () => {
    expect(await getGoal('nope')).toBeNull();
  });

  it('목표를 지운다', async () => {
    const g = await createGoal({ name: '지울것', boardType: 'tally', totalSlots: 5 });
    await deleteGoal(g.id);
    expect(await getGoal(g.id)).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- goalRepository`
Expected: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: 구현**

`src/repositories/goalRepository.ts`:

```ts
import { getDb } from '../db/client';
import type { Goal, BoardType } from '../domain/types';

type GoalRow = {
  id: string;
  name: string;
  board_type: BoardType;
  total_slots: number | null;
  created_at: number;
};

function toGoal(r: GoalRow): Goal {
  return {
    id: r.id,
    name: r.name,
    boardType: r.board_type,
    totalSlots: r.total_slots,
    createdAt: r.created_at,
  };
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createGoal(input: {
  name: string;
  boardType: BoardType;
  totalSlots: number | null;
}): Promise<Goal> {
  const db = await getDb();
  const goal: Goal = {
    id: newId(),
    name: input.name,
    boardType: input.boardType,
    totalSlots: input.boardType === 'tally' ? input.totalSlots : null,
    createdAt: Date.now(),
  };
  await db.runAsync(
    'INSERT INTO goals (id, name, board_type, total_slots, created_at) VALUES (?, ?, ?, ?, ?)',
    goal.id, goal.name, goal.boardType, goal.totalSlots, goal.createdAt,
  );
  return goal;
}

export async function listGoals(): Promise<Goal[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<GoalRow>(
    'SELECT * FROM goals ORDER BY created_at DESC',
  );
  return rows.map(toGoal);
}

export async function getGoal(id: string): Promise<Goal | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<GoalRow>('SELECT * FROM goals WHERE id = ?', id);
  return row ? toGoal(row) : null;
}

export async function deleteGoal(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM goals WHERE id = ?', id);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- goalRepository`
Expected: PASS — 6개 테스트 통과

- [ ] **Step 5: 커밋**

```bash
git add src/repositories/goalRepository.ts __tests__/goalRepository.test.ts
git commit -m "feat: add goal repository with crud"
```

---

### Task 5: stickerRepository

**Files:**
- Create: `src/repositories/stickerRepository.ts`
- Test: `__tests__/stickerRepository.test.ts`

**Interfaces:**
- Consumes: `getDb()` (Task 3), `Sticker`, `STICKER_TYPE_DEFAULT` (Task 2)
- Produces:
  - `placeSticker(goalId: string, slotIndex: number): Promise<Sticker>`
  - `listStickers(goalId: string): Promise<Sticker[]>`
  - `getSticker(id: string): Promise<Sticker | null>`
  - `removeSticker(id: string): Promise<void>`

- [ ] **Step 1: 실패하는 테스트 작성**

`__tests__/stickerRepository.test.ts`:

```ts
import { createGoal } from '../src/repositories/goalRepository';
import {
  placeSticker, listStickers, getSticker, removeSticker,
} from '../src/repositories/stickerRepository';
import { resetDbForTest } from '../src/db/client';

beforeEach(() => { resetDbForTest(); });

async function goal() {
  return createGoal({ name: '테스트', boardType: 'tally', totalSlots: 10 });
}

describe('stickerRepository', () => {
  it('스티커를 붙인다', async () => {
    const g = await goal();
    const s = await placeSticker(g.id, 0);
    expect(s.goalId).toBe(g.id);
    expect(s.slotIndex).toBe(0);
    expect(s.stickerType).toBe('default');
    expect(s.placedAt).toBeGreaterThan(0);
  });

  it('목표별로 스티커를 나열한다', async () => {
    const g = await goal();
    await placeSticker(g.id, 0);
    await placeSticker(g.id, 1);
    expect(await listStickers(g.id)).toHaveLength(2);
  });

  it('다른 목표의 스티커는 섞이지 않는다', async () => {
    const a = await goal();
    const b = await goal();
    await placeSticker(a.id, 0);
    expect(await listStickers(b.id)).toHaveLength(0);
  });

  it('스티커를 뗀다', async () => {
    const g = await goal();
    const s = await placeSticker(g.id, 0);
    await removeSticker(s.id);
    expect(await getSticker(s.id)).toBeNull();
    expect(await listStickers(g.id)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- stickerRepository`
Expected: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: 구현**

`src/repositories/stickerRepository.ts`:

```ts
import { getDb } from '../db/client';
import { STICKER_TYPE_DEFAULT } from '../domain/types';
import type { Sticker } from '../domain/types';

type StickerRow = {
  id: string;
  goal_id: string;
  placed_at: number;
  slot_index: number;
  sticker_type: string;
};

function toSticker(r: StickerRow): Sticker {
  return {
    id: r.id,
    goalId: r.goal_id,
    placedAt: r.placed_at,
    slotIndex: r.slot_index,
    stickerType: r.sticker_type,
  };
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function placeSticker(goalId: string, slotIndex: number): Promise<Sticker> {
  const db = await getDb();
  const sticker: Sticker = {
    id: newId(),
    goalId,
    placedAt: Date.now(),
    slotIndex,
    stickerType: STICKER_TYPE_DEFAULT,
  };
  await db.runAsync(
    'INSERT INTO stickers (id, goal_id, placed_at, slot_index, sticker_type) VALUES (?, ?, ?, ?, ?)',
    sticker.id, sticker.goalId, sticker.placedAt, sticker.slotIndex, sticker.stickerType,
  );
  return sticker;
}

export async function listStickers(goalId: string): Promise<Sticker[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<StickerRow>(
    'SELECT * FROM stickers WHERE goal_id = ? ORDER BY slot_index ASC',
    goalId,
  );
  return rows.map(toSticker);
}

export async function getSticker(id: string): Promise<Sticker | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<StickerRow>('SELECT * FROM stickers WHERE id = ?', id);
  return row ? toSticker(row) : null;
}

export async function removeSticker(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM stickers WHERE id = ?', id);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- stickerRepository`
Expected: PASS — 4개 테스트 통과

- [ ] **Step 5: 커밋**

```bash
git add src/repositories/stickerRepository.ts __tests__/stickerRepository.test.ts
git commit -m "feat: add sticker repository with place and remove"
```

---

### Task 6: recordRepository

기록은 선택 사항이므로, **기록이 없는 스티커도 정상**이라는 점을 테스트로 고정한다.

**Files:**
- Create: `src/repositories/recordRepository.ts`
- Test: `__tests__/recordRepository.test.ts`

**Interfaces:**
- Consumes: `getDb()` (Task 3), `RecordNote` (Task 2)
- Produces:
  - `upsertRecord(stickerId: string, data: { photoUri: string | null; memo: string | null }): Promise<RecordNote>`
  - `getRecord(stickerId: string): Promise<RecordNote | null>`
  - `listRecordedStickerIds(goalId: string): Promise<Set<string>>` — 판에서 기록 있는 스티커를 구분 표시하는 데 쓴다
  - `deleteRecord(stickerId: string): Promise<void>`

- [ ] **Step 1: 실패하는 테스트 작성**

`__tests__/recordRepository.test.ts`:

```ts
import { createGoal } from '../src/repositories/goalRepository';
import { placeSticker, removeSticker } from '../src/repositories/stickerRepository';
import {
  upsertRecord, getRecord, listRecordedStickerIds, deleteRecord,
} from '../src/repositories/recordRepository';
import { resetDbForTest } from '../src/db/client';

beforeEach(() => { resetDbForTest(); });

async function stickerOnGoal() {
  const g = await createGoal({ name: '테스트', boardType: 'tally', totalSlots: 10 });
  const s = await placeSticker(g.id, 0);
  return { goal: g, sticker: s };
}

describe('recordRepository', () => {
  it('기록이 없는 스티커는 null을 준다', async () => {
    const { sticker } = await stickerOnGoal();
    expect(await getRecord(sticker.id)).toBeNull();
  });

  it('메모만 저장할 수 있다', async () => {
    const { sticker } = await stickerOnGoal();
    const r = await upsertRecord(sticker.id, { photoUri: null, memo: '오늘 5km' });
    expect(r.memo).toBe('오늘 5km');
    expect(r.photoUri).toBeNull();
  });

  it('사진만 저장할 수 있다', async () => {
    const { sticker } = await stickerOnGoal();
    const r = await upsertRecord(sticker.id, { photoUri: 'file:///p.jpg', memo: null });
    expect(r.photoUri).toBe('file:///p.jpg');
    expect(r.memo).toBeNull();
  });

  it('같은 스티커에 다시 저장하면 덮어쓴다', async () => {
    const { sticker } = await stickerOnGoal();
    await upsertRecord(sticker.id, { photoUri: null, memo: '처음' });
    await upsertRecord(sticker.id, { photoUri: null, memo: '수정' });
    expect((await getRecord(sticker.id))?.memo).toBe('수정');
  });

  it('기록 있는 스티커 id 집합을 준다', async () => {
    const { goal, sticker } = await stickerOnGoal();
    const bare = await placeSticker(goal.id, 1);
    await upsertRecord(sticker.id, { photoUri: null, memo: 'ok' });
    const ids = await listRecordedStickerIds(goal.id);
    expect(ids.has(sticker.id)).toBe(true);
    expect(ids.has(bare.id)).toBe(false);
  });

  it('스티커를 떼면 기록도 같이 사라진다', async () => {
    const { sticker } = await stickerOnGoal();
    await upsertRecord(sticker.id, { photoUri: null, memo: 'ok' });
    await removeSticker(sticker.id);
    expect(await getRecord(sticker.id)).toBeNull();
  });

  it('기록만 지울 수 있다', async () => {
    const { sticker } = await stickerOnGoal();
    await upsertRecord(sticker.id, { photoUri: null, memo: 'ok' });
    await deleteRecord(sticker.id);
    expect(await getRecord(sticker.id)).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- recordRepository`
Expected: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: 구현**

`src/repositories/recordRepository.ts`:

```ts
import { getDb } from '../db/client';
import type { RecordNote } from '../domain/types';

type RecordRow = {
  id: string;
  sticker_id: string;
  photo_uri: string | null;
  memo: string | null;
  created_at: number;
};

function toRecord(r: RecordRow): RecordNote {
  return {
    id: r.id,
    stickerId: r.sticker_id,
    photoUri: r.photo_uri,
    memo: r.memo,
    createdAt: r.created_at,
  };
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function upsertRecord(
  stickerId: string,
  data: { photoUri: string | null; memo: string | null },
): Promise<RecordNote> {
  const db = await getDb();
  const existing = await getRecord(stickerId);
  if (existing) {
    await db.runAsync(
      'UPDATE records SET photo_uri = ?, memo = ? WHERE sticker_id = ?',
      data.photoUri, data.memo, stickerId,
    );
    return { ...existing, photoUri: data.photoUri, memo: data.memo };
  }
  const record: RecordNote = {
    id: newId(),
    stickerId,
    photoUri: data.photoUri,
    memo: data.memo,
    createdAt: Date.now(),
  };
  await db.runAsync(
    'INSERT INTO records (id, sticker_id, photo_uri, memo, created_at) VALUES (?, ?, ?, ?, ?)',
    record.id, record.stickerId, record.photoUri, record.memo, record.createdAt,
  );
  return record;
}

export async function getRecord(stickerId: string): Promise<RecordNote | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<RecordRow>(
    'SELECT * FROM records WHERE sticker_id = ?', stickerId,
  );
  return row ? toRecord(row) : null;
}

export async function listRecordedStickerIds(goalId: string): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ sticker_id: string }>(
    `SELECT r.sticker_id FROM records r
     JOIN stickers s ON s.id = r.sticker_id
     WHERE s.goal_id = ?`,
    goalId,
  );
  return new Set(rows.map((r) => r.sticker_id));
}

export async function deleteRecord(stickerId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM records WHERE sticker_id = ?', stickerId);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- recordRepository`
Expected: PASS — 7개 테스트 통과

- [ ] **Step 5: 커밋**

```bash
git add src/repositories/recordRepository.ts __tests__/recordRepository.test.ts
git commit -m "feat: add record repository with optional photo and memo"
```

---

### Task 7: 목표 목록 화면 (홈)

첫 실행 시 빈 화면이 나오면 안 된다 — 스펙 인수 기준에 명시돼 있다.

**Files:**
- Modify: `app/index.tsx`
- Create: `src/components/GoalCard.tsx`

**Interfaces:**
- Consumes: `listGoals()` (Task 4), `listStickers()` (Task 5), `buildSlots()` (Task 2), `tokens` (Task 1)
- Produces: `<GoalCard goal={Goal} filled={number} total={number} onPress={() => void} />`

- [ ] **Step 1: GoalCard 컴포넌트 작성**

`src/components/GoalCard.tsx`:

```tsx
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { tokens } from '../theme/tokens';
import type { Goal } from '../domain/types';

type Props = { goal: Goal; filled: number; total: number; onPress: () => void };

export function GoalCard({ goal, filled, total, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.name}>{goal.name}</Text>
      <Text style={styles.meta}>
        {goal.boardType === 'calendar' ? '이번 달' : '적립판'} · {filled}/{total}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: tokens.space(4),
    borderRadius: tokens.radius.card,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: tokens.color.slotLine,
    gap: tokens.space(1),
  },
  name: { fontSize: tokens.font.title, color: tokens.color.ink, fontWeight: '600' },
  meta: { fontSize: tokens.font.caption, color: tokens.color.inkSoft },
});
```

- [ ] **Step 2: 홈 화면 작성**

`app/index.tsx`:

```tsx
import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { listGoals } from '../src/repositories/goalRepository';
import { listStickers } from '../src/repositories/stickerRepository';
import { buildSlots } from '../src/domain/slots';
import { GoalCard } from '../src/components/GoalCard';
import { tokens } from '../src/theme/tokens';
import type { Goal } from '../src/domain/types';

type Row = { goal: Goal; filled: number; total: number };

export default function Home() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const goals = await listGoals();
    const now = new Date();
    const next: Row[] = [];
    for (const goal of goals) {
      const stickers = await listStickers(goal.id);
      const slots = buildSlots(goal, stickers, now);
      next.push({
        goal,
        filled: slots.filter((s) => s.sticker !== null).length,
        total: slots.length,
      });
    }
    setRows(next);
    setLoaded(true);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.screen}>
      {loaded && rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>아직 판이 비어 있어요</Text>
          <Text style={styles.emptyBody}>
            첫 목표를 만들면 여기에 차곡차곡 쌓입니다.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.goal.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <GoalCard
              goal={item.goal}
              filled={item.filled}
              total={item.total}
              onPress={() => router.push(`/goal/${item.goal.id}`)}
            />
          )}
        />
      )}

      <Pressable style={styles.fab} onPress={() => router.push('/goal/new')}>
        <Text style={styles.fabText}>새 목표 만들기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.paper },
  list: { padding: tokens.space(4), gap: tokens.space(3) },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: tokens.space(2) },
  emptyTitle: { fontSize: tokens.font.title, color: tokens.color.ink, fontWeight: '600' },
  emptyBody: { fontSize: tokens.font.body, color: tokens.color.inkSoft },
  fab: {
    margin: tokens.space(4),
    padding: tokens.space(4),
    borderRadius: tokens.radius.card,
    backgroundColor: tokens.color.accent,
    alignItems: 'center',
  },
  fabText: { color: '#FFFFFF', fontSize: tokens.font.body, fontWeight: '600' },
});
```

- [ ] **Step 3: 빈 상태 확인**

Run: `npx expo start`
Expected: "아직 판이 비어 있어요" 문구와 "새 목표 만들기" 버튼이 보인다

- [ ] **Step 4: 커밋**

```bash
git add app/index.tsx src/components/GoalCard.tsx
git commit -m "feat: add goal list screen with empty state"
```

---

### Task 8: 목표 생성 화면

**Files:**
- Create: `app/goal/new.tsx`

**Interfaces:**
- Consumes: `createGoal()` (Task 4), `tokens` (Task 1)
- Produces: 없음 (화면 종단)

- [ ] **Step 1: 생성 화면 작성**

`app/goal/new.tsx`:

```tsx
import { useState } from 'react';
import { Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { createGoal } from '../../src/repositories/goalRepository';
import { tokens } from '../../src/theme/tokens';
import type { BoardType } from '../../src/domain/types';

const DEFAULT_TALLY_SLOTS = 30;

export default function NewGoal() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [boardType, setBoardType] = useState<BoardType>('calendar');
  const [slotsText, setSlotsText] = useState(String(DEFAULT_TALLY_SLOTS));

  const slots = Number.parseInt(slotsText, 10);
  const slotsValid = boardType === 'calendar' || (Number.isFinite(slots) && slots > 0);
  const canSave = name.trim().length > 0 && slotsValid;

  async function save() {
    await createGoal({
      name: name.trim(),
      boardType,
      totalSlots: boardType === 'tally' ? slots : null,
    });
    router.back();
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.label}>무엇을 쌓을까요?</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="예: 매일 30분 독서"
        placeholderTextColor={tokens.color.inkSoft}
      />

      <Text style={styles.label}>판 모양</Text>
      <View style={styles.row}>
        {(['calendar', 'tally'] as const).map((t) => (
          <Pressable
            key={t}
            style={[styles.choice, boardType === t && styles.choiceOn]}
            onPress={() => setBoardType(t)}
          >
            <Text style={[styles.choiceText, boardType === t && styles.choiceTextOn]}>
              {t === 'calendar' ? '달력' : '적립판'}
            </Text>
            <Text style={styles.choiceHint}>
              {t === 'calendar' ? '날짜 칸에 하나씩' : '정해둔 칸을 순서대로'}
            </Text>
          </Pressable>
        ))}
      </View>

      {boardType === 'tally' && (
        <>
          <Text style={styles.label}>몇 칸짜리로 할까요?</Text>
          <TextInput
            style={styles.input}
            value={slotsText}
            onChangeText={setSlotsText}
            keyboardType="number-pad"
          />
          {!slotsValid && <Text style={styles.error}>1 이상의 숫자를 넣어주세요.</Text>}
        </>
      )}

      <Pressable
        style={[styles.save, !canSave && styles.saveOff]}
        disabled={!canSave}
        onPress={save}
      >
        <Text style={styles.saveText}>판 만들기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: tokens.space(4), gap: tokens.space(2), backgroundColor: tokens.color.paper },
  label: { fontSize: tokens.font.caption, color: tokens.color.inkSoft, marginTop: tokens.space(2) },
  input: {
    borderWidth: 1, borderColor: tokens.color.slotLine, borderRadius: tokens.radius.card,
    padding: tokens.space(3), fontSize: tokens.font.body, color: tokens.color.ink,
    backgroundColor: '#FFFFFF',
  },
  row: { flexDirection: 'row', gap: tokens.space(2) },
  choice: {
    flex: 1, padding: tokens.space(3), borderRadius: tokens.radius.card,
    borderWidth: 1, borderColor: tokens.color.slotLine, backgroundColor: '#FFFFFF',
    gap: tokens.space(1),
  },
  choiceOn: { borderColor: tokens.color.accent, borderWidth: 2 },
  choiceText: { fontSize: tokens.font.body, color: tokens.color.ink, fontWeight: '600' },
  choiceTextOn: { color: tokens.color.accent },
  choiceHint: { fontSize: tokens.font.caption, color: tokens.color.inkSoft },
  error: { fontSize: tokens.font.caption, color: tokens.color.accent },
  save: {
    marginTop: 'auto', padding: tokens.space(4), borderRadius: tokens.radius.card,
    backgroundColor: tokens.color.accent, alignItems: 'center',
  },
  saveOff: { opacity: 0.4 },
  saveText: { color: '#FFFFFF', fontSize: tokens.font.body, fontWeight: '600' },
});
```

- [ ] **Step 2: 생성 동작 확인**

Run: `npx expo start`
Expected: "새 목표 만들기" → 이름 입력 → 판 모양 선택 → 저장 시 홈으로 돌아가고 목록에 카드가 보인다

- [ ] **Step 3: 커밋**

```bash
git add app/goal/new.tsx
git commit -m "feat: add goal creation screen with board type choice"
```

---

### Task 9: 스티커 컴포넌트와 슬롯

스티커를 붙이는 순간의 촉각·시각 피드백이 이 제품의 핵심 미식이다. 모션과 햅틱을 여기서 함께 처리한다.

**Files:**
- Create: `src/components/Sticker.tsx`
- Create: `src/components/StickerSlot.tsx`

**Interfaces:**
- Consumes: `tokens` (Task 1)
- Produces:
  - `<Sticker size={number} justPlaced={boolean} />`
  - `<StickerSlot slot={Slot} size={number} hasRecord={boolean} justPlaced={boolean} onPress={() => void} />`

- [ ] **Step 1: 스티커 비주얼 작성**

`src/components/Sticker.tsx`:

```tsx
import { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring,
} from 'react-native-reanimated';
import { tokens } from '../theme/tokens';

type Props = { size: number; justPlaced: boolean };

export function Sticker({ size, justPlaced }: Props) {
  const scale = useSharedValue(justPlaced ? 0.4 : 1);

  useEffect(() => {
    if (justPlaced) {
      scale.value = withSequence(
        withTiming(1.18, { duration: 140 }),
        withSpring(1, { damping: 9, stiffness: 180 }),
      );
    }
  }, [justPlaced, scale]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        styles.sticker,
        { width: size, height: size, borderRadius: size / 2 },
        animStyle,
      ]}
    >
      <Text style={[styles.label, { fontSize: size * 0.24 }]}>참{'\n'}잘했어요</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sticker: {
    backgroundColor: tokens.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: undefined,
  },
});
```

- [ ] **Step 2: 슬롯 컴포넌트 작성**

`src/components/StickerSlot.tsx`:

```tsx
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Sticker } from './Sticker';
import { tokens } from '../theme/tokens';
import type { Slot } from '../domain/types';

type Props = {
  slot: Slot;
  size: number;
  hasRecord: boolean;
  justPlaced: boolean;
  onPress: () => void;
};

export function StickerSlot({ slot, size, hasRecord, justPlaced, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.wrap, { width: size, height: size }]}>
      {slot.sticker ? (
        <>
          <Sticker size={size} justPlaced={justPlaced} />
          {hasRecord && <View style={styles.dot} />}
        </>
      ) : (
        <View style={[styles.empty, { borderRadius: size / 2 }]}>
          <Text style={styles.emptyLabel}>{slot.label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  empty: {
    width: '100%', height: '100%',
    borderWidth: 1, borderStyle: 'dashed', borderColor: tokens.color.slotLine,
    backgroundColor: tokens.color.slotEmpty,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyLabel: { fontSize: tokens.font.caption, color: tokens.color.inkSoft },
  dot: {
    position: 'absolute', right: 2, bottom: 2,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: tokens.color.ink,
    borderWidth: 1, borderColor: '#FFFFFF',
  },
});
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/Sticker.tsx src/components/StickerSlot.tsx
git commit -m "feat: add sticker visual with place animation and slot component"
```

---

### Task 10: 판 화면 (두 타입 렌더링 + 스티커 붙이기)

**Files:**
- Create: `src/components/CalendarBoard.tsx`
- Create: `src/components/TallyBoard.tsx`
- Create: `app/goal/[id].tsx`

**Interfaces:**
- Consumes: `buildSlots()`, `nextSlotIndex()` (Task 2), `getGoal()` (Task 4), `listStickers()`, `placeSticker()` (Task 5), `listRecordedStickerIds()` (Task 6), `StickerSlot` (Task 9)
- Produces:
  - `<CalendarBoard slots={Slot[]} recordedIds={Set<string>} justPlacedId={string|null} onSlotPress={(slot: Slot) => void} />`
  - `<TallyBoard slots={Slot[]} recordedIds={Set<string>} justPlacedId={string|null} onSlotPress={(slot: Slot) => void} />`

- [ ] **Step 1: 적립판 작성**

`src/components/TallyBoard.tsx`:

```tsx
import { View, StyleSheet } from 'react-native';
import { StickerSlot } from './StickerSlot';
import { tokens } from '../theme/tokens';
import type { Slot } from '../domain/types';

const COLUMNS = 5;
const SLOT_SIZE = 56;

type Props = {
  slots: Slot[];
  recordedIds: Set<string>;
  justPlacedId: string | null;
  onSlotPress: (slot: Slot) => void;
};

export function TallyBoard({ slots, recordedIds, justPlacedId, onSlotPress }: Props) {
  return (
    <View style={styles.grid}>
      {slots.map((slot) => (
        <StickerSlot
          key={slot.index}
          slot={slot}
          size={SLOT_SIZE}
          hasRecord={slot.sticker ? recordedIds.has(slot.sticker.id) : false}
          justPlaced={slot.sticker?.id === justPlacedId}
          onPress={() => onSlotPress(slot)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space(3),
    justifyContent: 'flex-start',
    maxWidth: COLUMNS * (SLOT_SIZE + tokens.space(3)),
    alignSelf: 'center',
  },
});
```

- [ ] **Step 2: 달력판 작성**

`src/components/CalendarBoard.tsx`:

```tsx
import { Text, View, StyleSheet } from 'react-native';
import { StickerSlot } from './StickerSlot';
import { tokens } from '../theme/tokens';
import type { Slot } from '../domain/types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const SLOT_SIZE = 40;

type Props = {
  slots: Slot[];
  recordedIds: Set<string>;
  justPlacedId: string | null;
  onSlotPress: (slot: Slot) => void;
  monthStartWeekday: number; // 0=일요일
};

export function CalendarBoard({
  slots, recordedIds, justPlacedId, onSlotPress, monthStartWeekday,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.week}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.weekday}>{w}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {Array.from({ length: monthStartWeekday }, (_, i) => (
          <View key={`pad-${i}`} style={{ width: SLOT_SIZE, height: SLOT_SIZE }} />
        ))}
        {slots.map((slot) => (
          <StickerSlot
            key={slot.index}
            slot={slot}
            size={SLOT_SIZE}
            hasRecord={slot.sticker ? recordedIds.has(slot.sticker.id) : false}
            justPlaced={slot.sticker?.id === justPlacedId}
            onPress={() => onSlotPress(slot)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space(2), alignSelf: 'center' },
  week: { flexDirection: 'row', gap: tokens.space(2) },
  weekday: {
    width: SLOT_SIZE, textAlign: 'center',
    fontSize: tokens.font.caption, color: tokens.color.inkSoft,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space(2), width: 7 * (SLOT_SIZE + tokens.space(2)) },
});
```

- [ ] **Step 3: 판 화면 작성**

`app/goal/[id].tsx`:

```tsx
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getGoal } from '../../src/repositories/goalRepository';
import { listStickers, placeSticker } from '../../src/repositories/stickerRepository';
import { listRecordedStickerIds } from '../../src/repositories/recordRepository';
import { buildSlots, nextSlotIndex } from '../../src/domain/slots';
import { CalendarBoard } from '../../src/components/CalendarBoard';
import { TallyBoard } from '../../src/components/TallyBoard';
import { tokens } from '../../src/theme/tokens';
import type { Goal, Slot, Sticker } from '../../src/domain/types';

export default function BoardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [recordedIds, setRecordedIds] = useState<Set<string>>(new Set());
  const [justPlacedId, setJustPlacedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const g = await getGoal(id);
    setGoal(g);
    if (g) {
      navigation.setOptions({ title: g.name });
      setStickers(await listStickers(g.id));
      setRecordedIds(await listRecordedStickerIds(g.id));
    }
  }, [id, navigation]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!goal) return <View style={styles.screen} />;

  const now = new Date();
  const slots = buildSlots(goal, stickers, now);
  const filled = slots.filter((s) => s.sticker !== null).length;
  const nextIdx = nextSlotIndex(goal, stickers, now);
  const monthStartWeekday = new Date(now.getFullYear(), now.getMonth(), 1).getDay();

  async function onSlotPress(slot: Slot) {
    if (slot.sticker) {
      router.push(`/sticker/${slot.sticker.id}`);
      return;
    }
    if (goal.boardType === 'calendar' && slot.index !== nextIdx) return; // 오늘 칸만
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const placed = await placeSticker(goal.id, slot.index);
    setJustPlacedId(placed.id);
    setStickers((prev) => [...prev, placed]);
  }

  async function placeNext() {
    if (nextIdx === null) return;
    await onSlotPress(slots[nextIdx]);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.progress}>{filled} / {slots.length}</Text>
        {goal.boardType === 'calendar' ? (
          <CalendarBoard
            slots={slots}
            recordedIds={recordedIds}
            justPlacedId={justPlacedId}
            onSlotPress={onSlotPress}
            monthStartWeekday={monthStartWeekday}
          />
        ) : (
          <TallyBoard
            slots={slots}
            recordedIds={recordedIds}
            justPlacedId={justPlacedId}
            onSlotPress={onSlotPress}
          />
        )}
      </ScrollView>

      <Pressable
        style={[styles.place, nextIdx === null && styles.placeOff]}
        disabled={nextIdx === null}
        onPress={placeNext}
      >
        <Text style={styles.placeText}>
          {nextIdx === null
            ? goal.boardType === 'calendar' ? '오늘은 붙였어요' : '판을 다 채웠어요'
            : '스티커 붙이기'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.paper },
  body: { padding: tokens.space(4), gap: tokens.space(4), alignItems: 'center' },
  progress: { fontSize: tokens.font.title, color: tokens.color.ink, fontWeight: '600' },
  place: {
    margin: tokens.space(4), padding: tokens.space(4),
    borderRadius: tokens.radius.card, backgroundColor: tokens.color.accent,
    alignItems: 'center',
  },
  placeOff: { opacity: 0.4 },
  placeText: { color: '#FFFFFF', fontSize: tokens.font.body, fontWeight: '600' },
});
```

- [ ] **Step 4: 두 판 타입 동작 확인**

Run: `npx expo start`
Expected:
- 적립판 목표: "스티커 붙이기"를 누르면 첫 칸부터 순서대로 채워지고 햅틱이 울린다
- 달력판 목표: 오늘 날짜 칸에만 붙고, 한 번 붙이면 버튼이 "오늘은 붙였어요"로 바뀐다
- 붙는 순간 스티커가 튀어나오는 모션이 보인다

- [ ] **Step 5: 커밋**

```bash
git add src/components/CalendarBoard.tsx src/components/TallyBoard.tsx app/goal/\[id\].tsx
git commit -m "feat: add board screen rendering both types with haptic sticker placement"
```

---

### Task 11: 스티커 상세 — 기록 첨부와 스티커 떼기

**Files:**
- Create: `app/sticker/[id].tsx`
- Modify: `app/_layout.tsx` (스택에 스티커 화면 등록)

**Interfaces:**
- Consumes: `getSticker()`, `removeSticker()` (Task 5), `getRecord()`, `upsertRecord()` (Task 6)
- Produces: 없음 (화면 종단)

- [ ] **Step 1: 스티커 상세 화면 작성**

`app/sticker/[id].tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getSticker, removeSticker } from '../../src/repositories/stickerRepository';
import { getRecord, upsertRecord } from '../../src/repositories/recordRepository';
import { tokens } from '../../src/theme/tokens';

export default function StickerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [placedAt, setPlacedAt] = useState<number | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [memo, setMemo] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    const s = await getSticker(id);
    if (!s) { router.back(); return; }
    setPlacedAt(s.placedAt);
    const r = await getRecord(id);
    setPhotoUri(r?.photoUri ?? null);
    setMemo(r?.memo ?? '');
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('사진 권한이 필요해요', '설정에서 사진 접근을 허용해주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function save() {
    if (!id) return;
    await upsertRecord(id, {
      photoUri,
      memo: memo.trim().length > 0 ? memo.trim() : null,
    });
    router.back();
  }

  function confirmRemove() {
    Alert.alert('스티커를 뗄까요?', '붙어있던 기록도 함께 사라집니다.', [
      { text: '그대로 둘게요', style: 'cancel' },
      {
        text: '뗄게요',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          await removeSticker(id);
          router.back();
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      {placedAt && (
        <Text style={styles.date}>
          {new Date(placedAt).toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'long', day: 'numeric',
          })}
        </Text>
      )}

      {photoUri ? (
        <Pressable onPress={pickPhoto}>
          <Image source={{ uri: photoUri }} style={styles.photo} />
        </Pressable>
      ) : (
        <Pressable style={styles.photoEmpty} onPress={pickPhoto}>
          <Text style={styles.photoEmptyText}>사진 더하기 (선택)</Text>
        </Pressable>
      )}

      <TextInput
        style={styles.memo}
        value={memo}
        onChangeText={setMemo}
        placeholder="한 줄 남겨두기 (선택)"
        placeholderTextColor={tokens.color.inkSoft}
        multiline
      />

      <Pressable style={styles.save} onPress={save}>
        <Text style={styles.saveText}>저장</Text>
      </Pressable>

      <Pressable style={styles.remove} onPress={confirmRemove}>
        <Text style={styles.removeText}>스티커 떼기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: tokens.space(4), gap: tokens.space(3), backgroundColor: tokens.color.paper },
  date: { fontSize: tokens.font.caption, color: tokens.color.inkSoft },
  photo: { width: '100%', aspectRatio: 1, borderRadius: tokens.radius.card },
  photoEmpty: {
    width: '100%', aspectRatio: 1, borderRadius: tokens.radius.card,
    borderWidth: 1, borderStyle: 'dashed', borderColor: tokens.color.slotLine,
    alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.color.slotEmpty,
  },
  photoEmptyText: { color: tokens.color.inkSoft, fontSize: tokens.font.body },
  memo: {
    minHeight: 80, borderWidth: 1, borderColor: tokens.color.slotLine,
    borderRadius: tokens.radius.card, padding: tokens.space(3),
    fontSize: tokens.font.body, color: tokens.color.ink, backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
  },
  save: {
    padding: tokens.space(4), borderRadius: tokens.radius.card,
    backgroundColor: tokens.color.accent, alignItems: 'center',
  },
  saveText: { color: '#FFFFFF', fontSize: tokens.font.body, fontWeight: '600' },
  remove: { padding: tokens.space(3), alignItems: 'center' },
  removeText: { color: tokens.color.inkSoft, fontSize: tokens.font.caption },
});
```

- [ ] **Step 2: 스택에 화면 등록**

`app/_layout.tsx`의 `<Stack>` 안에 추가:

```tsx
<Stack.Screen name="sticker/[id]" options={{ title: '기록' }} />
```

- [ ] **Step 3: 전체 흐름 확인**

Run: `npx expo start`
Expected:
- 붙인 스티커를 탭하면 기록 화면이 열린다
- 사진·메모 없이 저장해도 에러가 없다
- 메모만 저장하면 판에서 해당 스티커에 점 표시가 생긴다
- "스티커 떼기"를 누르면 확인 후 판에서 사라지고 빈칸으로 돌아간다

- [ ] **Step 4: 전체 테스트 실행**

Run: `npm test`
Expected: PASS — Task 2/4/5/6의 26개 테스트 전부 통과

- [ ] **Step 5: 커밋**

```bash
git add app/sticker/\[id\].tsx app/_layout.tsx
git commit -m "feat: add sticker detail with optional photo and memo record"
```

---

## Self-Review

**1. 스펙 인수 기준 대조**

| 인수 기준 | 담당 태스크 |
|---|---|
| 목표 생성 시 이름·판 타입 지정 | Task 8 |
| tally는 총 칸 수 지정 | Task 8 |
| 스티커 붙이기·떼기 | Task 10 (붙이기) / Task 11 (떼기) |
| calendar 판은 날짜 그리드, 안 붙인 날은 빈칸 | Task 2 + Task 10 |
| tally 판은 순차 채움 + 진행 표시 | Task 2 + Task 10 |
| 사진·메모 첨부 가능, 없어도 정상 동작 | Task 6 (테스트로 고정) + Task 11 |
| 기록 있는 스티커는 시각 구분 + 탭하면 기록 | Task 6 (`listRecordedStickerIds`) + Task 9 (점 표시) + Task 11 |
| 재설치·기기 이전 후 복원 | **Plan B** (이 계획 범위 밖) |
| 최초 실행 시 빈 화면 아님 | Task 7 |
| 붙이는 순간 햅틱 + 모션 | Task 9 (모션) + Task 10 (햅틱) |

**갭:** "재설치·기기 이전 후 복원"은 Plan B로 분리됨. 나머지 9개는 전부 태스크에 배정됨.

**2. 플레이스홀더 점검**

모든 코드 스텝에 실행 가능한 전체 코드가 들어있다. "TODO", "적절히 처리", "Task N과 유사" 표현 없음. 확인 완료.

**3. 타입 일관성 점검**

- `Goal.boardType` — Task 2 정의, Task 4/7/8/10에서 동일 사용 ✓
- `Goal.totalSlots: number | null` — calendar일 때 null, Task 4의 `createGoal`이 강제 ✓
- `buildSlots(goal, stickers, now)` — Task 2 정의, Task 7/10에서 동일 시그니처 ✓
- `nextSlotIndex(goal, stickers, now)` — Task 2 정의, Task 10에서 사용 ✓
- `listRecordedStickerIds(goalId): Promise<Set<string>>` — Task 6 정의, Task 10에서 `Set`으로 수신 ✓
- `upsertRecord(stickerId, { photoUri, memo })` — Task 6 정의, Task 11에서 동일 ✓
- `Slot.label: string` — Task 2에서 문자열, Task 9에서 `<Text>` 자식으로 사용 ✓

**주의 사항 (구현자에게):** `StickerSlot`은 `Slot`과 `hasRecord`를 분리해서 받는다. `Slot`에는 기록 여부가 없다 — 기록은 별도 테이블이고 판 조회와 별개로 가져오기 때문이다.

---

## Plan B 예고 (이 계획 범위 밖)

Plan A 완료 후 별도 계획으로 진행한다:
- 계정 (익명 시작 → 나중에 연결)
- 리포지토리 3종을 원격 구현체로 교체 (인터페이스는 Plan A에서 이미 고정)
- 사진 업로드 (현재는 기기 로컬 URI)
- 충돌 해소 정책

---
**Status: pending approval**
