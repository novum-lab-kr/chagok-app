# 입력 글자 수 앱 연결 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2026-10-08 확정한 입력 글자 수 규칙(목표 이름 20자 · 메모 500자, 넘으면 입력 안 됨, 입력칸 아래 문구)을 앱의 새 목표·목표 설정·기록 화면에 연결한다.

**Architecture:** 규칙과 문구는 이미 `src/domain/board.ts`(`GOAL_NAME_MAX`·`MEMO_MAX`·`goalNameError`·`memoError`)에 있고, 화면 컴포넌트는 이미 `nameMaxLength`·`nameError`·`memoMaxLength`·`memoError`를 받는다(main `f5186f9`). 이 계획은 ① 「새 목표에서 빈 이름 문구를 언제 보일지」를 도메인 함수 하나로 정하고 ② 새 목표 화면에 이름 칸 `onNameBlur`를 더한 뒤 ③ 앱 라우트 세 곳에서 그 값을 넘긴다. 저장 규칙(앞뒤 띄어쓰기 지우기, 빈 메모는 `null`)은 지금 그대로다.

**Tech Stack:** Expo 57 / React Native 0.86, Expo Router, jest + ts-jest(도메인), vitest + @testing-library/react(컴포넌트), iPhone 16 Pro 시뮬레이터 개발 빌드 + Maestro(동작 확인).

**Spec:** 확정 시안 https://claude.ai/artifact/QVc5DXniHXwiTZcFjNHvzV (A안, 기록 `docs/design/proposals-2026-10/README.md` 「입력 글자 수」 줄), Storybook `Flows/입력 검사`·`Rules/입력 검사`(`stories/InputValidation.stories.tsx`) — 앱은 이 스토리들과 같은 화면이 되어야 한다.

## Global Constraints

- 작업 위치: worktree `/Users/eunjukim/Desktop/workspace/chagok-wt-input-app`, 브랜치 `feat/input-validation-app`. main 작업 트리(`chagok-app`)에는 쓰지 않는다.
- 목표 이름 최대 20자, 메모 최대 500자. 띄어쓰기도 한 글자. 글자 수는 RN `maxLength`와 같은 `string.length`로 센다.
- 최대 글자 수가 되면 더 입력되지 않는다(`maxLength`). 한도에 닿으면 「20자까지 입력할 수 있어요.」/「500자까지 입력할 수 있어요.」.
- 이름이 비었거나 띄어쓰기만 있으면 「목표 이름을 입력해주세요.」. 새 목표 화면을 처음 열었을 때는 보이지 않고, 이름을 썼다가 지웠거나 이름 칸을 눌렀다가 비운 채 나왔을 때 보인다.
- 글자 수(예: 17/20)는 보여 주지 않는다(A안).
- 메모는 비워도 된다. 「비었어요」 문구는 없다. 띄어쓰기만 적은 메모는 빈 메모(`null`)로 저장한다(지금 동작).
- 문구는 위 그대로 한 글자도 바꾸지 않는다. 문구의 출처는 `src/domain/board.ts` 하나다 — 라우트에 문자열을 다시 쓰지 않는다.
- 이미 저장된 긴 이름·메모는 저장을 막지 않는다. 문구만 보인다.
- 디자인 시스템 기존 값(토큰·프레임·팔레트)은 바꾸지 않는다. 새 의존성 없음.
- 코드 스타일은 주변 파일을 따른다(디자인 시스템은 압축형, `app/`은 일반 TS 서식).
- 커밋은 사용자가 앱에서 확인한 뒤에만 한다. 각 Task의 「커밋」 단계는 사용자 확인 뒤 실행한다. push는 하지 않는다.
- 화면 구조와 이동 경로는 바뀌지 않으므로 화면 흐름도는 고치지 않는다(상태는 `f5186f9`에서 이미 넣음).

## Review Focus

1. **한글 조합 중 20번째 글자** — iOS 한글 키보드는 글자를 조합하는 동안 `maxLength`와 부딪쳐 마지막 글자가 깨지거나 한 글자 넘게 들어갈 수 있다(RN에서 알려진 문제). 20번째 글자를 「ㅁ→마→말」로 조합해도 「말」로 끝나고 21번째는 안 들어가야 한다. Task 5 시뮬레이터 확인. 문제가 보이면 그 자리에서 멈추고 사용자에게 알린다(임의로 우회 구현하지 않는다).
2. **이미 한도를 넘은 이름·메모**(개발 데이터, 규칙 전에 만든 목표) — 화면이 열리고, 한도 문구가 보이고, [저장하기]·[저장]은 막히지 않으며, 지우면 줄어든다. Task 1 테스트(`'가'.repeat(25)`) + Task 4 확인.
3. **긴 글 붙여넣기** — 한도까지만 들어간다(`maxLength`가 자른다). Task 5 시뮬레이터 확인.
4. **새 목표 화면 처음 열기** — 문구가 없고 [만들기]만 흐리다. Task 1 테스트.
5. **이름 칸을 눌렀다가 아무것도 안 쓰고 나오기** — 그때 「목표 이름을 입력해주세요.」가 나온다. Task 1(`touched`) + Task 2(`onNameBlur`) 테스트.

---

## 파일 구조

| 파일 | 바꾸는 것 |
| --- | --- |
| `src/domain/board.ts` | `shownGoalNameError(name, touched)` 추가 |
| `__tests__/board.test.ts` | 위 함수 테스트 |
| `src/design-system/board-screens.tsx` | `NewGoalScreen`에 `onNameBlur` |
| `src/design-system/compositions.test.tsx` | 이름·메모 문구, `maxLength`, `onNameBlur` 테스트 |
| `app/goal/new.tsx` | 이름 한도·문구 연결, 빈 이름 문구 시점 |
| `app/goal/[id]/settings.tsx` | 이름 한도·문구 연결 |
| `app/sticker/[id].tsx` | 메모 한도·문구 연결 |
| `docs/PRD.md`, `docs/HANDOFF.md` | 확정 기록, 남은 결정 목록에서 빼기 |

---

### Task 1: 새 목표에서 이름 문구를 보일 때

**Files:**
- Modify: `src/domain/board.ts` (`memoError` 아래)
- Test: `__tests__/board.test.ts` (「입력 글자 수 (2026-10-08)」 describe 안)

**Interfaces:**
- Consumes: `goalNameError(name: string): string | undefined` (이미 있음)
- Produces: `shownGoalNameError(name: string, touched: boolean): string | undefined`

- [ ] **Step 1: 실패하는 테스트 쓰기** — import 줄에 `shownGoalNameError`를 더하고 describe 안에:

```ts
  test('새 목표: 처음 연 빈 칸에는 문구가 없고, 건드린 뒤 비면 보인다', () => {
    expect(shownGoalNameError('', false)).toBeUndefined();
    expect(shownGoalNameError('', true)).toBe('목표 이름을 입력해주세요.');
    expect(shownGoalNameError('   ', false)).toBe('목표 이름을 입력해주세요.');
    expect(shownGoalNameError('책 읽기', false)).toBeUndefined();
  });
  test('한도를 넘은 이름(예전에 저장된 값)도 한도 문구를 보인다', () => {
    expect(goalNameError('가'.repeat(25))).toBe('20자까지 입력할 수 있어요.');
    expect(shownGoalNameError('가'.repeat(25), false)).toBe('20자까지 입력할 수 있어요.');
  });
```

- [ ] **Step 2: 실패 확인** — `npx jest __tests__/board.test.ts` → `shownGoalNameError` 없음으로 FAIL.

- [ ] **Step 3: 구현** — `memoError` 아래에:

```ts
/**
 * 새 목표의 이름 문구. 처음 연 빈 칸에는 보이지 않고, 이름을 썼다가 지웠거나
 * 칸을 눌렀다가 비운 채 나왔을 때(touched) 보인다. 띄어쓰기만 있으면 바로 보인다.
 */
export function shownGoalNameError(name: string, touched: boolean): string | undefined {
  return name === '' && !touched ? undefined : goalNameError(name);
}
```

- [ ] **Step 4: 통과 확인** — `npx jest __tests__/board.test.ts` → PASS.

- [ ] **Step 5: 커밋**(사용자 확인 뒤) — `git add src/domain/board.ts __tests__/board.test.ts && git commit -m "feat(input): when the new-goal name message shows"`

---

### Task 2: 새 목표 이름 칸 `onNameBlur`, 화면 문구 테스트

**Files:**
- Modify: `src/design-system/board-screens.tsx` (`NewGoalScreen`)
- Test: `src/design-system/compositions.test.tsx`

**Interfaces:**
- Produces: `NewGoalScreen` prop `onNameBlur?: () => void` — 이름 칸에서 포커스가 빠질 때 부른다.
- 이미 있음: `NewGoalScreen`·`GoalSettingsScreen`의 `nameMaxLength?: number`·`nameError?: string`, `RecordScreen`의 `memoMaxLength?: number`·`memoError?: string`.

- [ ] **Step 1: 실패하는 테스트 쓰기** — `describe('화면 구성 컴포넌트')` 안에. 위쪽 `import {GoalStickerCell,exampleGoals} from './screen-compositions';`에 `RecordScreen`을 더한다.

```tsx
  it('새 목표: 이름 칸은 한도와 문구를 받고, 칸에서 나오면 알린다',()=>{
    const blur=vi.fn();
    render(<NewGoalScreen name="" onChangeName={vi.fn()} nameMaxLength={20} nameError="목표 이름을 입력해주세요." onNameBlur={blur} kind="tally" onChangeKind={vi.fn()} count="15" onChangeCount={vi.fn()} sticker="sprout" onChangeSticker={vi.fn()} endMode="none" onChangeEndMode={vi.fn()} onChangeEndDate={vi.fn()} today="2026-10-08" todayLabel="10월 8일" onSubmit={vi.fn()} onBack={()=>{}}/>);
    const input=screen.getByRole('textbox',{name:'목표 이름'});
    expect(input.getAttribute('maxlength')).toBe('20');
    expect(screen.getByRole('alert').textContent).toBe('목표 이름을 입력해주세요.');
    fireEvent.focus(input);fireEvent.blur(input);expect(blur).toHaveBeenCalledTimes(1);
  });
  it('기록: 메모 칸은 한도와 문구를 받는다',()=>{
    render(<RecordScreen goal={exampleGoals[0]} date="2026년 10월 8일" initialMemo="" memoMaxLength={500} memoError="500자까지 입력할 수 있어요." onChoosePhoto={()=>{}} onRemovePhoto={()=>{}} onBack={()=>{}} onSave={()=>{}} onRemoveSticker={()=>{}}/>);
    expect(screen.getByRole('textbox',{name:'메모'}).getAttribute('maxlength')).toBe('500');
    expect(screen.getByRole('alert').textContent).toBe('500자까지 입력할 수 있어요.');
  });
```

- [ ] **Step 2: 실패 확인** — `npm run test:components` → 첫 테스트가 `blur` 0회로 FAIL(`npm run typecheck`는 `onNameBlur` 없음으로 실패). 두 번째는 이미 통과할 수 있다 — 연결을 고정하는 테스트다.

- [ ] **Step 3: 구현** — `board-screens.tsx`의 `NewGoalScreen`:
  - 구조 분해: `export function NewGoalScreen({name,onChangeName,nameMaxLength,nameError,onNameBlur,`
  - 타입: `nameError?:string;` 뒤에 `/** 이름 칸에서 나올 때: 빈 이름 문구를 보일지 정한다 */onNameBlur?:()=>void;`
  - 이름 칸: `<PixelInput label="목표 이름" value={name} onChangeText={onChangeName} placeholder="목표 이름" maxLength={nameMaxLength} error={nameError} onBlur={onNameBlur}/>` (`PixelInput`은 `onBlur`를 받아 포커스 테두리를 끈 뒤 부른다.)

- [ ] **Step 4: 통과 확인** — `npm run test:components` → PASS, `npm run typecheck` → 오류 없음.

- [ ] **Step 5: 커밋**(사용자 확인 뒤) — `git add src/design-system/board-screens.tsx src/design-system/compositions.test.tsx && git commit -m "feat(input): new-goal name blur callback; pin field messages in component tests"`

---

### Task 3: 새 목표 화면 연결

**Files:**
- Modify: `app/goal/new.tsx`

**Interfaces:**
- Consumes: `GOAL_NAME_MAX`, `shownGoalNameError` (Task 1), `NewGoalScreen`의 `nameMaxLength`·`nameError`·`onNameBlur` (Task 2)

- [ ] **Step 1: import** — `import { GOAL_NAME_MAX, shownGoalNameError } from '../../src/domain/board';`

- [ ] **Step 2: 건드림 상태** — `const [name, setName] = useState('');` 아래에:

```ts
  /** 이름을 썼다가 지웠거나 칸에서 비운 채 나왔으면 빈 이름 문구를 보인다 (2026-10-08). */
  const [nameTouched, setNameTouched] = useState(false);
```

- [ ] **Step 3: 화면에 넘기기** — `NewGoalScreen`의 `name={name} onChangeName={setName}` 줄을:

```tsx
        name={name}
        onChangeName={(next) => { setName(next); if (next !== '') setNameTouched(true); }}
        nameMaxLength={GOAL_NAME_MAX}
        nameError={shownGoalNameError(name, nameTouched)}
        onNameBlur={() => setNameTouched(true)}
```

  `valid`·`submitDisabled`·`dirty`·`submit`은 그대로 둔다(빈 이름이면 이미 [만들기]가 흐리다, 저장은 `name.trim()`).

- [ ] **Step 4: 확인** — `npm run typecheck`, `npm run lint` → 이 파일 오류·경고 없음.

- [ ] **Step 5: 커밋**(사용자 확인 뒤) — `git add app/goal/new.tsx && git commit -m "feat(input): wire name limit and messages into new goal"`

---

### Task 4: 목표 설정·기록 화면 연결

**Files:**
- Modify: `app/goal/[id]/settings.tsx`
- Modify: `app/sticker/[id].tsx`

**Interfaces:**
- Consumes: `GOAL_NAME_MAX`, `goalNameError`, `MEMO_MAX`, `memoError` (`src/domain/board.ts`), `GoalSettingsScreen`의 `nameMaxLength`·`nameError`, `RecordScreen`의 `memoMaxLength`·`memoError`

- [ ] **Step 1: 목표 설정** — `settings.tsx`의 `src/domain/board` import에 `GOAL_NAME_MAX, goalNameError`를 더하고, 진행 중 판의 `GoalSettingsScreen`에서 `onChangeName={setName}` 뒤에:

```tsx
        nameMaxLength={GOAL_NAME_MAX}
        nameError={goalNameError(name)}
```

  목표 설정은 저장된 이름으로 열리므로 처음부터 문구 규칙을 그대로 쓴다(건드림 상태 없음). `saveDisabled`는 그대로 둔다 — 한도 문구는 저장을 막지 않는다(Review Focus 2). 완성한 판 화면(`CompletedGoalSettingsScreen`)은 입력칸이 없으니 건드리지 않는다.

- [ ] **Step 2: 기록** — `app/sticker/[id].tsx`에 `MEMO_MAX, memoError`를 `src/domain/board`에서 가져오고(이미 board import가 있으면 거기에 더한다), `RecordScreen`에서 `onMemoChange={setDraftMemo}` 뒤에:

```tsx
        memoMaxLength={MEMO_MAX}
        memoError={memoError(draftMemo)}
```

  `save`의 빈 메모 처리(`trim` 뒤 비면 `null`)는 그대로다. 완성한 판의 기록(읽기 전용)도 같은 화면이라 긴 예전 메모면 문구가 보인다 — 고칠 수 없는 칸이니 문제없다.

- [ ] **Step 3: 확인** — `npm run typecheck`, `npm run lint` → 두 파일 오류·경고 없음.

- [ ] **Step 4: 커밋**(사용자 확인 뒤) — `git add "app/goal/[id]/settings.tsx" "app/sticker/[id].tsx" && git commit -m "feat(input): wire name and memo limits into goal settings and record"`

---

### Task 5: 전체 검사와 시뮬레이터 확인

**Files:** 없음(확인만)

- [ ] **Step 1: 자동 검사** — 모두 통과해야 한다.

```sh
npm test
npm run test:components
npm run typecheck
npm run lint
npx expo export --platform ios --output-dir /tmp/check-input-app && rm -rf /tmp/check-input-app
```

  worktree에 `node_modules`가 없으면 먼저 `npm ci` 후 `npm ls react-dom --all`이 `19.2.3` 하나인지 본다. main의 node_modules를 링크하지 않는다(`expo-widgets`가 빠져 있다).

- [ ] **Step 2: 시뮬레이터에서 동작 확인** — iPhone 16 Pro 시뮬레이터 개발 빌드([DEV-SETUP](../../DEV-SETUP.md) 「개발 빌드」, JS만 바뀌었으니 Metro만 이 worktree에서 띄우면 된다). 확인할 것과 기대:
  1. 새 목표를 처음 열면 이름 칸 아래 문구가 없다. 이름 칸을 눌렀다가 아무것도 안 쓰고 다른 곳을 누르면 「목표 이름을 입력해주세요.」.
  2. `매일 아침 일어나서 물 한 잔 마시기`(20자)를 쓰면 「20자까지 입력할 수 있어요.」, 한 글자 더 쳐도 안 들어간다.
  3. **한글 키보드로** 20번째 글자를 조합해서 끝낸다(Review Focus 1). Maestro `inputText`는 IME 조합을 거치지 않으므로, 시뮬레이터 한글 키보드를 켜고 `tapOn`으로 자판을 눌러 조합하거나 사용자에게 확인을 부탁한다.
  4. 21자 넘는 글을 붙여넣으면 20자까지만 들어간다(Review Focus 3).
  5. 목표 설정에서 이름을 모두 지우면 문구가 나오고 [저장하기]가 흐리다.
  6. 기록 메모에 500자를 붙여넣으면 500자까지만 들어가고 「500자까지 입력할 수 있어요.」.
  각 항목 스크린샷을 남겨 사용자에게 보여 준다. 실기기(iPhone 15 Pro) 확인은 사용자 지시대로 뒤로 미루고 HANDOFF 실기기 목록에 「한글 조합 한도」를 더한다.

---

### Task 6: 문서

**Files:**
- Modify: `docs/PRD.md`
- Modify: `docs/HANDOFF.md`

- [ ] **Step 1: PRD**
  - 4.4 「생성 입력」 줄 뒤에: `- 목표 이름은 20자까지 입력한다. 한도에 닿으면 이름 칸 아래에 「20자까지 입력할 수 있어요.」, 비었거나 띄어쓰기만 있으면 「목표 이름을 입력해주세요.」를 보인다(새 목표는 칸을 건드린 뒤부터). 글자 수 숫자는 보이지 않는다 (2026-10-08 확정).`
  - 4.5 기록 설명에: `- 메모는 500자까지 입력한다. 한도에 닿으면 메모 아래에 「500자까지 입력할 수 있어요.」. 비워도 된다 (2026-10-08 확정).`
  - 11절 확정 이력 표 맨 아래에: `| 2026-10-08 | 입력 글자 수 | 목표 이름 20자 · 메모 500자, 넘으면 입력 안 됨. 한도·빈 이름은 입력칸 아래 문구, 글자 수 숫자는 안 보임(시안 A). 칸 수 문구는 그대로 (4.4, 4.5) |`
  - 11절 「남은 후속 결정」의 `이름·메모 길이와 입력 오류, 날짜·시간대 처리(4.3).` 줄을 `날짜·시간대 처리(4.3). 동기화 날짜 키에 걸리므로 운영 서버보다 먼저 정한다.`로 줄인다.
- [ ] **Step 2: HANDOFF** — 0절 6번의 `입력 길이 제한·날짜/시간대 정책(PRD 11절)` 줄을 `날짜/시간대 정책(PRD 11절): 동기화 날짜 키에 걸리므로 운영 서버보다 먼저 정한다. (입력 길이는 2026-10-08 확정·연결 — 20자·500자)`로 바꾸고, 0절 8번 「후순위 — 실기기」 목록에 `- 한글 키보드로 목표 이름 20번째 글자 조합(maxLength)`을 더한다.
- [ ] **Step 3: 커밋**(사용자 확인 뒤) — `git add docs/PRD.md docs/HANDOFF.md docs/superpowers/plans/2026-10-08-input-validation-app.md && git commit -m "docs: record input length decision and app wiring"`

---

## 범위 밖 (이번에 하지 않는 것)

- 서버 컬럼 제약(`goals.name`·`records.memo` 길이 CHECK): 운영 서버를 만들 때 함께 넣는다. 참고로 Postgres `char_length`는 이모지를 1자로, 앱은 2자로 세므로 서버 제약이 앱보다 느슨해 앱 저장이 거절될 일은 없다.
- 칸 수 문구의 띄어쓰기 통일(「입력해 주세요」/「입력해주세요」): 사용자 결정 전에는 그대로 둔다.
