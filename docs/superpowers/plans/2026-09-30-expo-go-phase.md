# Expo Go 단계 구현 계획 — 약관 앱 쪽 · 백업 기기 쪽 · 위젯 스냅샷

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 개발 빌드·Docker·Apple 계정 없이 Expo Go와 jest/vitest만으로 만들고 검증할 수 있는 부분을 먼저 구현한다.
세 하위 프로젝트 각각의 "기기 쪽 기반"이다.

**Architecture:** 세 부분은 서로 독립이라 순서대로 커밋할 수 있다.
- A(약관): 앱 설정 → 약관과 라이선스 화면, 웹 문서를 앱 안 시트로 연다. 재동의 판단은 순수 함수로 만든다.
- B(백업): 스키마 v5, outbox, 저장소 기록 지점, 서버 계약(`SyncServer`)과 전송기·복원을 만든다. 테스트는 메모리 가짜 서버로 한다. 실제 Supabase 구현체와 로그인은 다음 단계다.
- C(위젯): 순수 함수 `buildWidgetSnapshot`과 Storybook 미리보기를 만든다. 네이티브 위젯은 다음 단계다.

**Tech Stack:** Expo SDK 57, expo-router, expo-sqlite, jest + ts-jest(node:sqlite 드라이버), vitest + Storybook, 새 의존성 `expo-web-browser`·`expo-network`(둘 다 Expo Go 포함)

**Spec:**
- `docs/superpowers/specs/2026-09-30-policy-terms-design.md`
- `docs/superpowers/specs/2026-09-30-account-backup-design.md`
- `docs/superpowers/specs/2026-09-30-home-widget-design.md`

**하나의 계획에 세 하위 프로젝트를 담은 이유:** 사용자 요청이 "Expo Go로 할 수 있는 것 먼저"라는 **단계** 기준이다. 세 Part는 서로 의존하지 않으므로 Part 단위로 멈추고 검토할 수 있다.

## 이 계획에 들어가지 않는 것 (다음 단계, 사용자에게 우선순위를 따로 보고)

정책 사이트(`chagok-app-policy`) 게시, 동의 화면의 앱 연결(로그인이 필요), 로그인, Supabase 서버와 `SyncServer` 실구현,
사진 리사이즈·업로드 실구현(`PhotoStore`), 전송 스케줄러의 앱 연결, 네이티브 위젯, 개발 빌드 전환.

## Global Constraints

- 코드 작성 전 Expo 57 문서를 확인한다: https://docs.expo.dev/versions/v57.0.0/
- `package.json`의 `overrides: { "react-dom": "19.2.3" }`를 유지한다. `jest-expo`는 쓰지 않는다.
- 의존성을 추가하기 전에 `package.json`·`package-lock.json`을 백업하고, 설치 후 `npm ls react-dom --all`이 `19.2.3` 하나인지 확인한다.
- `src/design-system/`의 토큰·프레임·팔레트 기존 값은 바꾸지 않는다. 컴포넌트는 추가하고 새 prop은 선택(optional)으로 둔다.
- 이미 배포된 마이그레이션 SQL(v1–v4)은 수정하지 않는다. v5를 뒤에 붙인다.
- 화면 문구는 한국어. 재촉·평가 문구 금지(PRD 2절).
- 날짜 키는 로컬 `YYYY-MM-DD`(`localDateKey`). `toISOString()` 금지.
- 정책 문서 기준 주소: `https://eunjukkkkim.github.io/chagok-app-policy` (사이트는 아직 없다. 게시 전까지 404가 정상)
- 업로드 사진 규격: 긴 변 1600px, JPEG 80% (이번 단계는 인터페이스만)
- outbox는 대상 하나당 한 줄, 로그인 여부와 무관하게 항상 기록한다. 삭제 표식은 서버에만 둔다.
- 확인·알림은 `useDialog()`(`{ask, confirm, dialog}`)를 쓴다. OS `Alert` 금지. `DialogSpec`에 `secondaryLabel`이 없으면 버튼 하나짜리 알림이다.
- 커밋은 설정 / 코드 / 문서를 섞지 않는다. 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 화면 코드를 고친 태스크는 `npx expo export --platform ios --output-dir /tmp/check && rm -rf /tmp/check`까지 돌린다.

## Review Focus

1. **전송 중 같은 대상을 다시 고침** → 새 수정이 outbox에서 지워지면 안 된다. `queued_at` 정확 일치로만 ack한다 (Task B2·B4 테스트).
2. **`upsertRecord`가 지금 트랜잭션이 아니다** → 기록 저장과 outbox가 따로 실패하면 백업이 빠진다. 트랜잭션으로 감싸고, 실패하면 둘 다 되돌려지는지 확인한다 (Task B3 테스트).
3. **사진 있는 스티커를 떼거나 목표를 지움** → 로컬 행이 사라진 뒤에도 서버 사진이 지워져야 한다. 삭제 전에 `photo` 항목을 남긴다 (Task B3·B4 테스트).
4. **위젯 달력판의 오늘과 자정** → 오늘 빈칸은 `future`, 어제 빈칸은 `missed`. 00:00과 23:59에서 같은 결과가 나와야 한다 (Task C1 테스트).
5. **적립판 묶음 경계** → 총 칸 수가 묶음 크기의 배수가 아니거나 판이 다 찼을 때 묶음이 범위를 넘으면 안 된다 (Task C1 테스트).

---

## 파일 구조

| 파일 | 책임 |
| --- | --- |
| `src/policy/versions.ts` | `versions.json` 타입, 시행 중인 판 고르기, 재동의 판단 (순수) |
| `src/policy/urls.ts` | 정책 URL 상수 |
| `src/policy/ofl-neodgm.ts`, `src/policy/licenses.ts` | 오픈소스 라이선스 목록과 본문 |
| `src/policy/openPolicy.ts` | 네트워크 확인 후 앱 안 시트로 열기 |
| `src/design-system/policy-screens.tsx` | 약관과 라이선스 목록·라이선스 상세 화면 조합 |
| `src/design-system/account-screens.tsx` | 체크 상자, 동의 화면 조합 |
| `app/policies/index.tsx`, `app/policies/[license].tsx` | 라우트 |
| `src/db/schema.ts` | v5 추가 |
| `src/repositories/appSettingsRepository.ts` | 문자열 설정 `getSetting`/`setSetting`, `getDeviceId` |
| `src/sync/changes.ts` | 로컬 변경 알림(위젯·전송기가 구독) |
| `src/sync/outbox.ts` | outbox 넣기·꺼내기·ack·보류·전체 넣기 |
| `src/sync/contract.ts` | 서버 계약 `SyncServer`, `PhotoStore`, 행 타입 |
| `src/sync/push.ts` | 전송기 `pushOnce` |
| `src/sync/restore.ts` | 복원 `restoreAll`, 사진 받기, 기기 기록으로 서버 교체 |
| `src/sync/scheduler.ts` | 모아 보내기·재시도 간격 |
| `__tests__/support/fakeServer.ts` | 메모리 가짜 서버·사진 저장소 |
| `src/widgets/snapshot.ts` | `buildWidgetSnapshot` (순수) |
| `src/widgets/loadSnapshot.ts` | DB에서 입력을 읽어 스냅샷 생성 |
| `src/design-system/widget-preview.tsx` | 위젯 화면 타입과 미리보기 컴포넌트 (시안 검토용) |
| `stories/Account.stories.tsx`, `stories/WidgetPreview.stories.tsx` | 스토리 |

---

# Part A — 약관 (앱 쪽)

### Task A1: 재동의 판단 순수 함수

**Files:**
- Create: `src/policy/versions.ts`, `src/policy/urls.ts`
- Test: `__tests__/policyVersions.test.ts`

**Interfaces:**
- Produces:
  - `type PolicyKind = 'terms' | 'privacy'`
  - `type PolicyVersion = { version: number; postedAt: string; effectiveAt: string; summary: string; requiresConsent: boolean }`
  - `type PolicyManifest = Record<PolicyKind, PolicyVersion[]>`
  - `effectiveVersion(list: readonly PolicyVersion[], today: DateKey): PolicyVersion | null`
  - `needsReconsent(manifest: PolicyManifest | null, agreed: Record<PolicyKind, number>, today: DateKey): boolean`
  - `POLICY_BASE_URL`, `POLICY_MANIFEST_URL`, `policyUrl(kind: PolicyKind): string`

- [ ] **Step 1: 실패하는 테스트**

```ts
// __tests__/policyVersions.test.ts
import { effectiveVersion, needsReconsent } from '../src/policy/versions';
import type { PolicyManifest, PolicyVersion } from '../src/policy/versions';
import { policyUrl } from '../src/policy/urls';

const v = (version: number, effectiveAt: string, requiresConsent = true): PolicyVersion =>
  ({ version, postedAt: '2026-10-01', effectiveAt, summary: '', requiresConsent });

describe('시행 중인 판', () => {
  const list = [v(1, '2026-10-01'), v(2, '2026-11-08')];
  it('시행일 전날은 이전 판이다', () => expect(effectiveVersion(list, '2026-11-07')?.version).toBe(1));
  it('시행일 당일부터 새 판이다', () => expect(effectiveVersion(list, '2026-11-08')?.version).toBe(2));
  it('순서가 섞여 있어도 판 번호가 큰 것을 고른다', () =>
    expect(effectiveVersion([list[1], list[0]], '2026-12-01')?.version).toBe(2));
  it('시행된 판이 없으면 null', () => expect(effectiveVersion(list, '2026-09-30')).toBeNull());
});

describe('재동의 판단', () => {
  const manifest: PolicyManifest = {
    terms: [v(1, '2026-10-01'), v(2, '2026-11-08')],
    privacy: [v(1, '2026-10-01', false), v(2, '2026-11-08', false)],
  };
  it('동의한 판보다 높은 판이 시행되고 동의가 필요하면 참', () =>
    expect(needsReconsent(manifest, { terms: 1, privacy: 1 }, '2026-11-08')).toBe(true));
  it('시행 전이면 거짓', () =>
    expect(needsReconsent(manifest, { terms: 1, privacy: 1 }, '2026-11-07')).toBe(false));
  it('requiresConsent가 거짓인 개정은 묻지 않는다', () =>
    expect(needsReconsent(manifest, { terms: 2, privacy: 1 }, '2026-12-01')).toBe(false));
  it('목록을 받지 못하면 묻지 않는다', () =>
    expect(needsReconsent(null, { terms: 1, privacy: 1 }, '2026-12-01')).toBe(false));
});

describe('정책 URL', () => {
  it('종류별 최신본 주소', () => {
    expect(policyUrl('terms')).toBe('https://eunjukkkkim.github.io/chagok-app-policy/terms/');
    expect(policyUrl('privacy')).toBe('https://eunjukkkkim.github.io/chagok-app-policy/privacy/');
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx jest __tests__/policyVersions.test.ts` → FAIL (`Cannot find module '../src/policy/versions'`)

- [ ] **Step 3: 구현**

```ts
// src/policy/urls.ts
import type { PolicyKind } from './versions';

/** 정책 문서는 별도 공개 저장소 chagok-app-policy의 GitHub Pages에 있다 (약관 설계). */
export const POLICY_BASE_URL = 'https://eunjukkkkim.github.io/chagok-app-policy';

/** 오늘 시행 중인 판을 보여주는 주소. 판 선택은 사이트가 versions.json으로 한다. */
export const policyUrl = (kind: PolicyKind): string => `${POLICY_BASE_URL}/${kind}/`;

export const POLICY_MANIFEST_URL = `${POLICY_BASE_URL}/versions.json`;
```

```ts
// src/policy/versions.ts
import type { DateKey } from '../domain/dates';

export type PolicyKind = 'terms' | 'privacy';

/** chagok-app-policy/versions.json의 한 판. 날짜는 로컬 'YYYY-MM-DD'. */
export type PolicyVersion = {
  version: number;
  postedAt: DateKey;
  effectiveAt: DateKey;
  summary: string;
  /** 문구만 다듬은 개정은 false — 재동의를 받지 않는다 */
  requiresConsent: boolean;
};

export type PolicyManifest = Record<PolicyKind, PolicyVersion[]>;

/** 오늘 시행 중인 판: 시행일이 지난 판 중 번호가 가장 큰 것. */
export function effectiveVersion(list: readonly PolicyVersion[], today: DateKey): PolicyVersion | null {
  let best: PolicyVersion | null = null;
  for (const v of list) if (v.effectiveAt <= today && (!best || v.version > best.version)) best = v;
  return best;
}

/**
 * 로그인한 사용자에게 동의 화면을 다시 띄울지. 목록을 받지 못하면 묻지 않는다 — 앱 사용을 막지 않는다.
 * 동의한 판 이후의 시행된 판 중 하나라도 동의가 필요하면 참이다.
 */
export function needsReconsent(
  manifest: PolicyManifest | null,
  agreed: Record<PolicyKind, number>,
  today: DateKey,
): boolean {
  if (!manifest) return false;
  return (['terms', 'privacy'] as const).some((kind) =>
    manifest[kind].some((v) => v.effectiveAt <= today && v.version > agreed[kind] && v.requiresConsent),
  );
}
```

- [ ] **Step 4: 통과 확인** — Run: `npx jest __tests__/policyVersions.test.ts` → PASS

- [ ] **Step 5: 커밋**

```bash
git add src/policy/versions.ts src/policy/urls.ts __tests__/policyVersions.test.ts
git commit -m "feat(policy): pick effective policy version and decide re-consent"
```

### Task A2: 의존성 추가 (`expo-web-browser`, `expo-network`)

**Files:** Modify `package.json`, `package-lock.json`, `app.json`(플러그인이 추가되면)

- [ ] **Step 1: 백업**

```bash
cp package.json /tmp/package.json.bak && cp package-lock.json /tmp/package-lock.json.bak
```

- [ ] **Step 2: 설치** — `npx expo install expo-web-browser expo-network`

- [ ] **Step 3: react-dom 확인** — Run: `npm ls react-dom --all` → Expected: 모든 줄이 `react-dom@19.2.3`. 다른 버전이 보이면 `cp /tmp/package.json.bak package.json && cp /tmp/package-lock.json.bak package-lock.json && npm install`로 되돌리고 멈춘 뒤 보고한다.

- [ ] **Step 4: 기존 검사 통과** — Run: `npm test && npm run typecheck` → PASS

- [ ] **Step 5: 커밋**

```bash
git add package.json package-lock.json app.json
git commit -m "chore: add expo-web-browser and expo-network for policy sheets"
```

### Task A3: 약관과 라이선스 화면

**Files:**
- Create: `src/policy/ofl-neodgm.ts`(생성), `src/policy/licenses.ts`, `src/policy/openPolicy.ts`, `src/design-system/policy-screens.tsx`, `app/policies/index.tsx`, `app/policies/[license].tsx`
- Modify: `src/design-system/index.ts`(export 추가), `app/_layout.tsx`(Stack.Screen 추가), `app/settings.tsx`(행 추가)
- Test: `src/design-system/policy-screens.test.tsx`

**Interfaces:**
- Consumes: `policyUrl` (A1), `useDialog` → `{ask, confirm, dialog}`, `DialogSpec = {title, description, primaryLabel, secondaryLabel?}` (`src/app-data/useDialog.ts`)
- Produces: `PolicyListScreen`, `LicenseDetailScreen`, `LICENSES: readonly LicenseEntry[]`, `openPolicy(kind, ask)`

- [ ] **Step 1: 라이선스 데이터 생성** — Neo둥근모 OFL 본문을 TS로 옮긴다(Metro는 .txt를 번들하지 않는다).

```bash
node -e "const fs=require('fs');const t=fs.readFileSync('src/design-system/assets/OFL.txt','utf8');fs.writeFileSync('src/policy/ofl-neodgm.ts','// src/design-system/assets/OFL.txt에서 생성. 원문을 고치지 않는다.\nexport const NEODGM_OFL = '+JSON.stringify(t)+';\n');"
```

```ts
// src/policy/licenses.ts
import { NEODGM_OFL } from './ofl-neodgm';

export type LicenseEntry = { id: string; name: string; license: string; text?: string };

/** 앱 설정 → 약관과 라이선스 → 오픈소스 라이선스 (PRD 4.9). 앱에 넣어 오프라인에서도 본다. */
export const LICENSES: readonly LicenseEntry[] = [
  { id: 'neodgm', name: 'Neo둥근모', license: 'SIL Open Font License 1.1', text: NEODGM_OFL },
  { id: 'react-native', name: 'React Native', license: 'MIT' },
  { id: 'expo', name: 'Expo', license: 'MIT' },
  { id: 'react', name: 'React', license: 'MIT' },
];
```

- [ ] **Step 2: 실패하는 컴포넌트 테스트**

```tsx
// src/design-system/policy-screens.test.tsx
import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {PolicyListScreen,LicenseDetailScreen} from './policy-screens';
afterEach(cleanup);
describe('약관과 라이선스',()=>{
  it('세 항목을 누르면 각각 전달한다',()=>{
    const p={onBack:vi.fn(),onTerms:vi.fn(),onPrivacy:vi.fn(),licenses:[{id:'neodgm',name:'Neo둥근모',license:'SIL Open Font License 1.1'}],onLicense:vi.fn()};
    render(<PolicyListScreen {...p}/>);
    fireEvent.click(screen.getByRole('button',{name:'이용약관'}));expect(p.onTerms).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'개인정보 처리방침'}));expect(p.onPrivacy).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Neo둥근모, SIL Open Font License 1.1'}));expect(p.onLicense).toHaveBeenCalledWith('neodgm');
  });
  it('라이선스 상세는 이름·라이선스·본문을 보여준다',()=>{
    render(<LicenseDetailScreen name="Neo둥근모" license="SIL Open Font License 1.1" text="Copyright ..." onBack={()=>{}}/>);
    expect(screen.getByText('Neo둥근모')).toBeTruthy();
    expect(screen.getByText('Copyright ...')).toBeTruthy();
  });
});
```

Run: `npm run test:components -- policy-screens` → FAIL (모듈 없음)

- [ ] **Step 3: 화면 조합 구현** (기존 `ScreenHeader`·`PixelPanel`·`SettingRow`·`RetroScreen`만 쓴다)

```tsx
// src/design-system/policy-screens.tsx
import React from 'react';
import {ScrollView} from 'react-native';
import {PixelPanel,PixelText} from './components';
import {RetroScreen,ScreenHeader,SettingRow} from './composition-controls';

type LicenseRow={id:string;name:string;license:string};

/** 앱 설정 → 약관과 라이선스 (PRD 4.9, 시안 `약관과-라이선스-목록`). 약관·처리방침은 웹 시트로 연다. */
export function PolicyListScreen({onBack,onTerms,onPrivacy,licenses,onLicense}:{onBack:()=>void;onTerms:()=>void;onPrivacy:()=>void;licenses:readonly LicenseRow[];onLicense:(id:string)=>void}) {
  return <RetroScreen style={{gap:16}}>
    <ScreenHeader title="약관과 라이선스" onBack={onBack}/>
    <PixelPanel title="약관">
      <SettingRow label="이용약관" onPress={onTerms}/>
      <SettingRow label="개인정보 처리방침" onPress={onPrivacy}/>
    </PixelPanel>
    <PixelPanel title="오픈소스 라이선스">
      {licenses.map((l)=><SettingRow key={l.id} label={l.name} value={l.license} onPress={()=>onLicense(l.id)}/>)}
    </PixelPanel>
  </RetroScreen>;
}

/** 라이선스 상세 (시안 `라이선스-상세`). 본문이 없으면 라이선스 이름만 보여준다. */
export function LicenseDetailScreen({name,license,text,onBack}:{name:string;license:string;text?:string;onBack:()=>void}) {
  return <RetroScreen style={{gap:16}}>
    <ScreenHeader title="오픈소스 라이선스" onBack={onBack}/>
    <PixelPanel>
      <PixelText variant="title">{name}</PixelText>
      <PixelText>{license}</PixelText>
    </PixelPanel>
    {text&&<ScrollView style={{flex:1}}><PixelText style={{fontSize:13,lineHeight:20}}>{text}</PixelText></ScrollView>}
  </RetroScreen>;
}
```

`src/design-system/index.ts`에 `export * from './policy-screens';` 추가.

- [ ] **Step 4: 통과 확인** — Run: `npm run test:components` → PASS

- [ ] **Step 5: 시트 열기와 라우트**

```ts
// src/policy/openPolicy.ts
import * as WebBrowser from 'expo-web-browser';
import * as Network from 'expo-network';
import type { DialogChoice, DialogSpec } from '../app-data/useDialog';
import { policyUrl } from './urls';
import type { PolicyKind } from './versions';

/** 앱 위 시트로 연다(iOS SFSafariViewController, Android Custom Tabs). 오프라인이면 버튼 하나짜리 알림만. */
export async function openPolicy(kind: PolicyKind, ask: (spec: DialogSpec) => Promise<DialogChoice>): Promise<void> {
  const state = await Network.getNetworkStateAsync();
  if (state.isConnected === false || state.isInternetReachable === false) {
    await ask({ title: '연결이 필요해요', description: '인터넷에 연결되면 볼 수 있어요.', primaryLabel: '확인' });
    return;
  }
  await WebBrowser.openBrowserAsync(policyUrl(kind));
}
```

```tsx
// app/policies/index.tsx
import { useRouter } from 'expo-router';
import { PolicyListScreen } from '../../src/design-system';
import { goBackOrHome } from '../../src/app-data/goBack';
import { useDialog } from '../../src/app-data/useDialog';
import { LICENSES } from '../../src/policy/licenses';
import { openPolicy } from '../../src/policy/openPolicy';

/** 앱 설정 → 약관과 라이선스 (약관 설계). */
export default function Policies() {
  const router = useRouter();
  const { ask, dialog } = useDialog();
  return <>
    <PolicyListScreen
      onBack={goBackOrHome}
      onTerms={() => void openPolicy('terms', ask)}
      onPrivacy={() => void openPolicy('privacy', ask)}
      licenses={LICENSES}
      onLicense={(id) => router.push({ pathname: '/policies/[license]', params: { license: id } })}
    />
    {dialog}
  </>;
}
```

```tsx
// app/policies/[license].tsx
import { useLocalSearchParams } from 'expo-router';
import { LicenseDetailScreen } from '../../src/design-system';
import { goBackOrHome } from '../../src/app-data/goBack';
import { LICENSES } from '../../src/policy/licenses';

export default function LicenseDetail() {
  const { license } = useLocalSearchParams<{ license: string }>();
  const entry = LICENSES.find((l) => l.id === license) ?? LICENSES[0];
  return <LicenseDetailScreen name={entry.name} license={entry.license} text={entry.text} onBack={goBackOrHome} />;
}
```

`app/_layout.tsx`의 Stack, `<Stack.Screen name="settings" />` 아래에 추가:

```tsx
          <Stack.Screen name="policies/index" />
          <Stack.Screen name="policies/[license]" />
```

`app/settings.tsx` 전체:

```tsx
import { useRouter } from 'expo-router';
import { PixelPanel, PixelText, RetroScreen, ScreenHeader, SettingRow } from '../src/design-system';
import { goBackOrHome } from '../src/app-data/goBack';

/** 계정 연결 전에도 앱 설정과 로컬 저장 상태에 들어갈 수 있는 기본 화면. */
export default function AppSettings() {
  const router = useRouter();
  return (
    <RetroScreen style={{ gap: 16 }}>
      <ScreenHeader title="앱 설정" onBack={goBackOrHome} />
      <PixelPanel title="이 기기의 기록">
        <PixelText>지금은 이 기기에만 저장하고 있어요.</PixelText>
      </PixelPanel>
      <PixelPanel title="정보">
        <SettingRow label="약관과 라이선스" onPress={() => router.push('/policies')} />
      </PixelPanel>
    </RetroScreen>
  );
}
```

- [ ] **Step 6: 검사** — Run: `npm run typecheck && npm run lint && npx expo export --platform ios --output-dir /tmp/check && rm -rf /tmp/check` → 모두 성공. typed routes가 `/policies/[license]`를 모르면 `npx expo customize`가 아니라 `npx expo start`를 한 번 띄워 타입을 다시 생성한다.

- [ ] **Step 7: Expo Go 확인** (사용자와 함께) — `npx expo start --lan` → 앱 설정 → 약관과 라이선스 → 이용약관이 시트로 열리는지(지금은 404 페이지가 정상), 비행기 모드에서 "연결이 필요해요" 알림, Neo둥근모 상세 본문. 확인하지 못한 항목은 보고에 그대로 적는다.

- [ ] **Step 8: 커밋**

```bash
git add src/policy app/policies app/_layout.tsx app/settings.tsx src/design-system/policy-screens.tsx src/design-system/policy-screens.test.tsx src/design-system/index.ts
git commit -m "feat(policy): terms and licenses screens opened from app settings"
```

### Task A4: 동의 화면 조합 (Storybook 전용, 앱 연결은 로그인 단계)

**Files:**
- Create: `src/design-system/account-screens.tsx`, `stories/Account.stories.tsx`
- Modify: `src/design-system/index.ts`
- Test: `src/design-system/account-screens.test.tsx`

**Interfaces:**
- Produces: `PixelCheckbox({label, checked, onChange})`, `ConsentScreen({ageChecked, termsChecked, onToggleAge, onToggleTerms, onViewTerms, onViewPrivacy, onUnder14, onBack, loginButtons})`

- [ ] **Step 1: 실패하는 테스트**

```tsx
// src/design-system/account-screens.test.tsx
import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {ConsentScreen} from './account-screens';
afterEach(cleanup);
const base={onToggleAge:vi.fn(),onToggleTerms:vi.fn(),onViewTerms:vi.fn(),onViewPrivacy:vi.fn(),onUnder14:vi.fn(),onBack:vi.fn(),loginButtons:<button>Google로 계속</button>};
describe('동의 화면',()=>{
  it('두 체크가 모두 켜지기 전에는 로그인 영역이 비활성이다',()=>{
    const {rerender}=render(<ConsentScreen {...base} ageChecked termsChecked={false}/>);
    expect(screen.getByTestId('login-area').getAttribute('aria-disabled')).toBe('true');
    rerender(<ConsentScreen {...base} ageChecked termsChecked/>);
    expect(screen.getByTestId('login-area').getAttribute('aria-disabled')).toBe('false');
  });
  it('체크·보기·14세 미만 링크를 전달한다',()=>{
    render(<ConsentScreen {...base} ageChecked={false} termsChecked={false}/>);
    fireEvent.click(screen.getByRole('checkbox',{name:'[필수] 만 14세 이상이에요'}));expect(base.onToggleAge).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox',{name:'[필수] 이용약관에 동의해요'}));expect(base.onToggleTerms).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'이용약관 보기'}));expect(base.onViewTerms).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'개인정보 처리방침 보기'}));expect(base.onViewPrivacy).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'만 14세 미만이에요'}));expect(base.onUnder14).toHaveBeenCalled();
  });
});
```

Run: `npm run test:components -- account-screens` → FAIL

- [ ] **Step 2: 구현**

```tsx
// src/design-system/account-screens.tsx
import React,{type ReactNode} from 'react';
import {Pressable,View} from 'react-native';
import {PixelFrame,PixelPanel,PixelText} from './components';
import {RetroScreen,ScreenHeader,TextAction} from './composition-controls';
import {retro} from './tokens';

/** 체크 상자. 기존 입력 프레임 안에 체크 표시(■)를 둔다. */
export function PixelCheckbox({label,checked,onChange}:{label:string;checked:boolean;onChange:()=>void}) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{checked}} aria-checked={checked} onPress={onChange} style={{minHeight:retro.layout.touch,flexDirection:'row',alignItems:'center',gap:10}}>
    <PixelFrame variant="input" style={{width:28,height:28}} contentStyle={{alignItems:'center',justifyContent:'center'}}>
      {checked&&<PixelText style={{fontSize:16,lineHeight:18}}>■</PixelText>}
    </PixelFrame>
    <PixelText style={{flex:1}}>{label}</PixelText>
  </Pressable>;
}

/**
 * 계정 연결 직전 한 화면 (약관 설계). 두 필수 체크가 켜져야 로그인 버튼을 누를 수 있다.
 * 로그인 버튼은 Apple·Google 공식 버튼이라 슬롯으로 받는다 — 디자인 시스템의 예외 (HANDOFF).
 */
export function ConsentScreen({ageChecked,termsChecked,onToggleAge,onToggleTerms,onViewTerms,onViewPrivacy,onUnder14,onBack,loginButtons}:{ageChecked:boolean;termsChecked:boolean;onToggleAge:()=>void;onToggleTerms:()=>void;onViewTerms:()=>void;onViewPrivacy:()=>void;onUnder14:()=>void;onBack:()=>void;loginButtons:ReactNode}) {
  const enabled=ageChecked&&termsChecked;
  return <RetroScreen style={{gap:16}}>
    <ScreenHeader title="계정 연결" onBack={onBack}/>
    <PixelPanel>
      <PixelText>계정을 연결하면 기록이 자동으로 백업되고, 새 기기에서 로그인하면 복원돼요.</PixelText>
    </PixelPanel>
    <PixelPanel>
      <PixelCheckbox label="[필수] 만 14세 이상이에요" checked={ageChecked} onChange={onToggleAge}/>
      <PixelCheckbox label="[필수] 이용약관에 동의해요" checked={termsChecked} onChange={onToggleTerms}/>
      <TextAction label="이용약관 보기" onPress={onViewTerms}/>
      <TextAction label="개인정보 처리방침 보기" onPress={onViewPrivacy}/>
    </PixelPanel>
    <View testID="login-area" aria-disabled={!enabled} pointerEvents={enabled?'auto':'none'} style={{gap:12,opacity:enabled?1:retro.opacity.disabled}}>
      {loginButtons}
    </View>
    <TextAction label="만 14세 미만이에요" onPress={onUnder14}/>
  </RetroScreen>;
}
```

`src/design-system/index.ts`에 `export * from './account-screens';` 추가.

- [ ] **Step 3: 통과 확인** — Run: `npm run test:components` → PASS

- [ ] **Step 4: 스토리**

```tsx
// stories/Account.stories.tsx
import React,{useState} from 'react';
import {View} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {ConsentScreen,PixelButton} from '../src/design-system';

const meta={title:'Screens/Account consent',parameters:{layout:'fullscreen',docs:{description:{component:'계정 연결 직전 동의 화면 (약관 설계). 로그인 버튼은 자리 표시다 — 앱에서는 Apple·Google 공식 버튼. 앱 동작에 연결되지 않습니다.'}}}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;
const noop=()=>{};
function Demo({ios=true,age=false,terms=false}:{ios?:boolean;age?:boolean;terms?:boolean}) {
  const [a,setA]=useState(age);const [t,setT]=useState(terms);
  return <View style={{width:390,height:844}}><ConsentScreen ageChecked={a} termsChecked={t} onToggleAge={()=>setA(!a)} onToggleTerms={()=>setT(!t)} onViewTerms={noop} onViewPrivacy={noop} onUnder14={noop} onBack={noop}
    loginButtons={<>{ios&&<PixelButton label="Apple로 계속 (자리 표시)" onPress={noop}/>}<PixelButton label="Google로 계속 (자리 표시)" variant="secondary" onPress={noop}/></>}/></View>;
}
export const Empty:Story={name:'iOS · 체크 전',render:()=><Demo/>};
export const Ready:Story={name:'iOS · 모두 체크',render:()=><Demo age terms/>};
export const Android:Story={name:'Android · Google만',render:()=><Demo ios={false}/>};
```

- [ ] **Step 5: 렌더해서 보기** — `npm run storybook` 후 세 장면을 390·320 폭으로 캡처해 직접 연다(WORKING-AGREEMENT 2절). 가로 넘침이나 버튼 겹침이 있으면 고친다. `npm run check:storybook` 통과.

- [ ] **Step 6: 커밋**

```bash
git add src/design-system/account-screens.tsx src/design-system/account-screens.test.tsx src/design-system/index.ts stories/Account.stories.tsx
git commit -m "feat(design-system): consent screen with age and terms checks"
```

---

# Part B — 백업 (기기 쪽)

### Task B1: 스키마 v5와 문자열 설정

**Files:**
- Modify: `src/db/schema.ts`(v5 추가), `src/repositories/appSettingsRepository.ts`
- Test: `__tests__/migrations.test.ts`(v5 describe 추가), `__tests__/appSettings.test.ts`(추가)

**Interfaces:**
- Produces:
  - 테이블 `outbox(entity, row_id, queued_at, attempts, last_error)`, 컬럼 `goals.updated_at`·`stickers.updated_at`·`records.updated_at`·`records.photo_remote_path`
  - `type SettingKey = 'deviceId' | 'accountUserId' | 'lastSyncedAt' | 'syncCursor' | 'pendingPhotoDownloads'`
  - `getSetting(key: SettingKey): Promise<string | null>`, `setSetting(key: SettingKey, value: string | null): Promise<void>`, `getDeviceId(): Promise<string>`

- [ ] **Step 1: 실패하는 테스트** — `__tests__/migrations.test.ts` 끝에 추가

```ts
/** v4까지만 적용한 DB. */
async function driverAtV4(): Promise<DbDriver> {
  const driver = createNodeDriver();
  for (const sql of MIGRATIONS.slice(0, 4).flat()) await driver.exec(sql);
  await driver.exec('PRAGMA user_version = 4');
  return driver;
}

describe('v5 — 백업 (계정·백업 설계 ②)', () => {
  it('v4 데이터에 updated_at을 채우고 outbox를 만든다', async () => {
    const driver = await driverAtV4();
    await driver.exec(`
      INSERT INTO goals (id, name, board_type, total_slots, created_at) VALUES ('g', '목표', 'tally', 3, 100);
      INSERT INTO stickers (id, goal_id, placed_at, slot_index) VALUES ('s', 'g', 200, 0);
      INSERT INTO records (id, sticker_id, memo, created_at) VALUES ('r', 's', '메모', 300);
    `);
    setDriverFactory(async () => driver);
    const db = await getDb();
    expect(await currentSchemaVersion()).toBe(SCHEMA_VERSION);
    expect((await db.first<{ updated_at: number }>('SELECT updated_at FROM goals'))?.updated_at).toBe(100);
    expect((await db.first<{ updated_at: number }>('SELECT updated_at FROM stickers'))?.updated_at).toBe(200);
    expect((await db.first<{ updated_at: number }>('SELECT updated_at FROM records'))?.updated_at).toBe(300);
    const cols = (await db.all<{ name: string }>('PRAGMA table_info(records)')).map((c) => c.name);
    expect(cols).toContain('photo_remote_path');
    const outbox = (await db.all<{ name: string }>('PRAGMA table_info(outbox)')).map((c) => c.name);
    expect(outbox).toEqual(['entity', 'row_id', 'queued_at', 'attempts', 'last_error']);
  });
});
```

`__tests__/appSettings.test.ts` 끝에 추가(파일 위에 `withFreshDb()` 호출이 없으면 추가):

```ts
import { getDeviceId, getSetting, setSetting } from '../src/repositories/appSettingsRepository';

describe('문자열 설정', () => {
  it('저장·지우기', async () => {
    expect(await getSetting('accountUserId')).toBeNull();
    await setSetting('accountUserId', 'u1');
    expect(await getSetting('accountUserId')).toBe('u1');
    await setSetting('accountUserId', null);
    expect(await getSetting('accountUserId')).toBeNull();
  });
  it('기기 ID는 한 번 만들고 유지한다', async () => {
    const a = await getDeviceId();
    expect(a).toMatch(/.+/);
    expect(await getDeviceId()).toBe(a);
  });
});
```

Run: `npx jest __tests__/migrations.test.ts __tests__/appSettings.test.ts` → FAIL

- [ ] **Step 2: v5 마이그레이션** — `src/db/schema.ts`의 v4 배열 뒤, `];` 앞에 추가

```ts
  // v5 — 백업 (docs/superpowers/specs/2026-09-30-account-backup-design.md ②)
  //
  // updated_at: 행 단위 병합(패드 지원)의 기준. 기존 행은 만든/붙인 시각으로 채운다.
  // photo_remote_path: 서버 Storage 경로. 기기 경로(photo_uri)는 서버로 보내지 않는다.
  // outbox: 올릴 대상 하나당 한 줄. 내용은 담지 않고 보낼 때 행을 읽는다.
  //   attempts/last_error: 서버가 거부한 항목을 보류한다. 대상이 다시 바뀌면 풀린다.
  // 삭제 표식은 서버에만 둔다. 기기는 지금처럼 실제로 지운다.
  [
    `ALTER TABLE goals ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE stickers ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE records ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE records ADD COLUMN photo_remote_path TEXT;`,
    `UPDATE goals SET updated_at = created_at;`,
    `UPDATE stickers SET updated_at = placed_at;`,
    `UPDATE records SET updated_at = created_at;`,
    `CREATE TABLE IF NOT EXISTS outbox (
       entity TEXT NOT NULL CHECK (entity IN ('goal','sticker','record','photo')),
       row_id TEXT NOT NULL,
       queued_at INTEGER NOT NULL,
       attempts INTEGER NOT NULL DEFAULT 0,
       last_error TEXT,
       PRIMARY KEY (entity, row_id)
     );`,
  ],
```

- [ ] **Step 3: 문자열 설정** — `src/repositories/appSettingsRepository.ts` 맨 위 import에 `import { newId } from './ids';`, 파일 끝에 추가

```ts
/** 문자열 값. 계정·동기화 상태를 담는다 (계정·백업 설계 ②). 동기화하지 않는다. */
export type SettingKey = 'deviceId' | 'accountUserId' | 'lastSyncedAt' | 'syncCursor' | 'pendingPhotoDownloads';

export async function getSetting(key: SettingKey): Promise<string | null> {
  const db = await getDb();
  const row = await db.first<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', key);
  return row?.value ?? null;
}

/** null이면 지운다. */
export async function setSetting(key: SettingKey, value: string | null): Promise<void> {
  const db = await getDb();
  if (value === null) {
    await db.run('DELETE FROM app_settings WHERE key = ?', key);
    return;
  }
  await db.run(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key, value,
  );
}

/** 설치마다 한 번 만든다. 서버 행의 "마지막으로 쓴 기기"다. */
export async function getDeviceId(): Promise<string> {
  const existing = await getSetting('deviceId');
  if (existing) return existing;
  const id = newId();
  await setSetting('deviceId', id);
  return id;
}
```

- [ ] **Step 4: 통과 확인** — Run: `npm test` → PASS (기존 마이그레이션 테스트 포함)

- [ ] **Step 5: 커밋**

```bash
git add src/db/schema.ts src/repositories/appSettingsRepository.ts __tests__/migrations.test.ts __tests__/appSettings.test.ts
git commit -m "feat(db): schema v5 with updated_at, remote photo path and outbox"
```

### Task B2: outbox 모듈과 변경 알림

**Files:**
- Create: `src/sync/changes.ts`, `src/sync/outbox.ts`
- Test: `__tests__/outbox.test.ts`

**Interfaces:**
- Consumes: `DbDriver` (`src/db/driver.ts`), v5 테이블
- Produces:
  - `type OutboxEntity = 'goal' | 'sticker' | 'record' | 'photo'`
  - `type OutboxEntry = { entity: OutboxEntity; rowId: string; queuedAt: number; attempts: number; lastError: string | null }`
  - `enqueue(tx: DbDriver, entity: OutboxEntity, rowId: string, now?: number): Promise<void>` — 보류도 푼다
  - `takeBatch(limit: number): Promise<OutboxEntry[]>` — 보류 제외, `queued_at` 순
  - `ack(entries: readonly OutboxEntry[]): Promise<void>` — `queued_at`이 그대로인 줄만 지운다
  - `hold(entry: OutboxEntry, error: string): Promise<void>`
  - `pendingCount(): Promise<{ pending: number; held: number }>`
  - `enqueueAll(now?: number): Promise<void>` — 첫 연결: 모든 행과 사진
  - `clearOutbox(): Promise<void>`
  - `subscribeLocalChange(fn: () => void): () => void`, `notifyLocalChange(): void`

- [ ] **Step 1: 실패하는 테스트**

```ts
// __tests__/outbox.test.ts
import { getDb } from '../src/db/client';
import { ack, enqueue, enqueueAll, hold, pendingCount, takeBatch } from '../src/sync/outbox';
import { subscribeLocalChange } from '../src/sync/changes';
import { withFreshDb } from './support/setup';

withFreshDb();

describe('outbox', () => {
  it('대상 하나당 한 줄이고, 다시 넣으면 queued_at이 앞으로만 간다', async () => {
    const db = await getDb();
    await enqueue(db, 'goal', 'g', 100);
    await enqueue(db, 'goal', 'g', 100); // 같은 ms에 두 번
    const batch = await takeBatch(10);
    expect(batch).toHaveLength(1);
    expect(batch[0].queuedAt).toBe(101);
  });

  it('ack는 읽은 뒤 다시 바뀐 대상을 지우지 않는다', async () => {
    const db = await getDb();
    await enqueue(db, 'sticker', 's', 100);
    const batch = await takeBatch(10);
    await enqueue(db, 'sticker', 's', 150); // 전송 중 재수정
    await ack(batch);
    const left = await takeBatch(10);
    expect(left.map((e) => [e.rowId, e.queuedAt])).toEqual([['s', 150]]);
  });

  it('보류 항목은 꺼내지 않고, 대상이 다시 바뀌면 풀린다', async () => {
    const db = await getDb();
    await enqueue(db, 'record', 'r', 100);
    const [e] = await takeBatch(10);
    await hold(e, 'invalid');
    expect(await takeBatch(10)).toHaveLength(0);
    expect(await pendingCount()).toEqual({ pending: 0, held: 1 });
    await enqueue(db, 'record', 'r', 200);
    expect(await pendingCount()).toEqual({ pending: 1, held: 0 });
  });

  it('queued_at 순으로 limit만큼 꺼낸다', async () => {
    const db = await getDb();
    await enqueue(db, 'goal', 'b', 200);
    await enqueue(db, 'goal', 'a', 100);
    await enqueue(db, 'goal', 'c', 300);
    expect((await takeBatch(2)).map((e) => e.rowId)).toEqual(['a', 'b']);
  });

  it('enqueueAll은 모든 행과 사진 있는 기록을 넣는다', async () => {
    const db = await getDb();
    await db.exec(`
      INSERT INTO goals (id, name, board_type, total_slots, created_at) VALUES ('g', '목표', 'tally', 3, 1);
      INSERT INTO stickers (id, goal_id, placed_at, slot_index) VALUES ('s1', 'g', 2, 0), ('s2', 'g', 3, 1);
      INSERT INTO records (id, sticker_id, photo_uri, created_at) VALUES ('r1', 's1', 'record-photo:a.jpg', 4);
      INSERT INTO records (id, sticker_id, memo, created_at) VALUES ('r2', 's2', '메모', 5);
    `);
    await enqueueAll(10);
    const keys = (await takeBatch(100)).map((e) => `${e.entity}:${e.rowId}`).sort();
    expect(keys).toEqual(['goal:g', 'photo:r1', 'record:r1', 'record:r2', 'sticker:s1', 'sticker:s2']);
  });

  it('비어 있으면 pendingCount는 0이다', async () => {
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('넣을 때 변경 알림을 보낸다', async () => {
    const db = await getDb();
    const fn = jest.fn();
    const off = subscribeLocalChange(fn);
    await enqueue(db, 'goal', 'g', 1);
    off();
    await enqueue(db, 'goal', 'h', 2);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
```

Run: `npx jest __tests__/outbox.test.ts` → FAIL

- [ ] **Step 2: 구현**

```ts
// src/sync/changes.ts
/**
 * 로컬 데이터가 바뀌었다는 신호. 전송 스케줄러와 위젯 갱신이 구독한다.
 * outbox에 넣을 때(트랜잭션 안) 보내므로 커밋 전일 수 있다. 구독자는 1초 이상 모아서 처리한다.
 * 트랜잭션이 되돌려져도 구독자는 새로 보낼 것이 없음을 확인하고 끝난다.
 */
const listeners = new Set<() => void>();

export function subscribeLocalChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function notifyLocalChange(): void {
  for (const fn of listeners) fn();
}
```

```ts
// src/sync/outbox.ts
import { getDb } from '../db/client';
import type { DbDriver } from '../db/driver';
import { notifyLocalChange } from './changes';

export type OutboxEntity = 'goal' | 'sticker' | 'record' | 'photo';

export type OutboxEntry = {
  entity: OutboxEntity;
  rowId: string;
  queuedAt: number;
  attempts: number;
  lastError: string | null;
};

type Row = { entity: OutboxEntity; row_id: string; queued_at: number; attempts: number; last_error: string | null };
const toEntry = (r: Row): OutboxEntry =>
  ({ entity: r.entity, rowId: r.row_id, queuedAt: r.queued_at, attempts: r.attempts, lastError: r.last_error });

/**
 * 올릴 대상을 남긴다. 쓰기와 같은 트랜잭션(tx)에서 부른다.
 * 이미 있으면 queued_at을 앞으로만 옮긴다 — 같은 ms에 다시 바뀌어도 ack가 새 수정을 지우지 않게 (ack 참고).
 * 보류(last_error)도 푼다. 대상이 바뀌었으니 다시 시도할 가치가 있다.
 */
export async function enqueue(tx: DbDriver, entity: OutboxEntity, rowId: string, now = Date.now()): Promise<void> {
  await tx.run(
    `INSERT INTO outbox (entity, row_id, queued_at) VALUES (?, ?, ?)
     ON CONFLICT(entity, row_id) DO UPDATE SET
       queued_at = MAX(excluded.queued_at, outbox.queued_at + 1), attempts = 0, last_error = NULL`,
    entity, rowId, now,
  );
  notifyLocalChange();
}

/** 보류하지 않은 항목을 오래된 순서로. */
export async function takeBatch(limit: number): Promise<OutboxEntry[]> {
  const db = await getDb();
  const rows = await db.all<Row>(
    'SELECT * FROM outbox WHERE last_error IS NULL ORDER BY queued_at ASC LIMIT ?', limit,
  );
  return rows.map(toEntry);
}

/** 서버가 받았다. 읽은 뒤 다시 바뀐 대상(queued_at이 다름)은 남긴다. */
export async function ack(entries: readonly OutboxEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const db = await getDb();
  await db.transaction(async (tx) => {
    for (const e of entries) {
      await tx.run('DELETE FROM outbox WHERE entity = ? AND row_id = ? AND queued_at = ?', e.entity, e.rowId, e.queuedAt);
    }
  });
}

/** 서버가 거부한 항목. 한 건 때문에 전체가 막히지 않게 따로 둔다. */
export async function hold(entry: OutboxEntry, error: string): Promise<void> {
  const db = await getDb();
  await db.run(
    'UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE entity = ? AND row_id = ? AND queued_at = ?',
    error, entry.entity, entry.rowId, entry.queuedAt,
  );
}

/** 앱 설정의 "올리지 못한 변경 n개"와 로그아웃 판단에 쓴다. */
export async function pendingCount(): Promise<{ pending: number; held: number }> {
  const db = await getDb();
  const row = await db.first<{ pending: number | null; held: number | null }>(
    `SELECT SUM(last_error IS NULL) AS pending, SUM(last_error IS NOT NULL) AS held FROM outbox`,
  );
  return { pending: row?.pending ?? 0, held: row?.held ?? 0 };
}

/** 첫 연결: 모든 행과 사진을 넣는다. 평소 전송으로 비우므로 중간에 끊겨도 이어서 올라간다. */
export async function enqueueAll(now = Date.now()): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const sets: [OutboxEntity, string][] = [
      ['goal', 'SELECT id FROM goals'],
      ['sticker', 'SELECT id FROM stickers'],
      ['record', 'SELECT id FROM records'],
      ['photo', 'SELECT id FROM records WHERE photo_uri IS NOT NULL'],
    ];
    for (const [entity, sql] of sets) {
      for (const { id } of await tx.all<{ id: string }>(sql)) await enqueue(tx, entity, id, now);
    }
  });
}

/** 로그아웃·계정 삭제 뒤. */
export async function clearOutbox(): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM outbox');
}
```

- [ ] **Step 3: 통과 확인** — Run: `npx jest __tests__/outbox.test.ts` → PASS

- [ ] **Step 4: 커밋**

```bash
git add src/sync/changes.ts src/sync/outbox.ts __tests__/outbox.test.ts
git commit -m "feat(sync): outbox with one row per target, ack by queued_at and hold"
```

### Task B3: 저장소 쓰기 함수가 outbox와 updated_at을 남긴다

**Files:**
- Modify: `src/repositories/goalRepository.ts`, `src/repositories/stickerRepository.ts`, `src/repositories/recordRepository.ts`
- Test: `__tests__/repositoryOutbox.test.ts`

**Interfaces:**
- Consumes: `enqueue(tx, entity, rowId, now)`, `takeBatch` (B2)
- Produces: 기존 함수 시그니처 그대로. 동작만 추가:

| 함수 | outbox | updated_at |
| --- | --- | --- |
| `createGoal` | goal | goals |
| `updateGoal`, `completeGoal`, `markCompletionSeen`, `reopenGoal`, `extendSlots`, `extendEndDate` | goal | goals |
| `deleteGoal` | goal + 사진 있던 기록마다 photo | — |
| `placeSticker` | sticker + goal(`last_placed_at`·완성이 바뀜) | stickers, goals |
| `removeSticker` | sticker + (기록에 사진이 있었으면) photo | — |
| `upsertRecord` | record + (사진이 바뀌었으면) photo | records |
| `deleteRecord` | record + (사진이 있었으면) photo | — |

`settleExpiredPeriods`는 `completeGoal`을 부르므로 따로 고치지 않는다.

- [ ] **Step 1: 실패하는 테스트**

```ts
// __tests__/repositoryOutbox.test.ts
import { getDb } from '../src/db/client';
import { completeGoal, createGoal, deleteGoal, extendSlots, updateGoal } from '../src/repositories/goalRepository';
import { placeSticker, removeSticker } from '../src/repositories/stickerRepository';
import { deleteRecord, upsertRecord } from '../src/repositories/recordRepository';
import { takeBatch } from '../src/sync/outbox';
import { withFreshDb } from './support/setup';

withFreshDb();

const keys = async () => (await takeBatch(100)).map((e) => `${e.entity}:${e.rowId}`).sort();
const clear = async () => (await getDb()).run('DELETE FROM outbox');

describe('저장소 → outbox', () => {
  it('목표를 만들고 고치면 goal 한 줄이고 updated_at이 바뀐다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    expect(await keys()).toEqual([`goal:${g.id}`]);
    const db = await getDb();
    const before = (await db.first<{ updated_at: number }>('SELECT updated_at FROM goals'))!.updated_at;
    await new Promise((r) => setTimeout(r, 2));
    await updateGoal(g.id, { name: '걷기' });
    const after = (await db.first<{ updated_at: number }>('SELECT updated_at FROM goals'))!.updated_at;
    expect(after).toBeGreaterThan(before);
    expect(await keys()).toEqual([`goal:${g.id}`]);
  });

  it('붙이기는 sticker와 goal을 남긴다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    await clear();
    const s = await placeSticker(g.id, 0);
    expect(await keys()).toEqual([`goal:${g.id}`, `sticker:${s.id}`].sort());
  });

  it('사진 있는 스티커를 떼면 sticker와 photo를 남긴다 (서버 사진 정리)', async () => {
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    const r = await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: null });
    await clear();
    await removeSticker(s.id);
    expect(await keys()).toEqual([`photo:${r.id}`, `sticker:${s.id}`].sort());
  });

  it('기록 저장: 사진이 바뀔 때만 photo를 남긴다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    await clear();
    const r = await upsertRecord(s.id, { photoUri: null, memo: '메모' });
    expect(await keys()).toEqual([`record:${r.id}`]);
    await clear();
    await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: '메모' });
    expect(await keys()).toEqual([`photo:${r.id}`, `record:${r.id}`].sort());
    await clear();
    await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: '메모2' });
    expect(await keys()).toEqual([`record:${r.id}`]);
  });

  it('기록 삭제: 사진이 있었으면 photo도 남긴다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    const r = await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: null });
    await clear();
    await deleteRecord(s.id);
    expect(await keys()).toEqual([`photo:${r.id}`, `record:${r.id}`].sort());
  });

  it('목표 삭제는 goal 한 줄과 사진 있던 기록의 photo만 남긴다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s1 = await placeSticker(g.id, 0);
    await placeSticker(g.id, 1);
    const r1 = await upsertRecord(s1.id, { photoUri: 'record-photo:a.jpg', memo: null });
    await clear();
    await deleteGoal(g.id);
    expect(await keys()).toEqual([`goal:${g.id}`, `photo:${r1.id}`].sort());
  });

  it('쓰기가 실패하면 outbox도 되돌려진다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 1 });
    const s = await placeSticker(g.id, 0, 'sprout', { complete: true });
    await clear();
    await expect(upsertRecord(s.id, { photoUri: null, memo: 'x' })).rejects.toThrow('완성한 판');
    await expect(placeSticker(g.id, 0)).rejects.toThrow();
    expect(await keys()).toEqual([]);
  });

  it('완성과 칸 늘리기도 goal을 남긴다', async () => {
    const c = await createGoal({ name: '산책', boardType: 'calendar', totalSlots: null });
    const t = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 2 });
    await clear();
    await completeGoal(c.id, 5);
    await extendSlots(t.id, 2);
    expect(await keys()).toEqual([`goal:${c.id}`, `goal:${t.id}`].sort());
  });

  it('칸 늘리기는 달력판에 아무것도 하지 않는다', async () => {
    const c = await createGoal({ name: '산책', boardType: 'calendar', totalSlots: null });
    await clear();
    await extendSlots(c.id, 2);
    expect(await keys()).toEqual([]);
  });
});
```

Run: `npx jest __tests__/repositoryOutbox.test.ts` → FAIL

- [ ] **Step 2: goalRepository** — 목표 한 줄을 고치는 함수는 모두 이 도우미를 거친다. 파일 위 import에 `import { enqueue } from '../sync/outbox';` 추가.

```ts
/** 목표 한 행을 고치고 updated_at·outbox를 같은 트랜잭션에서 남긴다 (계정·백업 설계 ②). */
async function writeGoal(id: string, sql: string, ...params: (string | number | null)[]): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.transaction(async (tx) => {
    await tx.run(`UPDATE goals SET ${sql}, updated_at = ? WHERE id = ?`, ...params, now, id);
    await enqueue(tx, 'goal', id, now);
  });
}
```

바꿀 곳(나머지 로직은 그대로):

```ts
// createGoal: 기존 db.run(INSERT ...)을 교체
  await db.transaction(async (tx) => {
    await tx.run(
      `INSERT INTO goals (id, name, board_type, total_slots, default_sticker_id, created_at, end_date, initial_slots, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      goal.id, goal.name, goal.boardType, goal.totalSlots,
      goal.defaultStickerId, goal.createdAt, goal.endDate, goal.initialSlots, goal.createdAt,
    );
    await enqueue(tx, 'goal', goal.id, goal.createdAt);
  });

// updateGoal: 마지막 두 줄(const db = ...; await db.run(...))을 교체
  if (sets.length === 0) return;
  await writeGoal(id, sets.join(', '), ...values);

// completeGoal 본문
  await writeGoal(id, 'completed_at = ?, completion_seen = 0', at);

// markCompletionSeen 본문
  await writeGoal(id, 'completion_seen = 1');

// reopenGoal 본문
  await writeGoal(id, REOPEN);

// extendSlots 본문 (검사 줄은 그대로 두고 그 아래를 교체)
  const goal = await getGoal(id);
  if (!goal || goal.boardType !== 'tally') return; // 원래 WHERE board_type = 'tally' 조건
  await writeGoal(id, `total_slots = total_slots + ?, ${REOPEN}`, add);

// extendEndDate 본문
  await writeGoal(id, `end_date = ?, ${REOPEN}`, endDate);
```

`deleteGoal` 전체:

```ts
export async function deleteGoal(id: string): Promise<string[]> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const photoRecords = await tx.all<{ id: string; photo_uri: string }>(
      `SELECT r.id, r.photo_uri FROM records r JOIN stickers s ON s.id = r.sticker_id
        WHERE s.goal_id = ? AND r.photo_uri IS NOT NULL`,
      id,
    );
    await tx.run('DELETE FROM records WHERE sticker_id IN (SELECT id FROM stickers WHERE goal_id = ?)', id);
    await tx.run('DELETE FROM stickers WHERE goal_id = ?', id);
    await tx.run('DELETE FROM goals WHERE id = ?', id);
    // 딸린 스티커·기록은 서버가 연쇄 표식한다. 사진 파일은 기록 id로 따로 지운다.
    const now = Date.now();
    await enqueue(tx, 'goal', id, now);
    for (const r of photoRecords) await enqueue(tx, 'photo', r.id, now);
    return photoRecords.map((p) => p.photo_uri);
  });
}
```

- [ ] **Step 3: stickerRepository** — import에 `import { enqueue } from '../sync/outbox';` 추가.

`placeSticker`의 트랜잭션 본문:

```ts
  await db.transaction(async (tx) => {
    const goal = await tx.first<{ completed_at: number | null }>('SELECT completed_at FROM goals WHERE id = ?', goalId);
    if (!goal) throw new Error('목표가 없습니다.');
    if (goal.completed_at !== null) throw new Error(COMPLETED);
    await tx.run(
      'INSERT INTO stickers (id, goal_id, placed_at, slot_index, sticker_type, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      sticker.id, sticker.goalId, sticker.placedAt, sticker.slotIndex, sticker.stickerType, sticker.placedAt,
    );
    await tx.run('UPDATE goals SET last_placed_at = ?, updated_at = ? WHERE id = ?', sticker.placedAt, sticker.placedAt, goalId);
    if (options.complete) {
      await tx.run('UPDATE goals SET completed_at = ?, completion_seen = 0 WHERE id = ?', sticker.placedAt, goalId);
    }
    await enqueue(tx, 'sticker', sticker.id, sticker.placedAt);
    await enqueue(tx, 'goal', goalId, sticker.placedAt);
  });
```

`removeSticker`의 트랜잭션 본문:

```ts
  return db.transaction(async (tx) => {
    const row = await tx.first<{ completed_at: number | null; photo_uri: string | null; record_id: string | null }>(
      `SELECT g.completed_at, r.photo_uri, r.id AS record_id FROM stickers s
         JOIN goals g ON g.id = s.goal_id
         LEFT JOIN records r ON r.sticker_id = s.id
        WHERE s.id = ?`,
      id,
    );
    if (!row) return null;
    if (row.completed_at !== null) throw new Error(COMPLETED);
    await tx.run('DELETE FROM records WHERE sticker_id = ?', id);
    await tx.run('DELETE FROM stickers WHERE id = ?', id);
    // 기록은 서버가 스티커와 함께 표식한다. 사진 파일은 기록 id로 따로 지운다.
    const now = Date.now();
    await enqueue(tx, 'sticker', id, now);
    if (row.record_id && row.photo_uri) await enqueue(tx, 'photo', row.record_id, now);
    return row.photo_uri;
  });
```

- [ ] **Step 4: recordRepository** — `upsertRecord`를 한 트랜잭션으로 바꾼다(Review Focus 2). import에 `import { enqueue } from '../sync/outbox';`. `RecordRow` 타입에 `updated_at: number; photo_remote_path: string | null;`를 더한다(`toRecord`는 그대로).

```ts
export async function upsertRecord(
  stickerId: string,
  data: { photoUri: string | null; memo: string | null },
): Promise<RecordNote> {
  const db = await getDb();
  const now = Date.now();
  return db.transaction(async (tx) => {
    const goal = await tx.first<{ completed_at: number | null }>(
      'SELECT g.completed_at FROM stickers s JOIN goals g ON g.id = s.goal_id WHERE s.id = ?', stickerId,
    );
    if (goal && goal.completed_at !== null) throw new Error('완성한 판은 고칠 수 없습니다.');
    const row = await tx.first<RecordRow>('SELECT * FROM records WHERE sticker_id = ?', stickerId);
    if (row) {
      await tx.run(
        'UPDATE records SET photo_uri = ?, memo = ?, updated_at = ? WHERE sticker_id = ?',
        data.photoUri, data.memo, now, stickerId,
      );
      await enqueue(tx, 'record', row.id, now);
      if (row.photo_uri !== data.photoUri) await enqueue(tx, 'photo', row.id, now);
      return { ...toRecord(row), photoUri: data.photoUri, memo: data.memo };
    }
    const record: RecordNote = { id: newId(), stickerId, photoUri: data.photoUri, memo: data.memo, createdAt: now };
    await tx.run(
      'INSERT INTO records (id, sticker_id, photo_uri, memo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      record.id, record.stickerId, record.photoUri, record.memo, record.createdAt, now,
    );
    await enqueue(tx, 'record', record.id, now);
    if (record.photoUri) await enqueue(tx, 'photo', record.id, now);
    return record;
  });
}

export async function deleteRecord(stickerId: string): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const row = await tx.first<{ id: string; photo_uri: string | null }>(
      'SELECT id, photo_uri FROM records WHERE sticker_id = ?', stickerId,
    );
    if (!row) return;
    await tx.run('DELETE FROM records WHERE sticker_id = ?', stickerId);
    const now = Date.now();
    await enqueue(tx, 'record', row.id, now);
    if (row.photo_uri) await enqueue(tx, 'photo', row.id, now);
  });
}
```

- [ ] **Step 5: 통과 확인** — Run: `npm test` → 새 테스트와 기존 저장소 테스트 모두 PASS. 기존 테스트가 깨지면 새 컬럼 때문인지 동작 변화 때문인지 확인한다. 동작이 바뀌었으면 멈추고 보고한다.

- [ ] **Step 6: 커밋**

```bash
git add src/repositories __tests__/repositoryOutbox.test.ts
git commit -m "feat(sync): record outbox and updated_at in every repository write"
```

### Task B4: 서버 계약·가짜 서버·전송기

**Files:**
- Create: `src/sync/contract.ts`, `src/sync/push.ts`, `__tests__/support/fakeServer.ts`
- Test: `__tests__/push.test.ts`

**Interfaces:**
- Consumes: `takeBatch`, `ack`, `hold`, `enqueue`, `OutboxEntry` (B2), v5 테이블
- Produces: `src/sync/contract.ts`의 모든 타입과 `SyncRejected`, `pushOnce(deps): Promise<{ sent: number; held: number }>`

- [ ] **Step 1: 계약 파일**

```ts
// src/sync/contract.ts
/**
 * 서버 계약. 실제 구현은 Supabase RPC(push_changes, pull_changes, server_state, replace_all)와 1:1이다
 * (계정·백업 설계 ③). 행은 기기 DB 컬럼 이름 그대로다. 기기 경로 photo_uri는 서버로 보내지 않는다.
 */
export type GoalRow = {
  id: string; name: string; board_type: 'calendar' | 'tally'; total_slots: number | null; default_sticker_id: string;
  created_at: number; end_date: string | null; completed_at: number | null; completion_seen: number;
  last_placed_at: number | null; initial_slots: number | null; updated_at: number;
};
export type StickerRow = { id: string; goal_id: string; placed_at: number; slot_index: number; sticker_type: string; updated_at: number };
export type RecordRow = { id: string; sticker_id: string; memo: string | null; photo_remote_path: string | null; created_at: number; updated_at: number };

export type RowEntity = 'goal' | 'sticker' | 'record';

export type Change =
  | { entity: 'goal'; op: 'upsert'; row: GoalRow }
  | { entity: 'sticker'; op: 'upsert'; row: StickerRow }
  | { entity: 'record'; op: 'upsert'; row: RecordRow }
  | { entity: RowEntity; op: 'delete'; id: string; deletedAt: number };

export type PulledRow =
  | { entity: 'goal'; row: GoalRow; deletedAt: number | null }
  | { entity: 'sticker'; row: StickerRow; deletedAt: number | null }
  | { entity: 'record'; row: RecordRow; deletedAt: number | null };

/** 서버가 내용 때문에 거부했다(형식 오류 등). 네트워크 오류와 구분한다 — 이것만 보류 대상이다. */
export class SyncRejected extends Error {}

export interface SyncServer {
  /** 한 트랜잭션으로 반영. 더 최근 updated_at 우선, 목표·스티커 삭제는 딸린 행까지 표식, 멱등. */
  push(deviceId: string, changes: Change[]): Promise<void>;
  /** since 이후 바뀐 행(표식 포함). cursor를 다음 since로 쓴다. */
  pull(since: number, limit: number): Promise<{ rows: PulledRow[]; cursor: number; more: boolean }>;
  state(): Promise<{ goals: number; lastUpdatedAt: number | null }>;
  /** 기존 행 전부 표식 + 새 행 삽입을 한 트랜잭션으로 ("이 기기 기록 유지"). */
  replaceAll(deviceId: string, rows: { goals: GoalRow[]; stickers: StickerRow[]; records: RecordRow[] }): Promise<void>;
}

export interface PhotoStore {
  /** 기기 사진을 줄여(긴 변 1600px, JPEG 80%) 올리고 서버 경로를 돌려준다. 기기 파일이 없으면 null. */
  upload(recordId: string, storedUri: string): Promise<string | null>;
  remove(recordId: string): Promise<void>;
  /** 받아서 기기에 두고 저장용 URI('record-photo:...')를 돌려준다. */
  download(remotePath: string, recordId: string): Promise<string>;
}
```

- [ ] **Step 2: 가짜 서버**

```ts
// __tests__/support/fakeServer.ts
import { SyncRejected } from '../../src/sync/contract';
import type { Change, GoalRow, PhotoStore, PulledRow, RecordRow, RowEntity, StickerRow, SyncServer } from '../../src/sync/contract';

type AnyRow = GoalRow | StickerRow | RecordRow;
type Stored = { entity: RowEntity; row: AnyRow; deletedAt: number | null; seq: number };

/**
 * push/pull 계약을 메모리로 구현한다. 실제 RPC와 같은 규칙:
 * 더 최근 updated_at 우선, 목표·스티커 삭제는 딸린 행까지 표식, 멱등.
 */
export class FakeServer implements SyncServer {
  rows = new Map<string, Stored>();
  private seq = 0;
  failNext = 0;               // 다음 n번 push/replaceAll은 네트워크 오류
  reject = new Set<string>(); // 이 id가 들어간 push는 거부
  applyThenFail = false;      // 반영한 뒤 응답을 잃는다
  pushes = 0;

  private key = (e: RowEntity, id: string) => `${e}:${id}`;
  private put(entity: RowEntity, row: AnyRow, deletedAt: number | null) {
    this.rows.set(this.key(entity, row.id), { entity, row, deletedAt, seq: ++this.seq });
  }
  private tombstone(entity: RowEntity, id: string, at: number) {
    const s = this.rows.get(this.key(entity, id));
    if (s && s.deletedAt === null) this.rows.set(this.key(entity, id), { ...s, deletedAt: at, seq: ++this.seq });
  }
  private children(entity: 'sticker' | 'record', parentKey: 'goal_id' | 'sticker_id', parentId: string): string[] {
    return [...this.rows.values()]
      .filter((s) => s.entity === entity && (s.row as unknown as Record<string, string>)[parentKey] === parentId)
      .map((s) => s.row.id);
  }

  async push(_deviceId: string, changes: Change[]): Promise<void> {
    this.pushes++;
    if (this.failNext > 0) { this.failNext--; throw new Error('network'); }
    for (const c of changes) {
      const id = c.op === 'delete' ? c.id : c.row.id;
      if (this.reject.has(id)) throw new SyncRejected(`rejected ${id}`);
    }
    for (const c of changes) {
      if (c.op === 'upsert') {
        const cur = this.rows.get(this.key(c.entity, c.row.id));
        if (!cur || cur.row.updated_at <= c.row.updated_at) this.put(c.entity, c.row, null);
        continue;
      }
      this.tombstone(c.entity, c.id, c.deletedAt);
      if (c.entity === 'goal') {
        for (const sid of this.children('sticker', 'goal_id', c.id)) {
          this.tombstone('sticker', sid, c.deletedAt);
          for (const rid of this.children('record', 'sticker_id', sid)) this.tombstone('record', rid, c.deletedAt);
        }
      }
      if (c.entity === 'sticker') {
        for (const rid of this.children('record', 'sticker_id', c.id)) this.tombstone('record', rid, c.deletedAt);
      }
    }
    if (this.applyThenFail) { this.applyThenFail = false; throw new Error('response lost'); }
  }

  async pull(since: number, limit: number) {
    const all = [...this.rows.values()].filter((s) => s.seq > since).sort((a, b) => a.seq - b.seq);
    const page = all.slice(0, limit);
    return {
      rows: page.map((s) => ({ entity: s.entity, row: s.row, deletedAt: s.deletedAt }) as PulledRow),
      cursor: page.length ? page[page.length - 1].seq : since,
      more: all.length > limit,
    };
  }

  async state() {
    const live = [...this.rows.values()].filter((s) => s.deletedAt === null);
    return {
      goals: live.filter((s) => s.entity === 'goal').length,
      lastUpdatedAt: live.length ? Math.max(...live.map((s) => s.row.updated_at)) : null,
    };
  }

  async replaceAll(_deviceId: string, rows: { goals: GoalRow[]; stickers: StickerRow[]; records: RecordRow[] }) {
    if (this.failNext > 0) { this.failNext--; throw new Error('network'); }
    const now = Date.now();
    for (const s of [...this.rows.values()]) if (s.deletedAt === null) this.tombstone(s.entity, s.row.id, now);
    for (const r of rows.goals) this.put('goal', r, null);
    for (const r of rows.stickers) this.put('sticker', r, null);
    for (const r of rows.records) this.put('record', r, null);
  }

  live(entity: RowEntity): string[] {
    return [...this.rows.values()].filter((s) => s.entity === entity && s.deletedAt === null).map((s) => s.row.id).sort();
  }
}

export class FakePhotos implements PhotoStore {
  remote = new Map<string, string>();
  missingLocal = new Set<string>();
  failDownload = new Set<string>();
  async upload(recordId: string, storedUri: string) {
    if (this.missingLocal.has(storedUri)) return null;
    const path = `u/${recordId}.jpg`;
    this.remote.set(path, storedUri);
    return path;
  }
  async remove(recordId: string) { this.remote.delete(`u/${recordId}.jpg`); }
  async download(_remotePath: string, recordId: string) {
    if (this.failDownload.has(recordId)) throw new Error('download failed');
    return `record-photo:${recordId}-restored.jpg`;
  }
}
```

- [ ] **Step 3: 실패하는 전송기 테스트**

```ts
// __tests__/push.test.ts
import { createGoal, deleteGoal, updateGoal } from '../src/repositories/goalRepository';
import { placeSticker, removeSticker } from '../src/repositories/stickerRepository';
import { upsertRecord } from '../src/repositories/recordRepository';
import { pendingCount, takeBatch } from '../src/sync/outbox';
import { pushOnce } from '../src/sync/push';
import { FakePhotos, FakeServer } from './support/fakeServer';
import { withFreshDb } from './support/setup';

withFreshDb();

const setup = () => ({ server: new FakeServer(), photos: new FakePhotos(), deviceId: 'd1' });

describe('pushOnce', () => {
  it('행을 올리고 outbox를 비운다', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    await pushOnce(deps);
    expect(deps.server.live('goal')).toEqual([g.id]);
    expect(deps.server.live('sticker')).toEqual([s.id]);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('네트워크 오류면 던지고 outbox를 그대로 둔다', async () => {
    const deps = setup();
    await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    deps.server.failNext = 1;
    await expect(pushOnce(deps)).rejects.toThrow('network');
    expect((await pendingCount()).pending).toBe(1);
  });

  it('서버는 반영했는데 응답을 잃으면, 다시 보내도 결과가 같다', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    deps.server.applyThenFail = true;
    await expect(pushOnce(deps)).rejects.toThrow();
    await pushOnce(deps);
    expect(deps.server.live('goal')).toEqual([g.id]);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('사진을 올린 뒤 기록 행에 서버 경로를 남겨 올린다', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    const r = await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: null });
    await pushOnce(deps);
    const stored = deps.server.rows.get(`record:${r.id}`)!.row as { photo_remote_path: string | null };
    expect(stored.photo_remote_path).toBe(`u/${r.id}.jpg`);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('떼면 서버에서도 스티커와 기록이 사라지고 사진도 지워진다', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    const r = await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: '메모' });
    await pushOnce(deps);
    expect(deps.photos.remote.has(`u/${r.id}.jpg`)).toBe(true);
    await removeSticker(s.id);
    await pushOnce(deps);
    expect(deps.server.live('sticker')).toEqual([]);
    expect(deps.server.live('record')).toEqual([]);
    expect(deps.photos.remote.size).toBe(0);
  });

  it('기기 사진이 사라졌으면 사진 항목을 버리고 나머지는 올린다', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    await upsertRecord(s.id, { photoUri: 'record-photo:gone.jpg', memo: '메모' });
    deps.photos.missingLocal.add('record-photo:gone.jpg');
    await pushOnce(deps);
    expect(deps.photos.remote.size).toBe(0);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });

  it('거부된 항목만 보류하고 나머지는 올린다', async () => {
    const deps = setup();
    const a = await createGoal({ name: 'a', boardType: 'tally', totalSlots: 3 });
    const b = await createGoal({ name: 'b', boardType: 'tally', totalSlots: 3 });
    deps.server.reject.add(a.id);
    const result = await pushOnce(deps);
    expect(deps.server.live('goal')).toEqual([b.id]);
    expect(result.held).toBe(1);
    expect(await pendingCount()).toEqual({ pending: 0, held: 1 });
  });

  it('묶음 크기로 나눠 보낸다', async () => {
    const deps = setup();
    for (let i = 0; i < 5; i++) await createGoal({ name: `g${i}`, boardType: 'tally', totalSlots: 1 });
    await pushOnce({ ...deps, batchSize: 2 });
    expect(deps.server.pushes).toBe(3);
    expect(deps.server.live('goal')).toHaveLength(5);
  });

  it('목표를 지우면 서버의 딸린 행이 모두 표식된다', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const s = await placeSticker(g.id, 0);
    await upsertRecord(s.id, { photoUri: null, memo: '메모' });
    await pushOnce(deps);
    await deleteGoal(g.id);
    await pushOnce(deps);
    expect([deps.server.live('goal'), deps.server.live('sticker'), deps.server.live('record')]).toEqual([[], [], []]);
  });

  it('보내는 동안 같은 목표가 다시 바뀌면 그 수정도 올라간다 (Review Focus 1)', async () => {
    const deps = setup();
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const realPush = deps.server.push.bind(deps.server);
    let once = true;
    deps.server.push = async (id, changes) => {
      await realPush(id, changes);
      if (once) { once = false; await updateGoal(g.id, { name: '걷기' }); }
    };
    await pushOnce(deps);
    expect((deps.server.rows.get(`goal:${g.id}`)!.row as { name: string }).name).toBe('걷기');
    expect(await takeBatch(10)).toEqual([]);
  });
});
```

Run: `npx jest __tests__/push.test.ts` → FAIL

- [ ] **Step 4: 전송기 구현**

```ts
// src/sync/push.ts
import { getDb } from '../db/client';
import { ack, enqueue, hold, takeBatch } from './outbox';
import type { OutboxEntry } from './outbox';
import { SyncRejected } from './contract';
import type { Change, GoalRow, PhotoStore, RecordRow, RowEntity, StickerRow, SyncServer } from './contract';

const TABLE: Record<RowEntity, string> = { goal: 'goals', sticker: 'stickers', record: 'records' };
const COLUMNS: Record<RowEntity, string> = {
  goal: 'id, name, board_type, total_slots, default_sticker_id, created_at, end_date, completed_at, completion_seen, last_placed_at, initial_slots, updated_at',
  sticker: 'id, goal_id, placed_at, slot_index, sticker_type, updated_at',
  // 기기 경로 photo_uri는 보내지 않는다
  record: 'id, sticker_id, memo, photo_remote_path, created_at, updated_at',
};

export type PushDeps = { server: SyncServer; photos: PhotoStore; deviceId: string; batchSize?: number; now?: () => number };

/** 지금 행 상태로 바꾼다. 행이 없으면 삭제다 — 쪽지에 내용을 담지 않아 쪽지와 DB가 어긋나지 않는다. */
async function toChange(e: OutboxEntry, now: number): Promise<Change> {
  const entity = e.entity as RowEntity;
  const db = await getDb();
  const row = await db.first<GoalRow | StickerRow | RecordRow>(
    `SELECT ${COLUMNS[entity]} FROM ${TABLE[entity]} WHERE id = ?`, e.rowId,
  );
  if (!row) return { entity, op: 'delete', id: e.rowId, deletedAt: now };
  return { entity, op: 'upsert', row } as Change;
}

async function setRemotePath(recordId: string, path: string | null, now: number): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.run('UPDATE records SET photo_remote_path = ?, updated_at = ? WHERE id = ?', path, now, recordId);
    await enqueue(tx, 'record', recordId, now);
  });
}

/**
 * 사진 한 건. 파일을 먼저 올리고 성공한 뒤에만 기록에 서버 경로를 남긴다 — 경로만 있고 파일이 없는 상태를 막는다.
 * 경로 기록 자체가 record 항목을 outbox에 남겨 같은 pushOnce 안에서 올라간다.
 * 기록이 없거나 사진을 뺐으면 서버 파일을 지운다. 기기 원본이 사라졌으면(사진 유실) 서버에는 사진 없음으로 둔다.
 */
async function pushPhoto(e: OutboxEntry, photos: PhotoStore, now: number): Promise<void> {
  const db = await getDb();
  const rec = await db.first<{ photo_uri: string | null; photo_remote_path: string | null }>(
    'SELECT photo_uri, photo_remote_path FROM records WHERE id = ?', e.rowId,
  );
  if (!rec || !rec.photo_uri) {
    await photos.remove(e.rowId);
    if (rec && rec.photo_remote_path) await setRemotePath(e.rowId, null, now);
    return;
  }
  const path = await photos.upload(e.rowId, rec.photo_uri);
  if (path !== rec.photo_remote_path) await setRemotePath(e.rowId, path, now);
}

/** 한 묶음을 보낸다. 거부되면 한 건씩 나눠 문제 항목만 보류한다. 네트워크 오류는 던진다. 보류한 수를 돌려준다. */
async function pushRows(entries: OutboxEntry[], deps: PushDeps, now: number): Promise<number> {
  const changes = await Promise.all(entries.map((e) => toChange(e, now)));
  try {
    await deps.server.push(deps.deviceId, changes);
    await ack(entries);
    return 0;
  } catch (error) {
    if (!(error instanceof SyncRejected)) throw error;
    if (entries.length === 1) {
      await hold(entries[0], error.message);
      return 1;
    }
    let held = 0;
    for (const e of entries) held += await pushRows([e], deps, now);
    return held;
  }
}

/**
 * outbox가 빌 때까지(보류 제외) 보낸다 (계정·백업 설계 ②·④).
 * 사진을 먼저 처리한다 — 경로를 기록하면 record 항목이 생겨 다음 반복에서 올라간다.
 */
export async function pushOnce(deps: PushDeps): Promise<{ sent: number; held: number }> {
  const size = deps.batchSize ?? 200;
  const clock = deps.now ?? Date.now;
  let sent = 0;
  let held = 0;
  for (;;) {
    const batch = await takeBatch(size);
    if (batch.length === 0) return { sent, held };
    const now = clock();
    for (const e of batch.filter((x) => x.entity === 'photo')) {
      await pushPhoto(e, deps.photos, now);
      await ack([e]);
    }
    const rows = batch.filter((x) => x.entity !== 'photo');
    if (rows.length) {
      const h = await pushRows(rows, deps, now);
      held += h;
      sent += rows.length - h;
    }
  }
}
```

- [ ] **Step 5: 통과 확인** — Run: `npx jest __tests__/push.test.ts && npm test` → PASS

- [ ] **Step 6: 커밋**

```bash
git add src/sync/contract.ts src/sync/push.ts __tests__/support/fakeServer.ts __tests__/push.test.ts
git commit -m "feat(sync): server contract, in-memory fake server and outbox pusher"
```

### Task B5: 복원과 "이 기기 기록 유지"

**Files:**
- Create: `src/sync/restore.ts`
- Test: `__tests__/restore.test.ts`

**Interfaces:**
- Consumes: `SyncServer`, `PhotoStore`, 행 타입 (B4), `enqueue` (B2), `setSetting` (B1)
- Produces:
  - `hasLocalData(): Promise<boolean>`
  - `restoreAll(server: SyncServer, pageSize?: number): Promise<{ photos: { recordId: string; remotePath: string }[] }>`
  - `downloadRestoredPhotos(photos: PhotoStore, list: { recordId: string; remotePath: string }[]): Promise<{ failed: string[] }>`
  - `replaceServerWithDevice(server: SyncServer, deviceId: string): Promise<void>`

- [ ] **Step 1: 실패하는 테스트**

```ts
// __tests__/restore.test.ts
import { getDb } from '../src/db/client';
import { createGoal, listGoals } from '../src/repositories/goalRepository';
import { listStickers, placeSticker, removeSticker } from '../src/repositories/stickerRepository';
import { getRecord, upsertRecord } from '../src/repositories/recordRepository';
import { getSetting } from '../src/repositories/appSettingsRepository';
import { pendingCount, takeBatch } from '../src/sync/outbox';
import { pushOnce } from '../src/sync/push';
import { downloadRestoredPhotos, hasLocalData, replaceServerWithDevice, restoreAll } from '../src/sync/restore';
import { FakePhotos, FakeServer } from './support/fakeServer';
import { withFreshDb } from './support/setup';

withFreshDb();

/** 다른 기기에서 올린 백업을 흉내 낸다: 이 DB에서 만들어 올린 뒤 로컬을 비운다. */
async function seedServer() {
  const server = new FakeServer();
  const photos = new FakePhotos();
  const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
  const s = await placeSticker(g.id, 0);
  const r = await upsertRecord(s.id, { photoUri: 'record-photo:a.jpg', memo: '메모' });
  const gone = await placeSticker(g.id, 1);
  await pushOnce({ server, photos, deviceId: 'old' });
  await removeSticker(gone.id);
  await pushOnce({ server, photos, deviceId: 'old' });
  const db = await getDb();
  await db.exec('DELETE FROM records; DELETE FROM stickers; DELETE FROM goals; DELETE FROM outbox;');
  return { server, photos, g, s, r };
}

describe('복원', () => {
  it('서버 행을 모두 받아 채우고, 삭제 표식은 되살리지 않는다', async () => {
    const { server, g, s } = await seedServer();
    const { photos } = await restoreAll(server, 2); // 여러 페이지
    expect((await listGoals()).map((x) => x.id)).toEqual([g.id]);
    expect((await listStickers(g.id)).map((x) => x.id)).toEqual([s.id]);
    expect(photos).toHaveLength(1);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 }); // 복원은 outbox를 만들지 않는다
    expect(await getSetting('syncCursor')).not.toBeNull();
  });

  it('받는 중 실패하면 기기는 그대로다', async () => {
    const { server } = await seedServer();
    await createGoal({ name: '기기 목표', boardType: 'tally', totalSlots: 1 });
    let calls = 0;
    const real = server.pull.bind(server);
    server.pull = async (since, limit) => { if (++calls === 2) throw new Error('network'); return real(since, limit); };
    await expect(restoreAll(server, 1)).rejects.toThrow('network');
    expect((await listGoals()).map((x) => x.name)).toEqual(['기기 목표']);
  });

  it('사진을 받아 기록에 연결하고, 실패한 것은 남겨 둔다', async () => {
    const { server, photos, s, r } = await seedServer();
    const restored = await restoreAll(server);
    photos.failDownload.add(r.id);
    expect(await downloadRestoredPhotos(photos, restored.photos)).toEqual({ failed: [r.id] });
    expect(JSON.parse((await getSetting('pendingPhotoDownloads'))!)).toEqual(restored.photos);
    photos.failDownload.clear();
    expect(await downloadRestoredPhotos(photos, restored.photos)).toEqual({ failed: [] });
    expect((await getRecord(s.id))?.photoUri).toBe(`record-photo:${r.id}-restored.jpg`);
    expect(await getSetting('pendingPhotoDownloads')).toBeNull();
  });

  it('이 기기 기록 유지: 서버를 기기 행으로 바꾸고 사진은 outbox로 올린다', async () => {
    const { server } = await seedServer();
    const g = await createGoal({ name: '기기 목표', boardType: 'tally', totalSlots: 2 });
    const s = await placeSticker(g.id, 0);
    const r = await upsertRecord(s.id, { photoUri: 'record-photo:b.jpg', memo: null });
    await replaceServerWithDevice(server, 'd1');
    expect(server.live('goal')).toEqual([g.id]);
    expect((await takeBatch(10)).map((e) => `${e.entity}:${e.rowId}`)).toEqual([`photo:${r.id}`]);
  });

  it('이 기기 기록 유지 중 실패하면 서버와 기기 outbox가 그대로다', async () => {
    const { server, g } = await seedServer();
    const mine = await createGoal({ name: '기기 목표', boardType: 'tally', totalSlots: 2 });
    server.failNext = 1;
    await expect(replaceServerWithDevice(server, 'd1')).rejects.toThrow();
    expect(server.live('goal')).toEqual([g.id]);
    expect((await takeBatch(10)).map((e) => e.rowId)).toEqual([mine.id]);
  });

  it('기기에 기록이 있는지', async () => {
    expect(await hasLocalData()).toBe(false);
    await createGoal({ name: 'x', boardType: 'tally', totalSlots: 1 });
    expect(await hasLocalData()).toBe(true);
  });
});
```

Run: `npx jest __tests__/restore.test.ts` → FAIL

- [ ] **Step 2: 구현**

```ts
// src/sync/restore.ts
import { getDb } from '../db/client';
import { setSetting } from '../repositories/appSettingsRepository';
import { enqueue } from './outbox';
import type { GoalRow, PhotoStore, RecordRow, StickerRow, SyncServer } from './contract';

type PhotoToFetch = { recordId: string; remotePath: string };

export async function hasLocalData(): Promise<boolean> {
  const db = await getDb();
  return ((await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM goals'))?.n ?? 0) > 0;
}

/**
 * 서버 백업으로 기기를 채운다 (계정·백업 설계 ② 복원).
 * 모두 받은 뒤 한 트랜잭션으로 바꾼다 — 받는 중 실패하면 기기는 손대지 않는다.
 * 기존 기기 사진 파일 정리는 호출자가 이 함수 성공 뒤에 한다. 복원은 outbox를 만들지 않는다.
 */
export async function restoreAll(server: SyncServer, pageSize = 500): Promise<{ photos: PhotoToFetch[] }> {
  const goals = new Map<string, GoalRow>();
  const stickers = new Map<string, StickerRow>();
  const records = new Map<string, RecordRow>();
  let cursor = 0;
  for (;;) {
    const page = await server.pull(cursor, pageSize);
    for (const p of page.rows) {
      if (p.entity === 'goal') { if (p.deletedAt === null) goals.set(p.row.id, p.row); else goals.delete(p.row.id); }
      if (p.entity === 'sticker') { if (p.deletedAt === null) stickers.set(p.row.id, p.row); else stickers.delete(p.row.id); }
      if (p.entity === 'record') { if (p.deletedAt === null) records.set(p.row.id, p.row); else records.delete(p.row.id); }
    }
    cursor = page.cursor;
    if (!page.more) break;
  }
  // 부모가 없는 행은 버린다 (표식이 부모에만 있을 때를 대비)
  for (const [id, s] of stickers) if (!goals.has(s.goal_id)) stickers.delete(id);
  for (const [id, r] of records) if (!stickers.has(r.sticker_id)) records.delete(id);

  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.exec('DELETE FROM records; DELETE FROM stickers; DELETE FROM goals; DELETE FROM outbox;');
    for (const g of goals.values()) {
      await tx.run(
        `INSERT INTO goals (id, name, board_type, total_slots, default_sticker_id, created_at, end_date, completed_at,
           completion_seen, last_placed_at, initial_slots, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        g.id, g.name, g.board_type, g.total_slots, g.default_sticker_id, g.created_at, g.end_date, g.completed_at,
        g.completion_seen, g.last_placed_at, g.initial_slots, g.updated_at,
      );
    }
    for (const s of stickers.values()) {
      await tx.run(
        'INSERT INTO stickers (id, goal_id, placed_at, slot_index, sticker_type, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        s.id, s.goal_id, s.placed_at, s.slot_index, s.sticker_type, s.updated_at,
      );
    }
    for (const r of records.values()) {
      await tx.run(
        'INSERT INTO records (id, sticker_id, photo_uri, memo, created_at, updated_at, photo_remote_path) VALUES (?, ?, NULL, ?, ?, ?, ?)',
        r.id, r.sticker_id, r.memo, r.created_at, r.updated_at, r.photo_remote_path,
      );
    }
  });
  await setSetting('syncCursor', String(cursor));
  await setSetting('lastSyncedAt', String(Date.now()));

  const photos = [...records.values()]
    .filter((r) => r.photo_remote_path)
    .map((r) => ({ recordId: r.id, remotePath: r.photo_remote_path! }));
  return { photos };
}

/**
 * 복원한 기록의 사진을 받는다. 하나가 실패해도 멈추지 않고, 실패한 목록을 남겨 앱이 앞으로 올 때 다시 받는다.
 * 그동안 기록은 기존 "사진 유실" 모습으로 보인다. 기기 경로만 바꾸므로 outbox를 만들지 않는다.
 */
export async function downloadRestoredPhotos(photos: PhotoStore, list: PhotoToFetch[]): Promise<{ failed: string[] }> {
  const db = await getDb();
  const failed: PhotoToFetch[] = [];
  for (const p of list) {
    try {
      const uri = await photos.download(p.remotePath, p.recordId);
      await db.run('UPDATE records SET photo_uri = ? WHERE id = ?', uri, p.recordId);
    } catch {
      failed.push(p);
    }
  }
  await setSetting('pendingPhotoDownloads', failed.length ? JSON.stringify(failed) : null);
  return { failed: failed.map((f) => f.recordId) };
}

/**
 * 복원 충돌에서 "이 기기 기록 유지" (계정·백업 설계 ② · ④).
 * 서버 replace_all이 한 트랜잭션이라 반쪽 상태가 없다. 성공한 뒤에만 기기 쪽을 정리한다:
 * 행 항목은 비우고, 서버 사진 경로를 지우고, 사진만 outbox로 다시 올린다.
 */
export async function replaceServerWithDevice(server: SyncServer, deviceId: string): Promise<void> {
  const db = await getDb();
  const goals = await db.all<GoalRow>(
    `SELECT id, name, board_type, total_slots, default_sticker_id, created_at, end_date, completed_at, completion_seen,
            last_placed_at, initial_slots, updated_at FROM goals`,
  );
  const stickers = await db.all<StickerRow>('SELECT id, goal_id, placed_at, slot_index, sticker_type, updated_at FROM stickers');
  const records = await db.all<RecordRow>(
    'SELECT id, sticker_id, memo, NULL AS photo_remote_path, created_at, updated_at FROM records',
  );
  await server.replaceAll(deviceId, { goals, stickers, records });
  const now = Date.now();
  await db.transaction(async (tx) => {
    await tx.exec('DELETE FROM outbox;');
    await tx.run('UPDATE records SET photo_remote_path = NULL');
    for (const { id } of await tx.all<{ id: string }>('SELECT id FROM records WHERE photo_uri IS NOT NULL')) {
      await enqueue(tx, 'photo', id, now);
    }
  });
}
```

- [ ] **Step 3: 통과 확인** — Run: `npx jest __tests__/restore.test.ts && npm test` → PASS

- [ ] **Step 4: 커밋**

```bash
git add src/sync/restore.ts __tests__/restore.test.ts
git commit -m "feat(sync): restore from server in one transaction and replace server with device"
```

### Task B6: 전송 스케줄러 (모아 보내기·재시도 간격)

**Files:**
- Create: `src/sync/scheduler.ts`
- Test: `__tests__/scheduler.test.ts`

**Interfaces:**
- Consumes: `createSingleFlight` (`src/app-data/singleFlight.ts` — 실행 중에 들어온 호출은 버린다)
- Produces:
  - `RETRY_DELAYS_MS = [5_000, 30_000, 120_000, 600_000, 1_800_000]`
  - `retryDelay(failures: number): number`
  - `createSyncScheduler(run: () => Promise<void>, options?: { debounceMs?: number }): { poke(): void; foreground(): void; stop(): void }`

- [ ] **Step 1: 실패하는 테스트**

```ts
// __tests__/scheduler.test.ts
import { createSyncScheduler, retryDelay } from '../src/sync/scheduler';

jest.useFakeTimers();
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

describe('재시도 간격', () => {
  it('5초 → 30초 → 2분 → 10분 → 최대 30분', () => {
    expect([1, 2, 3, 4, 5, 9].map(retryDelay)).toEqual([5_000, 30_000, 120_000, 600_000, 1_800_000, 1_800_000]);
  });
});

describe('스케줄러', () => {
  it('변경을 2초 모아 한 번 보낸다', async () => {
    const run = jest.fn().mockResolvedValue(undefined);
    const s = createSyncScheduler(run);
    s.poke(); s.poke(); s.poke();
    jest.advanceTimersByTime(1_999); await flush();
    expect(run).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1); await flush();
    expect(run).toHaveBeenCalledTimes(1);
    s.stop();
  });

  it('실패하면 간격을 늘려 다시 시도하고, 새 변경이 오면 처음 간격으로 돌아간다', async () => {
    const run = jest.fn().mockRejectedValue(new Error('network'));
    const s = createSyncScheduler(run);
    s.foreground(); await flush();
    expect(run).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(5_000); await flush();
    expect(run).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(29_999); await flush();
    expect(run).toHaveBeenCalledTimes(2);
    s.poke();
    jest.advanceTimersByTime(2_000); await flush();
    expect(run).toHaveBeenCalledTimes(3);
    jest.advanceTimersByTime(5_000); await flush();
    expect(run).toHaveBeenCalledTimes(4);
    s.stop();
  });

  it('앞으로 오면 바로 보낸다', async () => {
    const run = jest.fn().mockResolvedValue(undefined);
    const s = createSyncScheduler(run);
    s.foreground(); await flush();
    expect(run).toHaveBeenCalledTimes(1);
    s.stop();
  });

  it('멈춘 뒤에는 보내지 않는다', async () => {
    const run = jest.fn().mockResolvedValue(undefined);
    const s = createSyncScheduler(run);
    s.poke(); s.stop();
    jest.advanceTimersByTime(10_000); await flush();
    expect(run).not.toHaveBeenCalled();
  });
});
```

Run: `npx jest __tests__/scheduler.test.ts` → FAIL

- [ ] **Step 2: 구현**

```ts
// src/sync/scheduler.ts
import { createSingleFlight } from '../app-data/singleFlight';

/** 계정·백업 설계 ② 전송기. 성공하거나, 앱이 앞으로 오거나, 새로 기록하면 처음 간격으로 돌아간다. */
export const RETRY_DELAYS_MS = [5_000, 30_000, 120_000, 600_000, 1_800_000];

export function retryDelay(failures: number): number {
  return RETRY_DELAYS_MS[Math.min(Math.max(failures, 1), RETRY_DELAYS_MS.length) - 1];
}

/**
 * 언제 보낼지만 정한다. 무엇을 보낼지는 run(pushOnce)이 한다.
 * 백그라운드 실패로 팝업을 띄우지 않는다 — 상태는 앱 설정에서 본다.
 * 실행 중에 들어온 poke는 singleFlight가 버리지만 debounce 타이머가 다시 걸려 놓치지 않는다.
 */
export function createSyncScheduler(run: () => Promise<void>, options: { debounceMs?: number } = {}) {
  const debounceMs = options.debounceMs ?? 2_000;
  const once = createSingleFlight();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let failures = 0;
  let stopped = false;

  const clear = () => { if (timer) clearTimeout(timer); timer = null; };
  const schedule = (ms: number) => {
    if (stopped) return;
    clear();
    timer = setTimeout(() => { timer = null; void attempt(); }, ms);
  };
  const attempt = () => once(async () => {
    if (stopped) return;
    try {
      await run();
      failures = 0;
    } catch {
      failures += 1;
      schedule(retryDelay(failures));
    }
  });

  return {
    /** 기록이 바뀌었다. */
    poke() { failures = 0; schedule(debounceMs); },
    /** 앱이 앞으로 왔다. */
    foreground() { if (stopped) return; failures = 0; clear(); void attempt(); },
    stop() { stopped = true; clear(); },
  };
}
```

- [ ] **Step 3: 통과 확인** — Run: `npx jest __tests__/scheduler.test.ts` → PASS

- [ ] **Step 4: 커밋**

```bash
git add src/sync/scheduler.ts __tests__/scheduler.test.ts
git commit -m "feat(sync): debounce and retry schedule for background push"
```

---

# Part C — 위젯 스냅샷

### Task C1: `buildWidgetSnapshot` (순수)

**Files:**
- Create: `src/widgets/snapshot.ts`, `src/design-system/widget-preview.tsx`(타입만 먼저)
- Modify: `src/design-system/index.ts`
- Test: `__tests__/widgetSnapshot.test.ts`

**Interfaces:**
- Consumes: `Goal` (`src/domain/types.ts`), `orderGoals`, `inPeriod`, `progressBasis`, `progressOf` (`src/domain/board.ts`), `percentLabel`, `kindLabel`, `safeStickerId` (`src/app-data/pocketAdapter.ts`), `dateKeyOf`, `daysInMonth`, `localDateKey` (`src/domain/dates.ts`)
- Produces:

```ts
// src/design-system/widget-preview.tsx (이 태스크에서는 타입만)
import type {PocketStickerId} from '../stickers/pocket/catalog';
export type WidgetCalendarCell = 'filled' | 'missed' | 'future' | 'outside';
export type WidgetTallyCell = 'filled' | 'empty';
export type WidgetMini =
  | { type: 'calendar'; year: number; month: number; firstWeekday: number; days: WidgetCalendarCell[] }
  | { type: 'tally'; from: number; cells: WidgetTallyCell[]; placed: number; total: number };
export type WidgetGoalView = { id: string; name: string; sticker: PocketStickerId; kind: string; progressLabel: string; percent: number; mini: WidgetMini };
```

```ts
// src/widgets/snapshot.ts (시그니처)
export type WidgetInput = { goal: Goal; placedAll: number; placedDates: DateKey[]; slotIndexes: number[] };
export type WidgetSnapshot = { today: DateKey; goals: WidgetGoalView[]; defaultGoalId: string | null };
export const TALLY_CHUNK = 30;
export function buildWidgetSnapshot(inputs: readonly WidgetInput[], now: Date, chunk?: number): WidgetSnapshot;
```

화면 타입을 design-system에 두고 스냅샷이 채우는 방식은 `GoalCardItem`/`goalCard`와 같다.

- [ ] **Step 1: 실패하는 테스트**

```ts
// __tests__/widgetSnapshot.test.ts
import { buildWidgetSnapshot } from '../src/widgets/snapshot';
import type { WidgetInput } from '../src/widgets/snapshot';
import type { Goal } from '../src/domain/types';

const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min);
const goal = (over: Partial<Goal>): Goal => ({
  id: 'g', name: '산책', boardType: 'calendar', totalSlots: null, defaultStickerId: 'sprout',
  createdAt: at(2026, 9, 1).getTime(), endDate: null, completedAt: null, completionSeen: false,
  lastPlacedAt: null, initialSlots: null, ...over,
});
const cal = (over: Partial<WidgetInput> = {}): WidgetInput =>
  ({ goal: goal({}), placedAll: 0, placedDates: [], slotIndexes: [], ...over });

describe('위젯 스냅샷 · 달력판', () => {
  it('붙인 날, 지난 빈 날, 오늘과 앞으로, 기간 밖을 나눈다', () => {
    const input = cal({ goal: goal({ createdAt: at(2026, 9, 3).getTime() }), placedDates: ['2026-09-03', '2026-09-05'], placedAll: 2 });
    const mini = buildWidgetSnapshot([input], at(2026, 9, 6)).goals[0].mini;
    if (mini.type !== 'calendar') throw new Error('calendar expected');
    expect(mini.days.slice(0, 7)).toEqual(['outside', 'outside', 'filled', 'missed', 'filled', 'future', 'future']);
    expect(mini.days).toHaveLength(30);
    expect(mini.firstWeekday).toBe(new Date(2026, 8, 1).getDay());
  });

  it('오늘 빈칸은 00:00에도 23:59에도 future다 (Review Focus 4)', () => {
    for (const now of [at(2026, 9, 6, 0, 0), at(2026, 9, 6, 23, 59)]) {
      const mini = buildWidgetSnapshot([cal()], now).goals[0].mini;
      if (mini.type !== 'calendar') throw new Error('calendar expected');
      expect(mini.days[5]).toBe('future');
      expect(mini.days[4]).toBe('missed');
    }
  });

  it('종료일 없는 달력판은 이번 달 기준 문구, 다음 달 0시에는 0%', () => {
    const input = cal({ placedDates: ['2026-09-29', '2026-09-30'], placedAll: 2 });
    expect(buildWidgetSnapshot([input], at(2026, 9, 30)).goals[0].progressLabel).toBe('이번 달 6%');
    const next = buildWidgetSnapshot([input], at(2026, 10, 1, 0, 0)).goals[0];
    expect(next.progressLabel).toBe('이번 달 0%');
    if (next.mini.type !== 'calendar') throw new Error('calendar expected');
    expect(next.mini.month).toBe(10);
    expect(next.mini.days.every((d) => d === 'future')).toBe(true);
  });

  it('종료일 있는 달력판은 전체 기준이고 종료일 뒤는 기간 밖이다', () => {
    const input = cal({ goal: goal({ endDate: '2026-09-10' }), placedAll: 5 });
    const g = buildWidgetSnapshot([input], at(2026, 9, 6)).goals[0];
    expect(g.progressLabel).toBe('50%');
    if (g.mini.type !== 'calendar') throw new Error('calendar expected');
    expect(g.mini.days[10]).toBe('outside');
  });
});

describe('위젯 스냅샷 · 적립판 묶음 (Review Focus 5)', () => {
  const tally = (total: number, slotIndexes: number[]): WidgetInput => ({
    goal: goal({ boardType: 'tally', totalSlots: total, initialSlots: total }), placedAll: slotIndexes.length, placedDates: [], slotIndexes,
  });
  const range = (n: number, from = 0) => Array.from({ length: n }, (_, i) => i + from);

  it('다음 빈칸이 든 묶음을 보여준다', () => {
    const mini = buildWidgetSnapshot([tally(100, range(45))], at(2026, 9, 6)).goals[0].mini;
    expect(mini).toMatchObject({ type: 'tally', from: 31, placed: 45, total: 100 });
    if (mini.type !== 'tally') throw new Error('tally expected');
    expect(mini.cells).toHaveLength(30);
    expect(mini.cells.slice(13, 16)).toEqual(['filled', 'filled', 'empty']);
  });
  it('마지막 묶음은 남은 칸만큼만', () => {
    const mini = buildWidgetSnapshot([tally(35, range(31))], at(2026, 9, 6)).goals[0].mini;
    expect(mini).toMatchObject({ from: 31 });
    if (mini.type !== 'tally') throw new Error('tally expected');
    expect(mini.cells).toEqual(['filled', 'empty', 'empty', 'empty', 'empty']);
  });
  it('중간 칸을 뗐으면 가장 앞 빈칸의 묶음이다', () => {
    const mini = buildWidgetSnapshot([tally(60, [0, 1, 3, ...range(40, 4)])], at(2026, 9, 6)).goals[0].mini;
    expect(mini).toMatchObject({ from: 1 });
  });
  it('빈칸이 없으면 마지막 묶음', () => {
    const mini = buildWidgetSnapshot([tally(60, range(60))], at(2026, 9, 6)).goals[0].mini;
    expect(mini).toMatchObject({ from: 31 });
  });
});

describe('위젯 스냅샷 · 목록', () => {
  it('완성한 판은 빼고, 기본 목표는 가장 최근에 붙인 목표다', () => {
    const a = cal({ goal: goal({ id: 'a', lastPlacedAt: at(2026, 9, 2).getTime() }) });
    const b = cal({ goal: goal({ id: 'b', lastPlacedAt: at(2026, 9, 5).getTime() }) });
    const done = cal({ goal: goal({ id: 'c', completedAt: at(2026, 9, 5).getTime(), lastPlacedAt: at(2026, 9, 6).getTime() }) });
    const snap = buildWidgetSnapshot([a, b, done], at(2026, 9, 6));
    expect(snap.goals.map((g) => g.id)).toEqual(['b', 'a']);
    expect(snap.defaultGoalId).toBe('b');
  });
  it('목표가 없으면 빈 목록과 null', () => {
    expect(buildWidgetSnapshot([], at(2026, 9, 6))).toEqual({ today: '2026-09-06', goals: [], defaultGoalId: null });
  });
  it('목록 카드와 같은 문구 함수를 쓴다', () => {
    const snap = buildWidgetSnapshot([cal({ goal: goal({ boardType: 'tally', totalSlots: 10 }), placedAll: 4 })], at(2026, 9, 6));
    expect(snap.goals[0]).toMatchObject({ kind: '적립판', progressLabel: '40%', percent: 40, sticker: 'sprout' });
  });
});
```

Run: `npx jest __tests__/widgetSnapshot.test.ts` → FAIL

- [ ] **Step 2: 타입 파일** — `src/design-system/widget-preview.tsx`에 Produces의 타입 블록을 그대로 쓰고, `src/design-system/index.ts`에 `export * from './widget-preview';` 추가.

- [ ] **Step 3: 구현**

```ts
// src/widgets/snapshot.ts
import type { Goal } from '../domain/types';
import type { DateKey } from '../domain/dates';
import { dateKeyOf, daysInMonth, localDateKey } from '../domain/dates';
import { inPeriod, orderGoals, progressBasis, progressOf } from '../domain/board';
import { kindLabel, percentLabel, safeStickerId } from '../app-data/pocketAdapter';
import type { WidgetCalendarCell, WidgetGoalView, WidgetMini, WidgetTallyCell } from '../design-system/widget-preview';

/**
 * 위젯 입력. 달력판은 이번 달에 붙인 날짜, 적립판은 붙인 칸 번호(0부터)를 준다.
 * 이번 달 기준 진행은 placedDates로 여기서 센다 — 자정 타임라인에서 다음 달을 만들 때도 맞게 하기 위해서다.
 */
export type WidgetInput = { goal: Goal; placedAll: number; placedDates: DateKey[]; slotIndexes: number[] };
export type WidgetSnapshot = { today: DateKey; goals: WidgetGoalView[]; defaultGoalId: string | null };

/** 적립판 중간 크기에 보이는 칸 수. 실제 위젯 크기에 렌더해 보고 정한다 (위젯 설계). */
export const TALLY_CHUNK = 30;

function calendarMini(goal: Goal, placed: ReadonlySet<DateKey>, now: Date): WidgetMini {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = localDateKey(now.getTime());
  const days: WidgetCalendarCell[] = [];
  for (let d = 1; d <= daysInMonth(year, month); d++) {
    const key = dateKeyOf(year, month, d);
    days.push(!inPeriod(goal, key) ? 'outside' : placed.has(key) ? 'filled' : key < today ? 'missed' : 'future');
  }
  return { type: 'calendar', year, month, firstWeekday: new Date(year, month - 1, 1).getDay(), days };
}

function tallyMini(goal: Goal, slotIndexes: readonly number[], chunk: number): WidgetMini {
  const total = goal.totalSlots ?? 0;
  const taken = new Set(slotIndexes);
  let next = 0;
  while (next < total && taken.has(next)) next++;
  const anchor = next < total ? next : Math.max(total - 1, 0);
  const start = Math.floor(anchor / chunk) * chunk;
  const cells: WidgetTallyCell[] = [];
  for (let i = start; i < Math.min(start + chunk, total); i++) cells.push(taken.has(i) ? 'filled' : 'empty');
  return { type: 'tally', from: start + 1, cells, placed: taken.size, total };
}

/** 앱이 만들어 위젯에 넘긴다. 내 목표 탭의 목표만, 목록과 같은 순서로 (위젯 설계). */
export function buildWidgetSnapshot(inputs: readonly WidgetInput[], now: Date, chunk = TALLY_CHUNK): WidgetSnapshot {
  const byId = new Map(inputs.map((i) => [i.goal.id, i]));
  const { active } = orderGoals(inputs.map((i) => i.goal));
  const goals = active.map((goal): WidgetGoalView => {
    const input = byId.get(goal.id)!;
    const basis = progressBasis(goal, now);
    const placed = basis.kind === 'all'
      ? input.placedAll
      : input.placedDates.filter((d) => d.startsWith(`${basis.year}-${String(basis.month).padStart(2, '0')}-`)).length;
    return {
      id: goal.id,
      name: goal.name,
      sticker: safeStickerId(goal.defaultStickerId),
      kind: kindLabel(goal),
      progressLabel: percentLabel(goal, placed, now),
      percent: progressOf(goal, placed, now).percent,
      mini: goal.boardType === 'calendar'
        ? calendarMini(goal, new Set(input.placedDates), now)
        : tallyMini(goal, input.slotIndexes, chunk),
    };
  });
  return { today: localDateKey(now.getTime()), goals, defaultGoalId: goals[0]?.id ?? null };
}
```

- [ ] **Step 4: 통과 확인** — Run: `npx jest __tests__/widgetSnapshot.test.ts` → PASS. 문구가 테스트 기대와 다르면 **기존 목록 카드 문구(`percentLabel`)가 기준**이다. 구현을 바꾸지 말고 테스트 기대값을 목록 카드 결과에 맞춘 뒤 보고에 적는다.

- [ ] **Step 5: 커밋**

```bash
git add src/widgets/snapshot.ts src/design-system/widget-preview.tsx src/design-system/index.ts __tests__/widgetSnapshot.test.ts
git commit -m "feat(widgets): build widget snapshot from goals with calendar and tally minis"
```

### Task C2: DB에서 스냅샷 입력 읽기

**Files:**
- Create: `src/widgets/loadSnapshot.ts`
- Test: `__tests__/loadWidgetSnapshot.test.ts`

**Interfaces:**
- Consumes: `buildWidgetSnapshot`, `WidgetInput`, `WidgetSnapshot` (C1), `listGoals` (goalRepository), `listStickers`, `listStickersInRange` (stickerRepository), `monthRange(year, month): [number, number]` (`src/app-data/boardData.ts`), `isCompleted`, `localDateKey`
- Produces: `loadWidgetSnapshot(now: Date): Promise<WidgetSnapshot>`

- [ ] **Step 1: 실패하는 테스트**

```ts
// __tests__/loadWidgetSnapshot.test.ts
import { createGoal } from '../src/repositories/goalRepository';
import { placeSticker } from '../src/repositories/stickerRepository';
import { loadWidgetSnapshot } from '../src/widgets/loadSnapshot';
import { withFreshDb } from './support/setup';

withFreshDb();

describe('loadWidgetSnapshot', () => {
  it('진행 중인 목표를 읽어 스냅샷을 만든다', async () => {
    // 달력판을 먼저 만든다. 적립판에 나중에 붙여야 적립판이 "가장 최근"이 된다.
    await createGoal({ name: '산책', boardType: 'calendar', totalSlots: null });
    const t = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 5 });
    await placeSticker(t.id, 0);
    await placeSticker(t.id, 2);
    const snap = await loadWidgetSnapshot(new Date());
    expect(snap.goals).toHaveLength(2);
    const tally = snap.goals.find((g) => g.id === t.id)!;
    expect(tally.mini).toMatchObject({ type: 'tally', placed: 2, total: 5, cells: ['filled', 'empty', 'filled', 'empty', 'empty'] });
    expect(snap.defaultGoalId).toBe(t.id);
  });
});
```

Run → FAIL

- [ ] **Step 2: 구현**

```ts
// src/widgets/loadSnapshot.ts
import { listGoals } from '../repositories/goalRepository';
import { listStickers, listStickersInRange } from '../repositories/stickerRepository';
import { monthRange } from '../app-data/boardData';
import { isCompleted } from '../domain/board';
import { localDateKey } from '../domain/dates';
import { buildWidgetSnapshot } from './snapshot';
import type { WidgetInput, WidgetSnapshot } from './snapshot';

/** 진행 중인 목표만 읽는다. 종료일 없는 달력판은 이번 달만 읽는다 (PRD 6.3). */
export async function loadWidgetSnapshot(now: Date): Promise<WidgetSnapshot> {
  const goals = (await listGoals()).filter((g) => !isCompleted(g));
  const [from, to] = monthRange(now.getFullYear(), now.getMonth() + 1);
  const inputs: WidgetInput[] = [];
  for (const goal of goals) {
    if (goal.boardType === 'tally') {
      const stickers = await listStickers(goal.id);
      inputs.push({ goal, placedAll: stickers.length, placedDates: [], slotIndexes: stickers.map((s) => s.slotIndex) });
      continue;
    }
    const month = await listStickersInRange(goal.id, from, to);
    const placedAll = goal.endDate === null ? month.length : (await listStickers(goal.id)).length;
    inputs.push({ goal, placedAll, placedDates: month.map((s) => localDateKey(s.placedAt)), slotIndexes: [] });
  }
  return buildWidgetSnapshot(inputs, now);
}
```

- [ ] **Step 3: 통과 확인** — Run: `npm test` → PASS

- [ ] **Step 4: 커밋**

```bash
git add src/widgets/loadSnapshot.ts __tests__/loadWidgetSnapshot.test.ts
git commit -m "feat(widgets): load widget snapshot inputs from the local database"
```

### Task C3: 위젯 미리보기 컴포넌트와 스토리

**Files:**
- Modify: `src/design-system/widget-preview.tsx`(컴포넌트 추가)
- Create: `stories/WidgetPreview.stories.tsx`
- Test: `src/design-system/widget-preview.test.tsx`

**Interfaces:**
- Consumes: `WidgetGoalView` (C1), `buildWidgetSnapshot` (스토리 예시), 기존 `PixelFrame`, `PixelText`, `PixelBadge`, `ProgressBar` (`components.tsx`), `StickerGlyph({id,size})` (`sticker-glyphs.tsx`), `retro` (`tokens.ts`)
- Produces: `WIDGET_SIZES`, `WidgetSmallPreview({goal})`, `WidgetMediumPreview({goal})`, `WidgetEmptyPreview()`

- [ ] **Step 1: 실패하는 테스트**

```tsx
// src/design-system/widget-preview.test.tsx
import React from 'react';
import {afterEach,describe,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {WidgetEmptyPreview,WidgetMediumPreview,WidgetSmallPreview} from './widget-preview';
import type {WidgetGoalView} from './widget-preview';
afterEach(cleanup);
const cal:WidgetGoalView={id:'g',name:'산책하기',sticker:'sprout',kind:'달력판',progressLabel:'이번 달 62%',percent:62,
  mini:{type:'calendar',year:2026,month:9,firstWeekday:2,days:['filled','missed',...Array(28).fill('future')]}};
const tally:WidgetGoalView={id:'t',name:'책 읽기',sticker:'book',kind:'적립판',progressLabel:'45%',percent:45,
  mini:{type:'tally',from:31,cells:[...Array(15).fill('filled'),...Array(15).fill('empty')],placed:45,total:100}};
describe('위젯 미리보기',()=>{
  it('작은 크기는 이름·판 종류·진행 문구를 보여준다',()=>{
    render(<WidgetSmallPreview goal={cal}/>);
    expect(screen.getByText('산책하기')).toBeTruthy();
    expect(screen.getByText('달력판')).toBeTruthy();
    expect(screen.getByText('이번 달 62%')).toBeTruthy();
  });
  it('중간 크기 달력판은 날짜 칸을 그린다',()=>{
    render(<WidgetMediumPreview goal={cal}/>);
    expect(screen.getAllByTestId(/^day-/)).toHaveLength(30);
  });
  it('중간 크기 적립판은 묶음 칸과 전체 수를 보여준다',()=>{
    render(<WidgetMediumPreview goal={tally}/>);
    expect(screen.getAllByTestId(/^slot-/)).toHaveLength(30);
    expect(screen.getByTestId('slot-31')).toBeTruthy();
    expect(screen.getByText('45/100 · 45%')).toBeTruthy();
  });
  it('목표가 없으면 안내만 보여준다',()=>{
    render(<WidgetEmptyPreview/>);
    expect(screen.getByText('첫 목표를 만들어 보세요')).toBeTruthy();
  });
});
```

Run: `npm run test:components -- widget-preview` → FAIL

- [ ] **Step 2: 구현** — 타입 블록 아래에 추가. 새 색을 만들지 않고 `retro.color`만 쓴다.

```tsx
import React from 'react';
import {View} from 'react-native';
import {PixelBadge,PixelFrame,PixelText,ProgressBar} from './components';
import {StickerGlyph} from './sticker-glyphs';
import {retro} from './tokens';

/** iPhone 기준 작은·중간 위젯의 대략 크기(pt). 시안 검토용이다. */
export const WIDGET_SIZES={small:{width:158,height:158},medium:{width:338,height:158}} as const;

const cellColor={filled:retro.color.ink,missed:retro.color.lcd,future:retro.color.secondary,outside:retro.color.transparent,empty:retro.color.secondary} as const;

function Cell({state,testID}:{state:keyof typeof cellColor;testID?:string}) {
  return <View testID={testID} style={{width:14,height:14,backgroundColor:cellColor[state],borderWidth:state==='outside'?0:1,borderColor:retro.color.ink}}/>;
}

/** 작은 위젯: 목록 카드와 같은 정보 (위젯 설계). */
export function WidgetSmallPreview({goal}:{goal:WidgetGoalView}) {
  return <PixelFrame variant="panel" style={WIDGET_SIZES.small} contentStyle={{padding:12,gap:6,flex:1}}>
    <StickerGlyph id={goal.sticker} size={28}/>
    <PixelText numberOfLines={2} style={{fontSize:15,lineHeight:20}}>{goal.name}</PixelText>
    <PixelBadge label={goal.kind}/>
    <PixelText style={{fontSize:13,lineHeight:18}}>{goal.progressLabel}</PixelText>
    <ProgressBar value={goal.percent} total={100}/>
  </PixelFrame>;
}

/** 중간 위젯: 판 미니. 달력판은 이번 달, 적립판은 다음 빈칸이 든 묶음. */
export function WidgetMediumPreview({goal}:{goal:WidgetGoalView}) {
  const m=goal.mini;
  return <PixelFrame variant="panel" style={WIDGET_SIZES.medium} contentStyle={{padding:12,gap:8,flex:1}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
      <StickerGlyph id={goal.sticker} size={22}/>
      <PixelText numberOfLines={1} style={{flex:1,fontSize:15,lineHeight:20}}>{goal.name}</PixelText>
      <PixelBadge label={goal.kind}/>
    </View>
    {m.type==='calendar'
      ?<View style={{flexDirection:'row',flexWrap:'wrap',gap:3,width:7*17}}>
        {Array.from({length:m.firstWeekday}).map((_,i)=><Cell key={`pad-${i}`} state="outside"/>)}
        {m.days.map((d,i)=><Cell key={i} testID={`day-${i+1}`} state={d}/>)}
      </View>
      :<View style={{flexDirection:'row',flexWrap:'wrap',gap:3}}>
        {m.cells.map((c,i)=><Cell key={i} testID={`slot-${m.from+i}`} state={c}/>)}
      </View>}
    <PixelText style={{fontSize:13,lineHeight:18,textAlign:'right'}}>{m.type==='tally'?`${m.placed}/${m.total} · ${goal.progressLabel}`:goal.progressLabel}</PixelText>
  </PixelFrame>;
}

/** 목표가 없거나 로그아웃 뒤 빈 기기. 재촉 문구를 쓰지 않는다. */
export function WidgetEmptyPreview() {
  return <PixelFrame variant="panel" style={WIDGET_SIZES.small} contentStyle={{padding:12,flex:1,justifyContent:'center'}}>
    <PixelText style={{fontSize:15,lineHeight:20,textAlign:'center'}}>첫 목표를 만들어 보세요</PixelText>
  </PixelFrame>;
}
```

- [ ] **Step 3: 통과 확인** — Run: `npm run test:components` → PASS

- [ ] **Step 4: 스토리**

```tsx
// stories/WidgetPreview.stories.tsx
import React from 'react';
import {View} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {WidgetEmptyPreview,WidgetMediumPreview,WidgetSmallPreview} from '../src/design-system';
import {buildWidgetSnapshot} from '../src/widgets/snapshot';
import type {WidgetInput} from '../src/widgets/snapshot';
import type {Goal} from '../src/domain/types';

const meta={title:'Widgets/Preview',parameters:{docs:{description:{component:'홈 화면 위젯 시안 검토용 RN 미리보기 (위젯 설계). 실제 위젯은 iOS SwiftUI·Android 위젯으로 따로 그린다. 앱 동작에 연결되지 않습니다.'}}}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;

const now=new Date(2026,8,16,12);
const base:Goal={id:'g',name:'산책하기',boardType:'calendar',totalSlots:null,defaultStickerId:'shoe',createdAt:new Date(2026,8,1).getTime(),endDate:null,completedAt:null,completionSeen:false,lastPlacedAt:null,initialSlots:null};
const days=(n:number)=>Array.from({length:n},(_,i)=>`2026-09-${String(i+1).padStart(2,'0')}`).filter((_,i)=>i%3!==1);
const examples:Record<string,WidgetInput>={
  calendar:{goal:base,placedAll:10,placedDates:days(15),slotIndexes:[]},
  period:{goal:{...base,id:'p',name:'10월 전 매일 스트레칭',endDate:'2026-09-30',defaultStickerId:'star'},placedAll:10,placedDates:days(15),slotIndexes:[]},
  tally:{goal:{...base,id:'t',name:'책 20권 읽기',boardType:'tally',totalSlots:20,initialSlots:20,defaultStickerId:'book'},placedAll:7,placedDates:[],slotIndexes:[0,1,2,3,4,5,6]},
  big:{goal:{...base,id:'b',name:'물 100잔',boardType:'tally',totalSlots:100,initialSlots:100,defaultStickerId:'flower'},placedAll:45,placedDates:[],slotIndexes:Array.from({length:45},(_,i)=>i)},
};
function Pair({input}:{input:WidgetInput}) {
  const goal=buildWidgetSnapshot([input],now).goals[0];
  return <View style={{flexDirection:'row',gap:16,padding:16,flexWrap:'wrap'}}><WidgetSmallPreview goal={goal}/><WidgetMediumPreview goal={goal}/></View>;
}
export const Calendar:Story={name:'달력판 · 종료일 없음',render:()=><Pair input={examples.calendar}/>};
export const Period:Story={name:'달력판 · 종료일 있음',render:()=><Pair input={examples.period}/>};
export const Tally:Story={name:'적립판 · 20칸',render:()=><Pair input={examples.tally}/>};
export const BigTally:Story={name:'적립판 · 100칸 중 45칸 (묶음)',render:()=><Pair input={examples.big}/>};
export const Empty:Story={name:'목표 없음',render:()=><View style={{padding:16}}><WidgetEmptyPreview/></View>};
```

- [ ] **Step 5: 렌더해서 보기** — `npm run storybook` → 다섯 장면 캡처를 직접 연다. 적립판 30칸 묶음이 중간 크기 안에 들어가는지 확인한다. 넘치면 `TALLY_CHUNK`를 임의로 바꾸지 말고 **캡처와 함께 사용자에게 묶음 크기를 묻는다**(위젯 설계의 미정 항목).

- [ ] **Step 6: 검사** — Run: `npm run typecheck && npm run lint && npm run check:storybook` → PASS

- [ ] **Step 7: 커밋**

```bash
git add src/design-system/widget-preview.tsx src/design-system/widget-preview.test.tsx stories/WidgetPreview.stories.tsx
git commit -m "feat(design-system): widget previews for small and medium sizes"
```

---

### Task Z: 마무리 확인과 문서

**Files:** Modify `docs/HANDOFF.md`. `docs/DEV-SETUP.md`는 건드리지 않는다(개발 빌드 전환은 다음 단계).

- [ ] **Step 1: 전체 검사**

```bash
npm test && npm run test:components && npm run typecheck && npm run lint
npx expo export --platform ios --output-dir /tmp/check && rm -rf /tmp/check
```

모두 통과해야 한다. 실패하면 출력 그대로 보고한다.

- [ ] **Step 2: Expo Go 실행 확인** — `npx expo start --lan`으로 기존 흐름(목표 만들기, 붙이기, 떼기, 기록 저장, 목표 삭제)이 v5 마이그레이션 뒤에도 그대로 되는지, 앱 설정 → 약관과 라이선스가 열리는지 확인한다. 실기기·시뮬레이터 중 무엇으로 확인했는지, 확인하지 못한 것은 무엇인지 적는다.

- [ ] **Step 3: HANDOFF 갱신** — 9절에 "2026-09-30 Expo Go 단계" 항목을 추가한다: 스키마 v5, outbox, 전송기·복원(가짜 서버로만 검증, 실서버 없음), 약관 화면(정책 사이트 미게시라 404), 동의 화면·위젯 미리보기(Storybook 전용), 남은 것은 이 계획의 "들어가지 않는 것" 목록. 사용자가 따로 남긴 HANDOFF의 커밋 안 된 줄(기록 화면 스타일 버그 메모)은 건드리지 않고, 이 커밋에 섞지 않는다(`git add -p`로 내 변경만).

- [ ] **Step 4: 커밋**

```bash
git add -p docs/HANDOFF.md
git commit -m "docs(handoff): record Expo Go phase status"
```
