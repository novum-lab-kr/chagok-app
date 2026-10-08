# 스티커 묶음·구매 화면 Storybook 반영 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2026-10-08 확정한 스티커 묶음·구매 화면(PRD 4.12)을 디자인 시스템 컴포넌트와 Storybook 스토리로 만들고, 화면 흐름도(`Flows/앱 전체`)에 넣는다.

**Architecture:** 디자인 시스템이 흑백(`PocketStickerId`)과 컬러(`ColorStickerId`)를 함께 받는 `StickerId`로 넓어지고, `StickerGlyph`가 컬러 ID면 컬러 도트로 그린다. 새 화면(「기본 스티커」·묶음 화면)과 부품은 새 파일 `src/design-system/sticker-shop.tsx`에 모은다. 앱 설정은 「구매」 블럭과 계정 표시만 바꾼다. **앱(Expo 화면·DB·결제·광고)은 이 계획에서 건드리지 않는다** — 앱은 계속 흑백 ID를 넘기고 그대로 돌아간다. 앱 연결·스키마 v6·RevenueCat·AdMob은 다음 계획이다.

**Tech Stack:** React Native(Expo 57) + react-native-web, react-native-svg, Storybook(`@storybook/react-vite`), vitest + @testing-library/react(컴포넌트 테스트), `@zigbang/storybook-addon-story-flow`(흐름도).

**Spec:** `docs/PRD.md` 4.12(그리고 4.4·4.9·4.10), `docs/RELEASE-DECISIONS.md` 10월 5~8일 줄, 확정 시안 https://claude.ai/artifact/MX8DFS3TUf5KHFX5F3gMCH 19판. 시안 캡처를 만든 임시 스토리 `stories/_proposal/StickerScreens.stories.tsx`(커밋 안 함)의 `Z*`·`F01~F03`·`F14` 스토리가 화면 모양의 기준이다 — 옮길 때 그 JSX를 참고한다.

## Global Constraints

- 작업 위치: worktree `/Users/eunjukim/Desktop/workspace/chagok-wt-sticker-screens`, 브랜치 `docs/sticker-screens`. main 작업 트리(`chagok-app`)에는 쓰지 않는다.
- `src/design-system/` 토큰·프레임·팔레트의 **기존 값은 바꾸지 않는다.** 추가만 한다. 예외는 사용자가 확정한 스티커 크기(판 칸 44 → 48, 목록 카드 40 → 48 — RELEASE-DECISIONS 2026-10-07 「판·목록 스티커는 48pt」).
- `package.json` `overrides`(react-dom 19.2.3)는 건드리지 않는다. 새 의존성은 없다.
- 컬러 스티커는 24의 정수배 크기로만 그린다(24·48·72). 흐려지지 않게.
- 화면 문구는 PRD 4.12의 문구를 한 글자도 바꾸지 않고 쓴다. 「보상」이라는 말은 화면에 쓰지 않는다. 목록은 쉼표로 잇는다(「동물 묶음, 간식 묶음, 광고 제거」).
- 코드 스타일은 주변 파일을 따른다(디자인 시스템 파일은 콜론 뒤 공백 없는 압축형, 한국어 주석은 사용자 관점).
- 커밋은 사용자가 Storybook에서 확인한 뒤에만 한다(WORKING-AGREEMENT). 각 Task의 「Commit」 단계는 사용자 확인을 받은 뒤 실행한다. push는 하지 않는다.
- 화면을 추가·변경했으므로 같은 작업에서 흐름도도 맞춘다(AGENTS.md).

## Review Focus

1. **체험 중 묶음이 「내 스티커」에서 빠지는 일** — 체험 중(`trial`) 묶음은 잠긴 묶음이 아니므로 「내 스티커」에 보여야 한다. Task 3 테스트가 고정한다.
2. **지금 고른 스티커가 접힌 묶음에 있을 때** — 화면을 처음 열면 고른 스티커가 든 묶음이 펼쳐져 있어야 하고, 접힌 줄의 5개 안에 고른 스티커가 있으면 링이 보여야 한다. Task 3 테스트.
3. **광고 제거를 산 사람의 묶음 화면** — 광고 버튼 자체가 없어야 한다(흐리게가 아니라 없음). Task 4 테스트.
4. **붙인 날이 모자랄 때 [3일 무료로 써 보기]** — 보이되 누를 수 없고(onPress 안 불림), 바로 아래 진행 글자가 있어야 한다. Task 4 테스트.
5. **흑백 ID를 넘기는 기존 앱 화면** — 타입을 넓힌 뒤에도 흑백 스티커가 지금과 같이 잉크 한 색으로 그려져야 한다(앱은 아직 흑백). Task 1 테스트.

---

## 파일 구조

| 파일 | 할 일 |
|---|---|
| `src/design-system/sticker-glyphs.tsx` | `StickerId`, `isColorStickerId`, `toColorStickerId`, `StickerGlyph`(컬러 지원·24배수), `stickerLabel`(둘 다), `ActionSymbol`에 `lock`·`play` 추가 |
| `src/design-system/*.tsx` (PocketStickerId를 받는 곳) | 타입을 `StickerId`로 넓힘. 판 칸 44 → 48, 목록 카드 40 → 48 |
| `src/design-system/composition-controls.tsx` | `InfoRow` 추가 |
| `src/design-system/sticker-shop.tsx` (새 파일) | 묶음 부품·「기본 스티커」 화면·묶음 화면·구매 블럭·다이얼로그 문구 |
| `src/design-system/sticker-shop.test.tsx` (새 파일) | 위 컴포넌트 테스트 |
| `src/design-system/account-screens.tsx` | 연결된 계정을 항목 + 값으로 |
| `src/design-system/board-screens.tsx` | `GoalListScreen`에 `footer`(광고 자리), `StickerField`에 `onChoose` |
| `src/design-system/index.ts` | `sticker-shop` 내보내기 |
| `stories/StickerShop.stories.tsx` (새 파일) | 「기본 스티커」·묶음 화면·다이얼로그 스토리 |
| `stories/AccountBackup.stories.tsx`, `stories/HomeStructure.stories.tsx` | 앱 설정에 구매 블럭·복원 결과, 홈에 광고 자리, 스티커를 컬러로 |
| `stories/flows/app-flow.json`, `stories/flows/appFlow.ts`, `stories/flows/README.md` | 노드·화살표·자리·시나리오 |
| `docs/HANDOFF.md`, `docs/DESIGN-SYSTEM.md` | 현황 |
| `stories/_proposal/` | 마지막에 치운다 |

---

### Task 1: 컬러 스티커를 받는 `StickerGlyph`와 `StickerId`

**Files:**
- Modify: `src/design-system/sticker-glyphs.tsx`
- Modify: `src/design-system/components.tsx`, `composition-controls.tsx`, `calendar.tsx`, `screen-compositions.tsx`, `board-screens.tsx`, `first-run-tutorial.tsx`, `widget-preview.tsx` (타입만, 그리고 크기 두 곳)
- Test: `src/design-system/components.test.tsx`

**Interfaces:**
- Produces:
  - `type StickerId = PocketStickerId | ColorStickerId`
  - `isColorStickerId(id: StickerId): id is ColorStickerId`
  - `toColorStickerId(id: PocketStickerId): ColorStickerId` — `basic.${id}` (다음 계획의 스키마 v6 마이그레이션도 쓴다)
  - `StickerGlyph({id: StickerId; size?: number})` — 컬러면 `Math.max(24, Math.floor(size/24)*24)` 크기로 그린다
  - `stickerLabel(id: StickerId): string`
  - `ActionSymbolName`에 `'lock' | 'play'`

- [ ] **Step 1: 실패하는 테스트**

`src/design-system/components.test.tsx` 맨 아래 `describe` 안에 추가하고, import 줄에 `StickerGlyph,stickerLabel,toColorStickerId,ActionSymbol`을 더한다.

```tsx
  it('컬러 스티커는 색별 층으로, 흑백 스티커는 잉크 한 색으로 그리고 컬러는 24의 배수로 맞춘다',()=>{
    const {container,rerender}=render(<StickerGlyph id="basic.sprout" size={44}/>);
    expect(container.querySelector('svg')!.getAttribute('width')).toBe('24');
    expect(new Set([...container.querySelectorAll('path')].map(p=>p.getAttribute('fill'))).size).toBeGreaterThan(1);
    rerender(<StickerGlyph id="sprout" size={44}/>);
    expect(new Set([...container.querySelectorAll('path')].map(p=>p.getAttribute('fill')))).toEqual(new Set([retro.color.ink]));
  });
  it('스티커 이름은 흑백·컬러 모두 읽고, 흑백 ID는 같은 그림의 기본 묶음 컬러 ID로 바꾼다',()=>{
    expect(stickerLabel('book')).toBe('책');
    expect(stickerLabel('animals.dog')).toBe('강아지');
    expect(toColorStickerId('sprout')).toBe('basic.sprout');
  });
  it('자물쇠와 재생 기호를 그린다',()=>{
    const {container}=render(<><ActionSymbol name="lock"/><ActionSymbol name="play"/></>);
    expect([...container.querySelectorAll('path')].every(p=>(p.getAttribute('d')??'').length>0)).toBe(true);
  });
```

`retro`는 이미 import 돼 있다. 먼저 확인할 것: 흑백 그림(`src/stickers/pocket/StickerArtwork.tsx`)이 `color`로 받은 한 색만 쓰는지(아니면 두 번째 단언을 그 파일의 실제 색으로), `'animals.dog'`의 이름이 「강아지」인지(`src/stickers/color/stickers.generated.ts`).

- [ ] **Step 2: 실패 확인**

Run: `npm run test:components -- src/design-system/components.test.tsx`
Expected: FAIL — `toColorStickerId`가 없음, 컬러 ID에서 흑백 카탈로그가 `Unknown` 오류.

- [ ] **Step 3: 구현**

`src/design-system/sticker-glyphs.tsx`의 위쪽을 아래처럼 바꾼다(`ActionSymbol` 본문의 기존 기호는 그대로 두고 두 개만 더한다).

```tsx
import React from 'react';
import { Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { retro } from './tokens';
import { StickerArtwork } from '../stickers/pocket/StickerArtwork';
import { getPocketSticker, type PocketStickerId } from '../stickers/pocket/catalog';
import { ColorStickerArtwork } from '../stickers/color/ColorStickerArtwork';
import { getColorSticker, type ColorStickerId } from '../stickers/color/catalog';
export { pocketStickers } from '../stickers/pocket/catalog';
export type { PocketStickerId } from '../stickers/pocket/catalog';
export type { ColorStickerId } from '../stickers/color/catalog';

/** 흑백(예전 6종)과 컬러(`묶음.이름`)를 함께 받는다. 앱은 스키마 v6 전까지 흑백 ID를 넘긴다 (2026-10-08). */
export type StickerId=PocketStickerId|ColorStickerId;
export const isColorStickerId=(id:StickerId):id is ColorStickerId=>id.includes('.');
/** 흑백 6종은 기본 묶음에 같은 그림이 있다. */
export const toColorStickerId=(id:PocketStickerId)=>`basic.${id}` as ColorStickerId;
export const stickerLabel=(id:StickerId)=>isColorStickerId(id)?getColorSticker(id).label:getPocketSticker(id).label;

/** Design-system adapter; artwork and metadata live in the sticker library. 컬러는 24칸 도트라 24의 배수로만 그린다. */
export function StickerGlyph({id,size=48}:{id:StickerId;size?:number}) {
  if(isColorStickerId(id)) return <ColorStickerArtwork id={id} size={Math.max(24,Math.floor(size/24)*24)}/>;
  return <StickerArtwork id={id} size={size} color={retro.color.ink}/>;
}
export type ActionSymbolName='back'|'check'|'photo'|'trash'|'minus'|'close'|'lock'|'play';
```

`symbols` 객체에 두 줄을 더한다(시안 임시 스토리 `LockSymbol`·`PlaySymbol`과 같은 그림):

```tsx
lock:'M5 1H11V2H12V6H14V15H2V6H4V2H5ZM6 3V6H10V3ZM7 9V12H9V9Z',
play:'M3 1H6V3H8V5H10V7H12V9H10V11H8V13H6V15H3Z',
```

`ColorStickerArtwork`의 props가 `{id,size}`인지 `src/stickers/color/ColorStickerArtwork.tsx`에서 확인한다. 예전 `export { pocketStickers, stickerLabel } from '../stickers/pocket/catalog'` 줄은 위처럼 `pocketStickers`만 남긴다(`stickerLabel`은 새 함수가 대신한다).

- [ ] **Step 4: 타입 넓히기와 크기**

디자인 시스템에서 스티커를 받는 자리의 `PocketStickerId`를 `StickerId`로 바꾼다. 목록:

```sh
grep -n "PocketStickerId" src/design-system/*.tsx | grep -v test
```

**흑백 그대로 둘 곳:** `StickerPicker`의 `value`·`onChange`(앱이 지금 쓰는 흑백 고르기, `pocketStickers` 목록). 그 밖(`StickerSummary`, `RecordSummary`, `GoalSummaryCard`, `BoardProgressRow`, `CompletionSticker`, `GoalStickerCell`, `PocketGoal`, `TallyBoardView`, `CalendarBoardView`, `BoardDetailScreen`, `TallyCell`, `TallyGrid`, `GoalCardItem`, `CalendarBoard`, `CalendarDay`, `first-run-tutorial` `filledWith`, `WidgetGoalView`, `StickerField`, `GoalSettingsScreen`, `CompletedGoalSettingsScreen`, `NewGoalScreen`)은 `StickerId`. `StickerField`가 `StickerPicker`에 값을 넘기는 곳은 `value as PocketStickerId`로 캐스팅하고 이유를 주석으로 남긴다(화면 안 고르기는 흑백 목표에서만 열린다 — Task 5에서 컬러는 「기본 스티커」 화면으로 간다).

크기 두 곳(사용자 확정 48pt):
- `src/design-system/screen-compositions.tsx` `GoalStickerCell`: `<StickerGlyph id={sticker} size={44}/>` → `size={48}`
- `src/design-system/composition-controls.tsx` `GoalSummaryCard`: `<StickerGlyph id={sticker} size={40}/>` → `size={48}`

- [ ] **Step 5: 통과 확인**

Run: `npm run test:components && npm run typecheck`
Expected: 모두 PASS. `app/`의 `PocketStickerId` 사용처는 바꾸지 않았는데도 타입 체크가 통과해야 한다(흑백은 `StickerId`에 들어간다). 판 렌더 테스트(`board-render.test.tsx`)가 44를 단언하면 48로 고친다.

- [ ] **Step 6: Commit** (사용자 확인 뒤)

```bash
git add src/design-system
git commit -m "feat(design-system): StickerGlyph draws color stickers; StickerId takes mono and color; board and list stickers 48"
```

---

### Task 2: 묶음 부품 — 보기 전환·접기·스티커 칸·붙인 날 안내·고른 스티커 줄·항목 줄

**Files:**
- Create: `src/design-system/sticker-shop.tsx`
- Create: `src/design-system/sticker-shop.test.tsx`
- Modify: `src/design-system/composition-controls.tsx` (`InfoRow`)
- Modify: `src/design-system/index.ts`

**Interfaces:**
- Consumes: Task 1의 `StickerId`, `StickerGlyph`, `stickerLabel`, `ActionSymbol` `lock`·`play`
- Produces (`sticker-shop.tsx`에서 export, `InfoRow`만 `composition-controls.tsx`):
  - `InfoRow({label: string; value: string})`
  - `PackViewSwitch({mine: boolean; onChange: (mine: boolean) => void})`
  - `FoldToggle({open: boolean; onPress: () => void})`
  - `StickerChoice({id: StickerId; selected?: boolean; onPress?: () => void})`
  - `RewardProgress({days: number; goal: number})`
  - `PickedStickerBar({sticker: StickerId; onDone: () => void})`

- [ ] **Step 1: 실패하는 테스트**

`src/design-system/sticker-shop.test.tsx`:

```tsx
import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {FoldToggle,PackViewSwitch,PickedStickerBar,RewardProgress,StickerChoice} from './sticker-shop';
import {InfoRow} from './composition-controls';
afterEach(cleanup);
describe('스티커 묶음 부품',()=>{
  it('보기 전환은 고른 쪽만 선택 상태이고 누르면 바뀐 값을 알린다',()=>{
    const change=vi.fn();render(<PackViewSwitch mine={false} onChange={change}/>);
    expect(screen.getByRole('tab',{name:'모든 묶음'}).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab',{name:'내 스티커'}).getAttribute('aria-selected')).toBe('false');
    fireEvent.click(screen.getByRole('tab',{name:'내 스티커'}));expect(change).toHaveBeenCalledWith(true);
  });
  it('접기 버튼은 상태에 맞는 이름을 갖는다',()=>{
    const press=vi.fn();const {rerender}=render(<FoldToggle open={false} onPress={press}/>);
    fireEvent.click(screen.getByRole('button',{name:'펼치기'}));expect(press).toHaveBeenCalledTimes(1);
    rerender(<FoldToggle open onPress={press}/>);expect(screen.getByRole('button',{name:'접기'})).toBeTruthy();
  });
  it('스티커 칸은 이름으로 읽히고 고른 칸만 선택 상태다',()=>{
    const press=vi.fn();render(<><StickerChoice id="animals.dog" selected onPress={press}/><StickerChoice id="animals.cat" onPress={press}/></>);
    expect(screen.getByRole('radio',{name:'강아지'}).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio',{name:'고양이'}));expect(press).toHaveBeenCalledTimes(1);
  });
  it('붙인 날 안내는 남은 날과 진행을, 다 모이면 고르라는 말을 보인다',()=>{
    const {rerender}=render(<RewardProgress days={5} goal={7}/>);
    expect(screen.getByText(/스티커 붙인 날이 2일 더 모이면/)).toBeTruthy();
    expect(screen.getByText('5/7')).toBeTruthy();
    rerender(<RewardProgress days={7} goal={7}/>);
    expect(screen.getByText(/묶음 하나를 골라/)).toBeTruthy();
    expect(screen.queryByText('5/7')).toBeNull();
  });
  it('고른 스티커 줄은 이름과 [선택 완료]를 보인다',()=>{
    const done=vi.fn();render(<PickedStickerBar sticker="basic.book" onDone={done}/>);
    expect(screen.getByText('책')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'선택 완료'}));expect(done).toHaveBeenCalled();
  });
  it('항목 줄은 이름과 값을 한 줄에 보인다',()=>{
    render(<InfoRow label="연결한 계정" value="Apple"/>);
    expect(screen.getByText('연결한 계정')).toBeTruthy();expect(screen.getByText('Apple')).toBeTruthy();
  });
});
```

`animals.cat`이 「고양이」, `basic.book`이 「책」인지 `stickers.generated.ts`에서 확인한다.

- [ ] **Step 2: 실패 확인**

Run: `npm run test:components -- src/design-system/sticker-shop.test.tsx`
Expected: FAIL — `./sticker-shop` 모듈이 없음.

- [ ] **Step 3: 구현**

`src/design-system/composition-controls.tsx`의 `SettingRow` 바로 아래:

```tsx
/** 누를 수 없는 「항목 · 값」 줄. SettingRow와 같은 높이 (앱 설정 계정과 백업, 2026-10-08). */
export function InfoRow({label,value}:{label:string;value:string}) {
  return <View accessible accessibilityLabel={`${label}, ${value}`} style={{minHeight:56,flexDirection:'row',alignItems:'center',gap:8}}>
    <PixelText style={{flex:1}}>{label}</PixelText><PixelText style={{fontSize:14,lineHeight:20}}>{value}</PixelText>
  </View>;
}
```

`accessible`로 묶으면 `getByText('연결한 계정')`이 못 찾을 수 있다 — 그러면 `accessible`과 `accessibilityLabel`을 빼고 `SettingRow`처럼 두 글자를 그대로 둔다.

`src/design-system/sticker-shop.tsx`(시안 임시 스토리의 `ViewSwitch`·`Toggle`·`Cell`·`RewardBanner`·`Footer`를 옮긴 것):

```tsx
import React from 'react';
import {Pressable,View} from 'react-native';
import {retro} from './tokens';
import {PixelButton,PixelFocusRing,PixelFrame,PixelIcon,PixelText,ProgressBar} from './components';
import {SelectionBadge} from './composition-controls';
import {StickerGlyph,stickerLabel,type StickerId} from './sticker-glyphs';
import {Mascot} from './mascot';

/** 스티커 묶음과 구매 (PRD 4.12, 2026-10-08 확정 시안 19판). */
const c=retro.color;
const caption={color:c.buttonText};

/** 「기본 스티커」 맨 위 [모든 묶음 · 내 스티커]. 가운데 구분선 없이 고른 쪽 채움만으로 구분한다. */
export function PackViewSwitch({mine,onChange}:{mine:boolean;onChange:(mine:boolean)=>void}) {
  return <View accessibilityRole="tablist" style={{flexDirection:'row'}}>
    {([['모든 묶음',false],['내 스티커',true]] as const).map(([label,value])=>{
      const on=value===mine;
      return <Pressable key={label} accessibilityRole="tab" accessibilityLabel={label} aria-selected={on} accessibilityState={{selected:on}} onPress={()=>onChange(value)} style={{flex:1,marginHorizontal:4}}>
        <PixelFrame variant="selection" fill={on?c.ink:'transparent'} contentStyle={{minHeight:44,alignItems:'center',justifyContent:'center'}}>
          <PixelText style={{color:on?c.lcd:c.buttonText}}>{label}</PixelText>
        </PixelFrame>
      </Pressable>;
    })}
  </View>;
}
/** 묶음 카드 머리글 끝의 꺾쇠. 펼침은 위, 접힘은 아래를 가리킨다. */
export function FoldToggle({open,onPress}:{open:boolean;onPress:()=>void}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={open?'접기':'펼치기'} onPress={onPress} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}>
    <View style={{transform:[{rotate:open?'-90deg':'90deg'}]}}><PixelIcon name="chevron" size={16}/></View>
  </Pressable>;
}
/** 고를 수 있는 스티커 한 칸. 고르면 그림에서 6pt 띄운 포커스 링과 체크 배지. */
export function StickerChoice({id,selected=false,onPress}:{id:StickerId;selected?:boolean;onPress?:()=>void}) {
  return <Pressable accessibilityRole="radio" accessibilityLabel={stickerLabel(id)} aria-checked={selected} accessibilityState={{checked:selected}} onPress={onPress} style={{width:50,height:52,alignItems:'center',justifyContent:'center'}}>
    <StickerGlyph id={id} size={48}/>
    {selected&&<><View pointerEvents="none" style={{position:'absolute',left:-6,right:-6,top:-6,bottom:-6}}><PixelFocusRing/></View><View pointerEvents="none" style={{position:'absolute',right:-12,top:-12}}><SelectionBadge/></View></>}
  </Pressable>;
}
/** 붙인 날 안내: 붙인 날 누적 7·14·이후 30일마다 묶음 하나를 3일 써 본다. 「보상」이라는 말은 쓰지 않는다. */
export function RewardProgress({days,goal}:{days:number;goal:number}) {
  const ready=days>=goal;
  return <PixelFrame variant="dialog" fill={c.secondary} contentStyle={{padding:10,flexDirection:'row',alignItems:'center',gap:10}}>
    <Mascot pose={ready?'sparkle':'smile'} size={44}/>
    <View style={{flex:1,gap:6}}>
      <PixelText style={{fontSize:15,lineHeight:21,color:c.buttonText}}>{ready?'묶음 하나를 골라\n3일 동안 써 볼 수 있어요':`스티커 붙인 날이 ${goal-days}일 더 모이면\n묶음 하나를 3일 써 볼 수 있어요`}</PixelText>
      {ready?<PixelText variant="caption" style={caption}>{`스티커 붙인 날 ${goal}일을 모았어요`}</PixelText>
        :<View style={{flexDirection:'row',alignItems:'center',gap:8}}><View style={{flex:1}}><ProgressBar value={days} total={goal}/></View><PixelText variant="caption" style={caption}>{`${days}/${goal}`}</PixelText></View>}
    </View>
  </PixelFrame>;
}
/** 「기본 스티커」 아래 고정 줄(LCD 바탕): 고른 스티커 · 이름 · [선택 완료]. */
export function PickedStickerBar({sticker,onDone}:{sticker:StickerId;onDone:()=>void}) {
  return <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:20,paddingTop:12,paddingBottom:34,borderTopWidth:retro.shape.panelTitleBorder,borderColor:c.ink,backgroundColor:c.lcd}}>
    <PixelFrame variant="slot" fill={c.secondary} style={{width:60,height:60}} contentStyle={{width:60,height:60,alignItems:'center',justifyContent:'center'}}><StickerGlyph id={sticker} size={48}/></PixelFrame>
    <View style={{flex:1}}><PixelText variant="caption" style={caption}>고른 스티커</PixelText><PixelText variant="title" style={{fontSize:20,lineHeight:26}}>{stickerLabel(sticker)}</PixelText></View>
    <PixelButton label="선택 완료" onPress={onDone} style={{minWidth:130}}/>
  </View>;
}
```

`Mascot`의 `pose` 값 `'sparkle'`·`'smile'`이 있는지 `src/design-system/mascot.tsx`의 `MascotPose`로 확인한다(시안에서 렌더됐다). 아래 고정 줄의 `paddingBottom:34`는 시안 값이다 — 디자인 시스템에 안전 영역을 쓰는 다른 고정 줄이 있으면 그 방식을 따른다(`grep -rn "safe" src/design-system/composition-controls.tsx`).

`src/design-system/index.ts` 맨 끝에 `export * from './sticker-shop';`.

- [ ] **Step 4: 통과 확인**

Run: `npm run test:components -- src/design-system/sticker-shop.test.tsx && npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit** (사용자 확인 뒤)

```bash
git add src/design-system
git commit -m "feat(design-system): sticker pack parts — view switch, fold toggle, sticker choice, sticker-day progress, picked bar, info row"
```

---

### Task 3: 묶음 카드와 「기본 스티커」 화면

**Files:**
- Modify: `src/design-system/sticker-shop.tsx`
- Modify: `src/design-system/sticker-shop.test.tsx`

**Interfaces:**
- Consumes: Task 2의 부품 전부, `ScreenHeader`·`RetroScreen`(composition-controls), `PixelBadge`(components), `ActionSymbol`(sticker-glyphs), `colorStickerPacks`·`colorStickersInPack`·`ColorStickerPackId`·`ColorStickerId`(`../stickers/color/catalog`)
- Produces:
  - `type PackState = 'free' | 'owned' | 'locked' | 'trial'`
  - `type PackView = {id: ColorStickerPackId; label: string; state: PackState; stickers: readonly StickerId[]; trialLabel?: string}`
  - `colorPack(id: ColorStickerPackId, state: PackState, trialLabel?: string): PackView`
  - `PackCard({pack: PackView; open: boolean; selected?: StickerId; rewardReady?: boolean; onToggle: () => void; onSelect: (id: StickerId) => void; onOpenPack: () => void})`
  - `StickerChooserScreen({packs: readonly PackView[]; mine: boolean; onChangeMine: (mine: boolean) => void; selected: StickerId; onSelect: (id: StickerId) => void; openPack: ColorStickerPackId; onToggle: (id: ColorStickerPackId) => void; reward: {days: number; goal: number}; onOpenPack: (id: ColorStickerPackId) => void; onDone: () => void; onBack: () => void})`

- [ ] **Step 1: 실패하는 테스트** (`sticker-shop.test.tsx`에 추가, import에 `colorPack,PackCard,StickerChooserScreen`)

```tsx
describe('「기본 스티커」 화면',()=>{
  const packs=[colorPack('basic','free'),colorPack('animals','locked'),colorPack('snack','owned'),colorPack('weather','trial','24시간 남음')];
  const base={packs,mine:false,onChangeMine:vi.fn(),selected:'basic.book' as const,onSelect:vi.fn(),openPack:'basic' as const,onToggle:vi.fn(),reward:{days:5,goal:7},onOpenPack:vi.fn(),onDone:vi.fn(),onBack:vi.fn()};
  const titles=()=>screen.getAllByRole('heading').map(h=>h.textContent).filter(t=>t!=='기본 스티커');
  it('가진 묶음과 체험 중 묶음이 위, 잠긴 묶음이 아래다',()=>{
    render(<StickerChooserScreen {...base}/>);
    expect(titles()).toEqual(['기본','간식','날씨·계절','동물']);
  });
  it('「내 스티커」에는 잠긴 묶음이 없고 체험 중 묶음은 있다',()=>{
    render(<StickerChooserScreen {...base} mine/>);
    expect(titles()).toContain('날씨·계절');expect(titles()).not.toContain('동물');
  });
  it('펼친 묶음은 10개를, 접힌 묶음은 5개와 +n을 보이고 접힌 줄에서도 고른다',()=>{
    const pack=colorPack('snack','owned');const select=vi.fn();
    render(<PackCard pack={pack} open={false} onToggle={vi.fn()} onSelect={select} onOpenPack={vi.fn()}/>);
    expect(screen.getAllByRole('radio')).toHaveLength(5);expect(screen.getByText('+5')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('radio')[0]);expect(select).toHaveBeenCalledWith(pack.stickers[0]);
    cleanup();
    render(<PackCard pack={pack} open onToggle={vi.fn()} onSelect={vi.fn()} onOpenPack={vi.fn()}/>);
    expect(screen.getAllByRole('radio')).toHaveLength(10);
  });
  it('접힌 줄의 5개 안에 고른 스티커가 있으면 선택 표시가 보인다',()=>{
    const pack=colorPack('snack','owned');
    render(<PackCard pack={pack} open={false} selected={pack.stickers[2]} onToggle={vi.fn()} onSelect={vi.fn()} onOpenPack={vi.fn()}/>);
    expect(screen.getAllByRole('radio')[2].getAttribute('aria-checked')).toBe('true');
  });
  it('잠긴 묶음은 고를 수 없고 가림막을 누르면 묶음 화면을 연다. 배지는 가격, 붙인 날이 차면 3일 무료',()=>{
    const open=vi.fn();const {rerender}=render(<PackCard pack={colorPack('animals','locked')} open={false} onToggle={vi.fn()} onSelect={vi.fn()} onOpenPack={open}/>);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByText('2,200원')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'동물 묶음 미리 보기'}));expect(open).toHaveBeenCalled();
    rerender(<PackCard pack={colorPack('animals','locked')} open={false} rewardReady onToggle={vi.fn()} onSelect={vi.fn()} onOpenPack={open}/>);
    expect(screen.getByText('3일 무료')).toBeTruthy();
  });
  it('체험 중 묶음은 남은 시간 배지를 단다',()=>{
    render(<PackCard pack={colorPack('weather','trial','24시간 남음')} open onToggle={vi.fn()} onSelect={vi.fn()} onOpenPack={vi.fn()}/>);
    expect(screen.getByText('24시간 남음')).toBeTruthy();
  });
});
```

`colorPack('snack',…)`이 10종인지 확인한다. 머리글은 `accessibilityRole="header"`로 두며 react-native-web에서 `heading` 역할이 된다. 화면 제목(「기본 스티커」)도 `heading`이면 위 `titles()`가 걸러낸다.

- [ ] **Step 2: 실패 확인**

Run: `npm run test:components -- src/design-system/sticker-shop.test.tsx`
Expected: FAIL — `colorPack`이 없음.

- [ ] **Step 3: 구현** (`sticker-shop.tsx`에 추가하고 import를 넓힌다)

```tsx
import {PixelBadge} from './components';
import {RetroScreen,ScreenHeader} from './composition-controls';
import {ActionSymbol} from './sticker-glyphs';
import {colorStickerPacks,colorStickersInPack,type ColorStickerId,type ColorStickerPackId} from '../stickers/color/catalog';

export type PackState='free'|'owned'|'locked'|'trial';
export type PackView={id:ColorStickerPackId;label:string;state:PackState;stickers:readonly StickerId[];/** 체험 중 배지. 예: '24시간 남음', '3일 남음' */trialLabel?:string};
export function colorPack(id:ColorStickerPackId,state:PackState,trialLabel?:string):PackView {
  const pack=colorStickerPacks.find(p=>p.id===id)!;
  return {id,label:pack.label,state,stickers:colorStickersInPack(id).map(s=>s.id as ColorStickerId),trialLabel};
}
const PRICE='2,200원';

/** 묶음 카드. 가진 묶음·체험 중은 펼치거나(5개씩 두 줄) 접고(5개 + +n), 잠긴 묶음은 흐린 5개 + +n 위에 가림막. */
export function PackCard({pack,open,selected,rewardReady=false,onToggle,onSelect,onOpenPack}:{pack:PackView;open:boolean;selected?:StickerId;rewardReady?:boolean;onToggle:()=>void;onSelect:(id:StickerId)=>void;onOpenPack:()=>void}) {
  const locked=pack.state==='locked';
  const more=pack.stickers.length-5;
  const right=pack.state==='free'?<PixelText variant="caption" style={caption}>무료</PixelText>
    :pack.state==='owned'?<PixelBadge label="열었어요"/>
    :pack.state==='trial'?<PixelBadge label={pack.trialLabel??''} tone="primary"/>
    :<><PixelBadge label={rewardReady?'3일 무료':PRICE} tone="primary"/><PixelIcon name="chevron" size={16}/></>;
  const head=<View style={{flexDirection:'row',alignItems:'center',gap:8,minHeight:36}}>
    <PixelText accessibilityRole="header" style={{fontSize:20,lineHeight:26,color:c.buttonText}}>{pack.label}</PixelText>
    <PixelText variant="caption" style={caption}>{`${pack.stickers.length}종`}</PixelText><View style={{flex:1}}/>{right}
    {!locked&&<FoldToggle open={open} onPress={onToggle}/>}
  </View>;
  if(locked) return <PixelFrame variant="button" fill={c.secondary} contentStyle={{padding:14,gap:10}}>
    {head}
    <View>
      <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
        {pack.stickers.slice(0,5).map(id=><View key={id} style={{opacity:retro.opacity.disabled}}><StickerGlyph id={id} size={48}/></View>)}
        {more>0&&<PixelText style={{fontSize:16,color:c.buttonText}}>{`+${more}`}</PixelText>}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`${pack.label} 묶음 미리 보기`} onPress={onOpenPack} style={{position:'absolute',left:-4,right:-4,top:-4,bottom:-4,alignItems:'center',justifyContent:'center'}}>
        <View style={{position:'absolute',left:0,right:0,top:0,bottom:0,backgroundColor:c.secondary,opacity:0.7}}/>
        <PixelFrame variant="selection" fill={c.ink} contentStyle={{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:10,paddingVertical:4}}>
          <ActionSymbol name="lock" size={14} color={c.lcd}/><PixelText style={{color:c.lcd,fontSize:15}}>눌러서 미리 보기</PixelText>
        </PixelFrame>
      </Pressable>
    </View>
  </PixelFrame>;
  const shown=open?pack.stickers:pack.stickers.slice(0,5);
  return <PixelFrame variant="button" fill={c.secondary} contentStyle={{padding:14,gap:10}}>
    {head}
    {open
      ?<View accessibilityRole="radiogroup" style={{flexDirection:'row',flexWrap:'wrap',rowGap:14}}>{shown.map(id=><View key={id} style={{width:'20%',alignItems:'center'}}><StickerChoice id={id} selected={id===selected} onPress={()=>onSelect(id)}/></View>)}</View>
      :<View accessibilityRole="radiogroup" style={{flexDirection:'row',alignItems:'center',gap:10}}>{shown.map(id=><StickerChoice key={id} id={id} selected={id===selected} onPress={()=>onSelect(id)}/>)}{more>0&&<PixelText style={{fontSize:16,color:c.buttonText}}>{`+${more}`}</PixelText>}</View>}
  </PixelFrame>;
}

/** 「기본 스티커」: 새 목표·목표 설정의 [바꾸기]에서 연다 (PRD 4.12). 가진 묶음·체험 중이 위, 잠긴 묶음이 아래. */
export function StickerChooserScreen({packs,mine,onChangeMine,selected,onSelect,openPack,onToggle,reward,onOpenPack,onDone,onBack}:{packs:readonly PackView[];mine:boolean;onChangeMine:(mine:boolean)=>void;selected:StickerId;onSelect:(id:StickerId)=>void;/** 펼친 묶음. 처음에는 지금 고른 스티커가 든 묶음 */openPack:ColorStickerPackId;onToggle:(id:ColorStickerPackId)=>void;reward:{days:number;goal:number};onOpenPack:(id:ColorStickerPackId)=>void;onDone:()=>void;onBack:()=>void}) {
  const order=[...packs.filter(p=>p.state!=='locked'),...(mine?[]:packs.filter(p=>p.state==='locked'))];
  const rewardReady=reward.days>=reward.goal;
  return <View style={{flex:1}}>
    <RetroScreen style={{gap:14}} header={<View style={{gap:12}}><ScreenHeader title="기본 스티커" onBack={onBack}/><PackViewSwitch mine={mine} onChange={onChangeMine}/></View>}>
      <RewardProgress days={reward.days} goal={reward.goal}/>
      {order.map(p=><PackCard key={p.id} pack={p} open={p.id===openPack} selected={selected} rewardReady={rewardReady} onToggle={()=>onToggle(p.id)} onSelect={onSelect} onOpenPack={()=>onOpenPack(p.id)}/>)}
    </RetroScreen>
    <PickedStickerBar sticker={selected} onDone={onDone}/>
  </View>;
}
```

시안 머리글(`ZCard`)과 같다: 가진 묶음·체험 중은 배지 오른쪽에 접기 꺾쇠, 잠긴 묶음은 `[2,200원] [>]`.

- [ ] **Step 4: 통과 확인**

Run: `npm run test:components -- src/design-system/sticker-shop.test.tsx && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit** (사용자 확인 뒤)

```bash
git add src/design-system
git commit -m "feat(design-system): pack card and 「기본 스티커」 chooser screen"
```

---

### Task 4: 묶음 화면과 다이얼로그 문구

**Files:**
- Modify: `src/design-system/sticker-shop.tsx`, `sticker-shop.test.tsx`

**Interfaces:**
- Consumes: `PackView`, `colorPack`, `StickerGlyph`, `StickerGrid`·`StickerSlot`·`PixelPanel`(components)
- Produces:
  - `PackScreen({pack: PackView; sample: readonly StickerId[]; adFree: boolean; reward: {days: number; goal: number}; onBuy: () => void; onWatchAd: () => void; onTrial: () => void; onBack: () => void})`
  - `stickerShopDialogs` — `bought(label)`, `adTrialStarted(endLabel)`, `trialEnded(kind)`, `restoreDone(names)`, `restoreNone`. 각각 `{title, description, primaryLabel, secondaryLabel?, single?}` — `PixelDialog`·`PixelDialogModal` props에 그대로 펼친다.

- [ ] **Step 1: 실패하는 테스트** (import에 `PackScreen,stickerShopDialogs`)

```tsx
describe('묶음 화면',()=>{
  const pack=colorPack('animals','locked');
  const sample=[0,4,7,2,9].map(i=>pack.stickers[i]);
  const base={pack,sample,adFree:false,reward:{days:5,goal:7},onBuy:vi.fn(),onWatchAd:vi.fn(),onTrial:vi.fn(),onBack:vi.fn()};
  const actions=()=>screen.getAllByRole('button').map(b=>b.getAttribute('aria-label')).filter(l=>l==='2,200원에 열기'||l==='광고 보고 하루 써 보기'||l==='3일 무료로 써 보기');
  it('버튼은 사기 → 광고 → 3일 무료 순서이고, 판 예시는 6칸에 5개다',()=>{
    render(<PackScreen {...base}/>);
    expect(actions()).toEqual(['2,200원에 열기','광고 보고 하루 써 보기','3일 무료로 써 보기']);
    expect(screen.getByText('6')).toBeTruthy();
  });
  it('붙인 날이 모자라면 3일 무료는 누를 수 없고 아래에 남은 날을 적는다',()=>{
    const trial=vi.fn();render(<PackScreen {...base} onTrial={trial}/>);
    fireEvent.click(screen.getByRole('button',{name:'3일 무료로 써 보기'}));expect(trial).not.toHaveBeenCalled();
    expect(screen.getByText('스티커 붙인 날이 2일 더 모이면 써 볼 수 있어요 (5/7일)')).toBeTruthy();
  });
  it('붙인 날이 차면 3일 무료를 누를 수 있고 진행 글자는 없다',()=>{
    const trial=vi.fn();render(<PackScreen {...base} reward={{days:7,goal:7}} onTrial={trial}/>);
    fireEvent.click(screen.getByRole('button',{name:'3일 무료로 써 보기'}));expect(trial).toHaveBeenCalled();
    expect(screen.queryByText(/더 모이면/)).toBeNull();
  });
  it('광고 제거를 산 사람에게는 광고 버튼이 없다',()=>{
    render(<PackScreen {...base} adFree/>);
    expect(actions()).toEqual(['2,200원에 열기','3일 무료로 써 보기']);
  });
  it('다이얼로그 문구는 확정 시안 그대로다',()=>{
    expect(stickerShopDialogs.bought('동물')).toMatchObject({title:'동물 묶음을 열었어요',description:'기본 스티커로 쓸 그림을 골라 주세요.'});
    expect(stickerShopDialogs.adTrialStarted('내일 밤 11:00')).toMatchObject({title:'하루 동안 써 볼 수 있어요',description:'내일 밤 11:00까지 쓸 수 있어요.'});
    expect(stickerShopDialogs.trialEnded('3일')).toMatchObject({title:'3일 체험이 끝났어요',description:'붙인 스티커는 그대로 남아 있어요.',primaryLabel:'묶음 열기',secondaryLabel:'다른 스티커'});
    expect(stickerShopDialogs.trialEnded('하루').title).toBe('하루 체험이 끝났어요');
    expect(stickerShopDialogs.restoreDone(['동물 묶음','간식 묶음','광고 제거']).description).toBe('동물 묶음, 간식 묶음, 광고 제거');
    expect(stickerShopDialogs.restoreNone).toMatchObject({title:'이 계정으로 구매 내역이 없어요',description:'구매한 스토어 계정으로 로그인했는지 확인해 주세요.'});
  });
});
```

`PixelButton`은 `accessibilityLabel`이 없으면 `label`을 이름으로 쓴다(`components.tsx` 98~112줄).

- [ ] **Step 2: 실패 확인**

Run: `npm run test:components -- src/design-system/sticker-shop.test.tsx`
Expected: FAIL — `PackScreen`이 없음.

- [ ] **Step 3: 구현** (import에 `PixelPanel,StickerGrid,StickerSlot`(components))

```tsx
/** 묶음 화면 (PRD 4.12). 스티커 영역은 고르기 카드와 같은 모양, 「판에 붙이면」은 6칸에 5개. */
export function PackScreen({pack,sample,adFree,reward,onBuy,onWatchAd,onTrial,onBack}:{pack:PackView;/** 판 예시로 붙일 서로 다른 스티커 5개 */sample:readonly StickerId[];/** 광고 제거를 샀으면 하루 체험이 없다 (2026-10-08) */adFree:boolean;reward:{days:number;goal:number};onBuy:()=>void;onWatchAd:()=>void;onTrial:()=>void;onBack:()=>void}) {
  const ready=reward.days>=reward.goal;
  return <RetroScreen style={{gap:14}} header={<ScreenHeader title={`${pack.label} 묶음`} onBack={onBack}/>}>
    <PixelFrame variant="button" fill={c.secondary} contentStyle={{padding:14}}>
      <View style={{flexDirection:'row',flexWrap:'wrap',rowGap:14}}>{pack.stickers.map(id=><View key={id} accessible accessibilityLabel={stickerLabel(id)} style={{width:'20%',alignItems:'center'}}><StickerGlyph id={id} size={48}/></View>)}</View>
    </PixelFrame>
    <PixelPanel title="판에 붙이면"><View style={{paddingTop:12}}><StickerGrid>
      {[0,1,2,3,4,5].map(i=>sample[i]
        ?<PixelFrame key={i} variant="slot" style={{height:'100%'}} contentStyle={{height:'100%',alignItems:'center',justifyContent:'center'}}><StickerGlyph id={sample[i]} size={48}/></PixelFrame>
        :<StickerSlot key={i} number={i+1} width="100%" height="100%" state="empty"/>)}
    </StickerGrid></View></PixelPanel>
    <View style={{gap:10}}>
      <PixelButton label={`${PRICE}에 열기`} icon={<ActionSymbol name="lock" size={16} color={c.buttonText}/>} onPress={onBuy}/>
      {!adFree&&<PixelButton label="광고 보고 하루 써 보기" variant="secondary" icon={<ActionSymbol name="play" size={16} color={c.buttonText}/>} onPress={onWatchAd}/>}
      <PixelButton label="3일 무료로 써 보기" variant="secondary" disabled={!ready} onPress={onTrial}/>
      {!ready&&<PixelText variant="caption" style={[caption,{textAlign:'center'}]}>{`스티커 붙인 날이 ${reward.goal-reward.days}일 더 모이면 써 볼 수 있어요 (${reward.days}/${reward.goal}일)`}</PixelText>}
    </View>
  </RetroScreen>;
}

/** 화면 위에 PixelDialogModal로 띄운다. 결제 팝업은 Apple·Google이 그린다. */
export const stickerShopDialogs={
  bought:(label:string)=>({title:`${label} 묶음을 열었어요`,description:'기본 스티커로 쓸 그림을 골라 주세요.',primaryLabel:'확인',single:true}),
  /** endLabel 예: '내일 밤 11:00' — 광고를 다 본 때부터 24시간 */
  adTrialStarted:(endLabel:string)=>({title:'하루 동안 써 볼 수 있어요',description:`${endLabel}까지 쓸 수 있어요.`,primaryLabel:'확인',single:true}),
  trialEnded:(kind:'3일'|'하루')=>({title:`${kind} 체험이 끝났어요`,description:'붙인 스티커는 그대로 남아 있어요.',primaryLabel:'묶음 열기',secondaryLabel:'다른 스티커'}),
  restoreDone:(names:readonly string[])=>({title:'구매 내역을 불러왔어요',description:names.join(', '),primaryLabel:'확인',single:true}),
  restoreNone:{title:'이 계정으로 구매 내역이 없어요',description:'구매한 스토어 계정으로 로그인했는지 확인해 주세요.',primaryLabel:'확인',single:true},
} as const;
```

`StickerGrid`가 3열 그리드인지(시안 `BoardCells`와 같은 쓰임), `PixelPanel`·`StickerSlot`이 `components.tsx`에서 export되는지 확인한다.

- [ ] **Step 4: 통과 확인**

Run: `npm run test:components -- src/design-system/sticker-shop.test.tsx && npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit** (사용자 확인 뒤)

```bash
git add src/design-system
git commit -m "feat(design-system): pack screen and sticker shop dialog copy"
```

---

### Task 5: 앱 설정 「구매」 블럭·계정 표시, 홈 광고 자리, [바꾸기]로 화면 열기

**Files:**
- Modify: `src/design-system/sticker-shop.tsx` (`PurchasePanel`)
- Modify: `src/design-system/account-screens.tsx` (`AccountBackupPanel`), `account-screens.test.tsx`
- Modify: `src/design-system/board-screens.tsx` (`GoalListScreen` `footer`, `StickerField` `onChoose`, `NewGoalScreen`·`GoalSettingsScreen` `onChooseSticker`)
- Modify: `src/design-system/sticker-shop.test.tsx`, `compositions.test.tsx`

**Interfaces:**
- Consumes: `InfoRow`(Task 2)
- Produces:
  - `PurchasePanel({adFree: boolean; onRemoveAds: () => void; onRestore: () => void})`
  - `GoalListScreen` 새 prop `footer?: ReactNode` — 스크롤 밖 맨 아래(광고 배너 자리)
  - `NewGoalScreen`·`GoalSettingsScreen` 새 prop `onChooseSticker?: () => void` — 있으면 [바꾸기]가 화면 안 고르기 대신 이것을 부른다. 없으면 지금처럼(앱은 아직 이 방식)

- [ ] **Step 1: 실패하는 테스트**

`sticker-shop.test.tsx`(import에 `PurchasePanel`):

```tsx
describe('앱 설정 「구매」 블럭',()=>{
  it('사기 전에는 광고 제거 설명과 버튼, 늘 구매 복원 버튼과 설명이 있다',()=>{
    const remove=vi.fn(),restore=vi.fn();render(<PurchasePanel adFree={false} onRemoveAds={remove} onRestore={restore}/>);
    expect(screen.getByText('홈 아래 광고를 없애요. 한 번 사면 계속 쓸 수 있어요.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'5,500원에 광고 없애기'}));expect(remove).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'구매 복원'}));expect(restore).toHaveBeenCalled();
    expect(screen.getByText('구매한 스티커 묶음과 광고 제거를 되살려요')).toBeTruthy();
  });
  it('산 뒤에는 「광고 제거 · 없이 쓰는 중」이고 구매 복원은 같은 자리에 남는다',()=>{
    render(<PurchasePanel adFree onRemoveAds={vi.fn()} onRestore={vi.fn()}/>);
    expect(screen.getByText('없이 쓰는 중')).toBeTruthy();
    expect(screen.queryByRole('button',{name:'5,500원에 광고 없애기'})).toBeNull();
    expect(screen.getByRole('button',{name:'구매 복원'})).toBeTruthy();
  });
});
```

`account-screens.test.tsx` 50~51줄의 단언을 바꾼다:

```tsx
    expect(screen.getByText('연결한 계정')).toBeTruthy();expect(screen.getByText('Apple')).toBeTruthy();
    expect(screen.getByText('마지막 백업')).toBeTruthy();expect(screen.getByText('오늘 9:20')).toBeTruthy();
```

`compositions.test.tsx`에 추가(import에 `GoalListScreen`):

```tsx
  it('[바꾸기]는 onChooseSticker가 있으면 화면 안 고르기를 열지 않고 그것을 부른다',()=>{
    const choose=vi.fn();
    render(<NewGoalScreen name="책 읽기" onChangeName={vi.fn()} kind="tally" onChangeKind={vi.fn()} count="15" onChangeCount={vi.fn()} sticker="basic.book" onChangeSticker={vi.fn()} onChooseSticker={choose} endMode="none" onChangeEndMode={vi.fn()} onChangeEndDate={vi.fn()} today="2026-10-08" todayLabel="10월 8일" onSubmit={vi.fn()} onBack={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button',{name:'바꾸기'}));
    expect(choose).toHaveBeenCalled();expect(screen.queryByRole('button',{name:'선택 완료'})).toBeNull();
  });
  it('홈 목록은 footer를 스크롤 밖 맨 아래에 둔다',()=>{
    render(<GoalListScreen tab="active" onTab={vi.fn()} active={[]} completed={[]} onOpen={vi.fn()} onAdd={vi.fn()} footer={<PixelText>광고 자리</PixelText>}/>);
    expect(screen.getByText('광고 자리')).toBeTruthy();
  });
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:components`
Expected: FAIL — `PurchasePanel` 없음, 계정 표시 단언 실패, `onChooseSticker`·`footer` 무시.

- [ ] **Step 3: 구현**

`sticker-shop.tsx`(import에 `InfoRow`(composition-controls)):

```tsx
/** 앱 설정 「구매」 블럭 (PRD 4.9). 구매 복원은 앱 설정에만 두고, 사기 전·후 같은 자리다. */
export function PurchasePanel({adFree,onRemoveAds,onRestore}:{adFree:boolean;onRemoveAds:()=>void;onRestore:()=>void}) {
  return <PixelPanel title="구매" contentStyle={{gap:0}}>
    {adFree?<InfoRow label="광고 제거" value="없이 쓰는 중"/>
      :<View style={{gap:12,paddingVertical:12}}>
        <PixelText style={{fontSize:18,lineHeight:24}}>광고 제거</PixelText>
        <PixelText>홈 아래 광고를 없애요. 한 번 사면 계속 쓸 수 있어요.</PixelText>
        <PixelButton label="5,500원에 광고 없애기" onPress={onRemoveAds}/>
      </View>}
    <View style={{borderTopWidth:retro.shape.cellBorder,borderColor:c.ink}}/>
    <View style={{gap:8,paddingVertical:12}}>
      <PixelButton label="구매 복원" variant="secondary" onPress={onRestore}/>
      <PixelText variant="caption" style={[caption,{textAlign:'center'}]}>구매한 스티커 묶음과 광고 제거를 되살려요</PixelText>
    </View>
  </PixelPanel>;
}
```

구분선은 앱 설정 계정 블럭의 `Rule`(account-screens.tsx 38줄, 잉크 한 칸)과 같은 모양이다. **시안 캡처의 옅은 선(투명도 0.25)은 임시 스토리에서만 쓴 것이라 옮기지 않는다 — 사용자 확인 때 이 차이를 말한다.**

`account-screens.tsx` `AccountBackupPanel`의 연결된 상태(맨 아래 `return`)에서 위 세 줄을 바꾼다(`InfoRow`를 composition-controls에서 import):

```tsx
  const lines:readonly string[]|undefined=status.state==='restoring'||status.state==='synced'?undefined:backupLines[status.state];
  return <PixelPanel title="계정과 백업" contentStyle={{gap:0}}>
    <InfoRow label="연결한 계정" value={status.provider}/>
    {status.state==='synced'&&<><Rule/><InfoRow label="마지막 백업" value={status.backedUpAt}/></>}
    {lines&&<><Rule/><View style={{paddingVertical:12,gap:4}}><PixelText>{lines[0]}</PixelText>{lines[1]&&<Caption>{lines[1]}</Caption>}</View></>}
```

나머지(로그인 버튼, 로그아웃·계정 삭제)는 그대로. 백업 중·대기·로그인 필요 상태의 두 줄 안내도 그대로이고 「연결한 계정」 줄만 바뀐다. `restoring` 상태가 `provider`를 갖는지 `AccountBackupStatus`(86줄)에서 확인한다.

`board-screens.tsx`:

```tsx
function StickerField({value,onChange,onChoose,targetRef}:{value:StickerId;onChange:(value:StickerId)=>void;/** 있으면 [바꾸기]가 「기본 스티커」 화면을 연다 (PRD 4.12). 없으면 화면 안에서 고른다 — 앱은 스키마 v6 전까지 흑백이라 이쪽 */onChoose?:()=>void;targetRef?:React.Ref<View>}) {
  const [choosing,setChoosing]=useState(false);
  if(choosing) return <PixelPanel title="기본 스티커"><StickerPicker value={value as PocketStickerId} onChange={onChange}/><PixelButton label="선택 완료" variant="secondary" onPress={()=>setChoosing(false)}/></PixelPanel>;
  return <View style={{gap:8}}><PixelText>기본 스티커</PixelText><View ref={targetRef}><StickerSummary value={value} onChange={onChoose??(()=>setChoosing(true))}/></View></View>;
}
```

`NewGoalScreen`·`GoalSettingsScreen`의 props에 `/** 있으면 [바꾸기]가 「기본 스티커」 화면을 연다 */onChooseSticker?:()=>void`를 더하고 `<StickerField … onChoose={onChooseSticker}/>`로 넘긴다.

`GoalListScreen`: props에 `/** 스크롤 밖 맨 아래. 광고 배너 자리(광고 제거를 샀으면 비움) */footer?:ReactNode`, 반환을 감싼다:

```tsx
  return <View style={{flex:1}}>
    <RetroScreen style={{gap:16}} header={/* 기존 그대로 */}>{/* 기존 그대로 */}</RetroScreen>
    {footer}
  </View>;
```

`ReactNode`를 react에서 import했는지 확인한다.

- [ ] **Step 4: 통과 확인**

Run: `npm run test:components && npm run typecheck && npm run lint && npm test`
Expected: PASS. `npm test`(jest)는 `src/sync/accountStatus.ts` 쪽이 패널 문구에 기대는지 보려고 돌린다.

- [ ] **Step 5: Commit** (사용자 확인 뒤)

```bash
git add src/design-system
git commit -m "feat(design-system): purchase block, account as label + value, home footer slot, [바꾸기] can open the chooser"
```

---

### Task 6: Storybook 스토리

**Files:**
- Create: `stories/StickerShop.stories.tsx`
- Modify: `stories/AccountBackup.stories.tsx`, `stories/HomeStructure.stories.tsx`
- Modify: `src/design-system/screen-compositions.tsx` `exampleGoals` (컬러 ID)
- Move out: `stories/_proposal/` (마지막 단계)

**Interfaces:**
- Consumes: Task 1~5의 컴포넌트 전부
- Produces: 스토리 ID(흐름도가 쓴다). 제목 `Screens/Sticker Shop` → 접두 `screens-sticker-shop--`
  - `chooser`, `chooser-mine`, `chooser-reward-ready`, `chooser-trial`, `chooser-bought`, `chooser-ad-trial-started`, `pack`, `pack-reward-ready`, `pack-ad-free`, `trial-ended`
  - (AccountBackup, 접두 `screens-account-backup--`) `settings-ad-free`, `restore-done`, `restore-none` 추가, `settings-synced`는 구매 블럭이 든 모양으로 갱신
  - (HomeStructure, 접두 `screens-home-structure-·-proposals--`) `home-ad-free` 추가, `home-active`는 광고 자리가 든 모양으로 갱신

- [ ] **Step 1: `stories/StickerShop.stories.tsx` 작성**

```tsx
import React,{useState,type ReactNode} from 'react';
import {View} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {BoardDetailScreen,PackScreen,PixelDialog,StickerChooserScreen,colorPack,retro,stickerShopDialogs,type PackView,type StickerId} from '../src/design-system';
import type {ColorStickerPackId} from '../src/stickers/color/catalog';

/** PRD 4.12 스티커 묶음과 구매 (2026-10-08 확정 시안 19판). */
const meta={title:'Screens/Sticker Shop',parameters:{layout:'fullscreen'}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;
const noop=()=>{};

/** 다이얼로그를 화면 위에 얹은 정지 화면. 앱은 PixelDialogModal로 띄운다. */
function WithDialog({children,dialog}:{children:ReactNode;dialog:{title:string;description:string;primaryLabel?:string;secondaryLabel?:string;single?:boolean}}) {
  return <View style={{flex:1}}>{children}
    <View style={{position:'absolute',left:0,right:0,top:0,bottom:0,alignItems:'center',justifyContent:'center',padding:20}}>
      <View style={{position:'absolute',left:0,right:0,top:0,bottom:0,backgroundColor:retro.color.ink,opacity:retro.opacity.scrim}}/>
      <PixelDialog variant="basic" {...dialog}/>
    </View>
  </View>;
}
function ChooserHost({packs,selected='basic.book',days=5,initialMine=false,initialOpen}:{packs:readonly PackView[];selected?:StickerId;days?:number;initialMine?:boolean;initialOpen?:ColorStickerPackId}) {
  const [mine,setMine]=useState(initialMine);
  const [value,setValue]=useState<StickerId>(selected);
  const [open,setOpen]=useState<ColorStickerPackId>(initialOpen??(selected.split('.')[0] as ColorStickerPackId));
  return <StickerChooserScreen packs={packs} mine={mine} onChangeMine={setMine} selected={value} onSelect={setValue} openPack={open} onToggle={setOpen} reward={{days,goal:7}} onOpenPack={noop} onDone={noop} onBack={noop}/>;
}
const owned=[colorPack('basic','free'),colorPack('snack','owned'),colorPack('animals','locked'),colorPack('weather','locked')];
const trying=(label:string)=>[colorPack('basic','free'),colorPack('snack','owned'),colorPack('animals','trial',label),colorPack('weather','locked')];
const afterBuy=[colorPack('basic','free'),colorPack('snack','owned'),colorPack('animals','owned'),colorPack('weather','locked')];
const animals=colorPack('animals','locked');
const sample=[0,4,7,2,9].map(i=>animals.stickers[i]);
const pack=(adFree:boolean,days:number)=><PackScreen pack={animals} sample={sample} adFree={adFree} reward={{days,goal:7}} onBuy={noop} onWatchAd={noop} onTrial={noop} onBack={noop}/>;

export const Chooser:Story={name:'기본 스티커',render:()=><ChooserHost packs={owned}/>};
export const ChooserMine:Story={name:'기본 스티커 · 내 스티커',render:()=><ChooserHost packs={owned} initialMine/>};
export const ChooserRewardReady:Story={name:'기본 스티커 · 붙인 날이 찼을 때',render:()=><ChooserHost packs={owned} days={7}/>};
export const ChooserTrial:Story={name:'기본 스티커 · 3일 써 보는 중',render:()=><ChooserHost packs={trying('3일 남음')} selected="animals.dog"/>};
export const ChooserBought:Story={name:'산 직후',render:()=><WithDialog dialog={stickerShopDialogs.bought('동물')}><ChooserHost packs={afterBuy} initialOpen="animals"/></WithDialog>};
export const ChooserAdTrialStarted:Story={name:'광고를 다 본 뒤',render:()=><WithDialog dialog={stickerShopDialogs.adTrialStarted('내일 밤 11:00')}><ChooserHost packs={trying('24시간 남음')} selected="animals.dog"/></WithDialog>};
export const Pack:Story={name:'묶음 화면',render:()=>pack(false,5)};
export const PackRewardReady:Story={name:'묶음 화면 · 붙인 날이 찼을 때',render:()=>pack(false,7)};
export const PackAdFree:Story={name:'묶음 화면 · 광고 제거를 산 사람',render:()=>pack(true,5)};
export const TrialEnded:Story={name:'체험이 끝난 뒤 붙이려 할 때',render:()=><WithDialog dialog={stickerShopDialogs.trialEnded('3일')}>
  <BoardDetailScreen name="책 읽기" sticker="animals.dog" completed={false} progress={{value:4,total:15,percentLabel:'26%'}}
    board={{kind:'tally',total:15,filled:{1:'animals.dog',2:'animals.dog',3:'animals.dog',4:'animals.dog'},onPress:noop,onOpenRecord:noop}} onBack={noop} onSettings={noop}/>
</WithDialog>};
```

`BoardDetailScreen`의 `progress.percentLabel` 모양(예: `'26%'`인지 `'26% 달성중'`인지)을 `stories/HomeStructure.stories.tsx`의 `detail-tally`에서 확인해 맞춘다. 다른 스토리가 `parameters`에 `edgeToEdge` 같은 값을 쓰면 같이 쓴다.

- [ ] **Step 2: 앱 설정·홈 스토리 갱신**

`stories/AccountBackup.stories.tsx`의 `Settings` 함수(39~45줄)를 바꾼다(import에 `PurchasePanel`, `stickerShopDialogs`):

```tsx
function Settings({status={state:'synced',provider:'Apple',backedUpAt:'오늘 9:20'},adFree=false}:{status?:AccountBackupStatus;adFree?:boolean}) {
  return <RetroScreen style={{gap:16}} header={<ScreenHeader title="앱 설정" onBack={noop}/>}>
    <AccountBackupPanel status={status} onConnect={noop} onLogin={noop} onLogout={noop} onDelete={noop}/>
    <PurchasePanel adFree={adFree} onRemoveAds={noop} onRestore={noop}/>
    <PixelPanel title="도움말"><SettingRow label="사용법 다시 보기" onPress={noop}/></PixelPanel>
    <PixelPanel title="정보"><SettingRow label="약관과 라이선스" onPress={noop}/></PixelPanel>
  </RetroScreen>;
}
```

그리고 스토리 셋을 더한다. 다이얼로그를 얹는 방식은 이 파일의 `Logout` 스토리가 쓰는 방법을 그대로 따른다(파일을 열어 확인): `SettingsAdFree`(`<Settings adFree/>`), `RestoreDone`(`stickerShopDialogs.restoreDone(['동물 묶음','간식 묶음','광고 제거'])`), `RestoreNone`(`stickerShopDialogs.restoreNone`).

`stories/HomeStructure.stories.tsx`: 홈 스토리 `HomeActive`의 `GoalListScreen`에 `footer={<AdSlot/>}`를 넘기고, 같은 화면에 `footer` 없는 `HomeAdFree` 스토리를 더한다. `AdSlot`은 이 스토리 파일 안의 자리 표시다(실제 배너는 AdMob이 그린다 — 디자인 시스템에 넣지 않는다):

```tsx
/** 광고 자리: AdMob 배너가 들어갈 곳. 앱 밖에서 오는 그림이라 앱 팔레트를 쓰지 않는다(광고 위치 시안과 같은 회색 상자). */
function AdSlot() {
  return <View style={{height:62,backgroundColor:'#f1f1f1',borderTopWidth:1,borderColor:'#c9c9c9',flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:12}}>
    <View style={{width:36,height:36,backgroundColor:'#d9d9d9'}}/>
    <PixelText style={{fontFamily:'system-ui',fontSize:12,lineHeight:16,color:'#3c3c3c'}}>{'광고 · 광고주 이름\n광고 문구가 여기에 들어갑니다'}</PixelText>
  </View>;
}
```

새 목표 스토리 둘(`NewWithoutEnd`, `NewWithEnd` — 이름은 파일에서 확인)에 `onChooseSticker={noop}`을 넘긴다.

- [ ] **Step 3: 스티커를 컬러로**

`src/design-system/screen-compositions.tsx`의 `exampleGoals`와 스토리 파일의 흑백 ID 글자를 기본 묶음 컬러 ID로 바꾼다(`sprout` → `basic.sprout` 등 6종, 같은 그림):

```sh
grep -rnE "['\"](sprout|cat|star|flower|book|shoe)['\"]" stories src/design-system/screen-compositions.tsx | grep -v _proposal | grep -v "\.test\."
```

나온 줄 중 **스티커 ID로 쓰인 것만** 바꾼다(`pose`, 아이콘 이름 같은 다른 글자는 그대로). 그대로 둘 것: `StickerPicker`(흑백 고르기)를 보여 주는 스토리 — 앱이 아직 쓰는 화면이다. `first-run-tutorial.tsx`와 `Stickers / Assets`(흑백 자산 검토) 스토리 — 앱 연결 계획에서 다룬다. `exampleGoals`를 바꾸면 그걸 쓰는 테스트(`compositions.test.tsx` 등)의 단언이 스티커 이름에 기대는지 확인한다.

- [ ] **Step 4: 눈으로 확인**

Storybook이 6006에서 이 worktree로 떠 있지 않으면 `npm run storybook`을 백그라운드로 띄운다. 새 스토리를 390pt·2배로 캡처해 확정 시안 19판(https://claude.ai/artifact/MX8DFS3TUf5KHFX5F3gMCH)의 같은 화면과 나란히 본다:

```sh
for id in chooser chooser-mine chooser-reward-ready chooser-trial chooser-bought chooser-ad-trial-started pack pack-reward-ready pack-ad-free trial-ended; do
  perl -e 'alarm 45; exec @ARGV' "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=390,1100 --virtual-time-budget=10000 --screenshot=/private/tmp/claude-501/sticker-shop-$id.png "http://localhost:6006/iframe.html?id=screens-sticker-shop--$id&viewMode=story"
done
```

앱 설정(`screens-account-backup--settings-synced`, `--settings-ad-free`, `--restore-done`, `--restore-none`)과 홈(`screens-home-structure-%C2%B7-proposals--home-active`, `--home-ad-free`), 새 목표도 같은 방법으로 찍는다. 다른 점이 있으면 컴포넌트를 고친다. 시안과 일부러 다르게 둔 것(구분선 진하기 등)은 목록으로 적어 사용자에게 보인다.

- [ ] **Step 5: 임시 스토리 치우기**

`stories/_proposal/`은 커밋한 적이 없다. 확인하고 scratchpad로 옮긴다(`rm`은 훅이 막는다):

```sh
git status --short stories/_proposal
mv stories/_proposal /private/tmp/claude-501/-Users-eunjukim-Desktop-workspace-chagok-app/1d05cee6-6163-4003-bb57-9d42ae74ee75/scratchpad/proposal-stories-backup
```

- [ ] **Step 6: 통과 확인**

Run: `npm run typecheck && npm run lint && npm run test:components && npm test`
Expected: PASS

- [ ] **Step 7: Commit** (사용자 확인 뒤)

```bash
git add stories src/design-system
git commit -m "feat(stories): Screens/Sticker Shop — chooser, pack screen, dialogs; settings purchase block; home ad slot; color stickers in stories"
```

---

### Task 7: 화면 흐름도

**Files:**
- Modify: `stories/flows/app-flow.json`, `stories/flows/appFlow.ts`, `stories/flows/README.md`

**Interfaces:**
- Consumes: Task 6 스토리 ID

- [ ] **Step 1: 시나리오·노드·화살표·자리**

`app-flow.json` `scenarios`에 `{"id": "sticker", "label": "스티커 묶음·구매"}`를 더한다(기존 6개 어디에도 맞지 않음 — README 규칙).

`nodes`에 넷을 더한다:

```json
{"id": "sticker-chooser", "data": {"label": "기본 스티커", "tags": ["PRD 4.12"], "stories": [
  {"id": "screens-sticker-shop--chooser", "label": "모든 묶음"},
  {"id": "screens-sticker-shop--chooser-mine", "label": "내 스티커"},
  {"id": "screens-sticker-shop--chooser-reward-ready", "label": "붙인 날이 찼을 때"},
  {"id": "screens-sticker-shop--chooser-trial", "label": "3일 써 보는 중"},
  {"id": "screens-sticker-shop--chooser-bought", "label": "산 직후"},
  {"id": "screens-sticker-shop--chooser-ad-trial-started", "label": "광고를 다 본 뒤"}
], "scenarios": ["first", "goal", "sticker"]}},
{"id": "pack", "data": {"label": "묶음 화면", "tags": ["PRD 4.12"], "stories": [
  {"id": "screens-sticker-shop--pack", "label": "잠긴 묶음"},
  {"id": "screens-sticker-shop--pack-reward-ready", "label": "붙인 날이 찼을 때"},
  {"id": "screens-sticker-shop--pack-ad-free", "label": "광고 제거를 산 사람"}
], "scenarios": ["sticker"]}},
{"id": "store-pay", "data": {"label": "스토어 결제", "tags": ["PRD 4.12", "OS"], "coverage": "external", "scenarios": ["sticker", "info"]}},
{"id": "rewarded-ad", "data": {"label": "보상형 광고", "tags": ["PRD 4.12", "AdMob"], "coverage": "external", "scenarios": ["sticker"]}}
```

기존 노드에 스토리 줄을 더한다:
- `detail` `stories` 끝: `{"id": "screens-sticker-shop--trial-ended", "label": "체험이 끝난 뒤 붙이려 할 때"}`, `scenarios`에 `"sticker"`
- `app-settings` `stories` 끝: `{"id": "screens-account-backup--settings-ad-free", "label": "광고 제거를 산 뒤"}`, `{"id": "screens-account-backup--restore-done", "label": "구매 복원 · 찾음"}`, `{"id": "screens-account-backup--restore-none", "label": "구매 복원 · 없음"}`. `tags`에서 `"배치 시안 중"`을 지우고(2026-10-08 배치 확정 — 「구매」 블럭), `scenarios`에 `"sticker"`
- `list` `stories` 끝: `{"id": "screens-home-structure-·-proposals--home-ad-free", "label": "광고 제거를 산 뒤"}`

`edges`에 더한다(`label`은 사용자가 누르는 것):

```json
{"id": "new-sticker-chooser", "source": "new", "target": "sticker-chooser", "label": "바꾸기", "data": {"scenarios": ["first", "sticker"]}},
{"id": "sticker-chooser-new", "source": "sticker-chooser", "target": "new", "label": "선택 완료", "data": {"scenarios": ["first", "sticker"]}},
{"id": "goal-settings-sticker-chooser", "source": "goal-settings", "target": "sticker-chooser", "label": "바꾸기", "data": {"scenarios": ["goal", "sticker"]}},
{"id": "sticker-chooser-pack", "source": "sticker-chooser", "target": "pack", "label": "잠긴 묶음", "data": {"scenarios": ["sticker"]}},
{"id": "pack-sticker-chooser", "source": "pack", "target": "sticker-chooser", "label": "3일 무료로 써 보기", "data": {"scenarios": ["sticker"]}},
{"id": "pack-store-pay", "source": "pack", "target": "store-pay", "label": "2,200원에 열기", "data": {"scenarios": ["sticker"]}},
{"id": "store-pay-sticker-chooser", "source": "store-pay", "target": "sticker-chooser", "label": "결제 끝 (자동)", "data": {"scenarios": ["sticker"]}},
{"id": "pack-rewarded-ad", "source": "pack", "target": "rewarded-ad", "label": "광고 보고 하루 써 보기", "data": {"scenarios": ["sticker"]}},
{"id": "rewarded-ad-sticker-chooser", "source": "rewarded-ad", "target": "sticker-chooser", "label": "끝까지 봄", "data": {"scenarios": ["sticker"]}},
{"id": "detail-pack", "source": "detail", "target": "pack", "label": "묶음 열기 (체험이 끝난 뒤)", "data": {"scenarios": ["sticker"]}},
{"id": "app-settings-store-pay", "source": "app-settings", "target": "store-pay", "label": "광고 없애기 · 구매 복원", "data": {"scenarios": ["info"]}}
```

`appFlow.ts` `grid`에 줄 5를 더한다:

```ts
  // 5 스티커 묶음·구매
  'sticker-chooser': [5, 3], pack: [5, 4], 'store-pay': [5, 5], 'rewarded-ad': [5, 6],
```

`stories/flows/README.md`: 배치 설명 「줄은 영역(0 첫 사용·계정 연결, … 4 계정 삭제)」에 `, 5 스티커 묶음·구매`를, 시나리오 목록에 `` · `sticker` 스티커 묶음·구매``를 더한다.

- [ ] **Step 2: 확인**

Storybook을 띄운 채로:

```sh
curl -s http://127.0.0.1:6006/index.json | node -e '
  const ids = new Set(Object.keys(JSON.parse(require("fs").readFileSync(0)).entries));
  const flow = require("./stories/flows/app-flow.json");
  const bad = flow.nodes.flatMap(n => (n.data.stories ?? []).map(s => s.id)).filter(id => !ids.has(id));
  console.log(bad.length ? "없는 스토리 ID: " + bad.join(", ") : "스토리 ID 모두 있음");'
npm run typecheck
```

Expected: `스토리 ID 모두 있음`, 타입 체크 통과. `Flows/앱 전체`를 열어 줄 5가 보이고, 화면이 있어야 할 노드에 빨간 점선이 없는지(외부 노드 `store-pay`·`rewarded-ad`는 작은 자리 표시) 눈으로 본다. `sticker-chooser`↔`pack` 양방향 화살표의 두 라벨이 다 보이는지 본다.

- [ ] **Step 3: Commit** (사용자 확인 뒤)

```bash
git add stories/flows
git commit -m "docs(flows): sticker chooser, pack screen, store payment and rewarded ad in the app flow"
```

---

### Task 8: 문서와 마지막 확인

**Files:**
- Modify: `docs/HANDOFF.md` (0절 2번, 5절 컬러 스티커 문단, 8절)
- Modify: `docs/DESIGN-SYSTEM.md` (컴포넌트 목록)

- [ ] **Step 1: HANDOFF**

- 0절 2번 「다음:」 줄을 「Storybook 반영 끝(브랜치 `docs/sticker-screens`) — 다음은 앱 연결 계획: 「기본 스티커」·묶음 화면 라우트와 `onChooseSticker`, 스키마 v6 마이그레이션(`toColorStickerId`), RevenueCat 구매·복원, AdMob 배너(`GoalListScreen` `footer`)·보상형 광고, 체험 만료 시각과 붙인 날 수 저장, 위젯 체험 종료 처리」로 바꾼다.
- 5절 「컬러 스티커 (2026-10-05, 화면에는 아직 쓰지 않음)」를 「컬러 스티커 (2026-10-05, 디자인 시스템·Storybook은 컬러, 앱은 스키마 v6 전까지 흑백)」로 바꾼다.
- 8절에 한 줄: 디자인 시스템은 `StickerId`(흑백 + 컬러)를 받고 `StickerGlyph`가 컬러를 24의 배수로 그린다(2026-10-xx).

- [ ] **Step 2: DESIGN-SYSTEM**

컴포넌트 목록이 있는 절(`grep -n "composition-controls" docs/DESIGN-SYSTEM.md`)에 `sticker-shop.tsx` — 「스티커 묶음·구매(PRD 4.12): `PackViewSwitch`·`FoldToggle`·`StickerChoice`·`RewardProgress`·`PickedStickerBar`·`PackCard`·`StickerChooserScreen`·`PackScreen`·`PurchasePanel`·`stickerShopDialogs`·`colorPack`」를, `composition-controls.tsx` 줄에 `InfoRow`를 더한다.

- [ ] **Step 3: 전체 확인**

```sh
npm run typecheck && npm run lint && npm test && npm run test:components
npx expo export --platform ios --output-dir /tmp/check && rm -rf /tmp/check
npm ls react-dom --all | grep react-dom
```

Expected: 모두 통과, 번들 성공, `react-dom@19.2.3`만 나옴. (앱 화면은 그대로지만 디자인 시스템 import가 바뀌었으므로 번들을 돌린다 — AGENTS.md.)

- [ ] **Step 4: Commit** (사용자 확인 뒤)

```bash
git add docs
git commit -m "docs: sticker shop in Storybook — HANDOFF status and design system component list"
```

---

## 이 계획에서 하지 않는 것 (다음 계획)

- 앱 라우트 「기본 스티커」·묶음 화면, 새 목표·목표 설정에서 `onChooseSticker` 연결
- 스키마 v6: `goals.default_sticker_id`·`stickers.sticker_type` 흑백 → 컬러(`toColorStickerId`)
- RevenueCat 구매·복원·권한, AdMob 배너·보상형 광고, 체험 만료 시각·붙인 날 수 저장
- 위젯: 체험이 끝난 묶음이면 붙이지 않고 앱을 연다
- 열린 결정: 출시 묶음 수·주제, 기본 묶음 10종 여부, 같은 묶음 보상 재체험, 스티커 그림 품질
