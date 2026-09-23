> 과거 종이 테마 구현 인계 기록. 현재 디자인 작업 지시가 아니다. 최신 기준은 ../HANDOFF.md 및 ../PRD.md.

# 차곡차곡 — 인계 문서

> **최신 작업 안내:** 제품 요구는 [PRD](PRD.md), 공통 컴포넌트와 Storybook은 [디자인 시스템](DESIGN-SYSTEM.md)을 먼저 확인한다. 아래의 하단 팔레트·Gaegu·종이 테마 설명은 최신 합의로 대체되었다.

> Codex/다른 에이전트가 이 문서만 읽고 이어서 작업할 수 있도록 쓴 문서다.
> 코드는 `/Users/eunjukim/Desktop/workspace/chagok-app`.

## 0. 한 줄

스스로 정한 목표에 **스티커를 직접 붙여** 기록하고, 원하면 사진·메모를 붙이며,
쌓인 판을 여는 것만으로 성취감을 얻는 iOS/Android 앱. **판정·평가·타인 개입 없음.**

- 스펙: `/Users/eunjukim/.omc/specs/deep-interview-chamjal-sticker-app.md` (8라운드 인터뷰, 최종 모호함 19.6%)
- 구현 계획: `docs/superpowers/plans/2026-09-21-sticker-board-mvp.md`
- 스티커 시안: https://claude.ai/artifact/L2FvWa53FDxhZLVdQVsRcx
- 화면 시안: https://claude.ai/artifact/Doe3ALRSj7wceTHtjY7CDe

---

## 1. 절대 하면 안 되는 것 (Non-Goals)

이건 취향이 아니라 **인터뷰에서 근거를 갖고 제거한 것들**이다. 되살리지 말 것.

| 금지 | 제거한 이유 |
|---|---|
| 타인의 판정·인정 | 성인에게 타인 평가는 인정이 아니라 **감시**로 읽힌다 |
| AI/시스템 자동 판정 | 목표가 사용자 자유 정의라 판정 근거가 성립 불가 |
| 취소 불가 / 기록 잠금 | 원본에서 취소가 불가했던 건 남이 찍었기 때문. 내가 붙이는 건 그냥 불편 |
| 등급 시스템 | 판정 주체가 없으면 등급의 근거도 없다 |
| 통계 · 잔디밭 · 연속일수 | 기존 습관 앱과 차별성 없고, 연속이 끊기면 이탈 요인 |
| 별도 회고/아카이브 화면 | 판 자체가 회고 |
| 보상 시스템 | MVP 범위 밖 (보류, 삭제 아님) |

**핵심 가치는 "나중에 모아볼 때의 성취감"이다.** 그래서 클라우드 동기화는 기능이 아니라 전제조건이다 —
6개월 모은 판이 기기 교체로 날아가면 제품 가치가 0이 아니라 마이너스가 된다.

---

## 2. 현재 상태

### 완료 (Task 1–6) — 29 tests green, `npx tsc --noEmit` clean

```
src/domain/types.ts        Goal, Sticker, RecordNote, Slot, BoardType
src/domain/slots.ts        buildSlots / nextSlotIndex  ← 판 2종의 차이가 전부 여기
src/db/driver.ts           DbDriver 인터페이스
src/db/schema.ts           goals / stickers / records 3테이블
src/db/expoDriver.ts       프로덕션 구현 (동적 import)
src/db/client.ts           getDb / setDriverFactory / resetDbForTest
src/repositories/          goalRepository · stickerRepository · recordRepository
src/stickers/catalog.ts    스티커 22종 레지스트리 (StickerId, PALETTES, STICKERS)
src/theme/tokens.ts        색·간격·타이포
app/_layout.tsx            expo-router 스택
__tests__/                 slots(10) · goal(6) · sticker(6) · record(7)
```

### 남은 것 (Task 7–11)

화면 5개. `app/index.tsx`가 **홈이자 판 화면**이다 (아래 4절).

---

## 3. 환경에서 이미 밟은 지뢰 — 되돌리지 말 것

**① `react-dom`을 `overrides`로 19.2.3에 고정했다.**
Expo SDK 57.0.24는 `react@19.2.3`을 고정하는데 `expo`/`expo-router`가 웹용으로 선언한
`react-dom@*` peer가 최신 19.3.0으로 해석돼 충돌한다. `package.json`의
`"overrides": { "react-dom": "19.2.3" }`를 지우면 모든 `npm install`이 ERESOLVE로 실패한다.

**② `jest-expo`를 쓰지 않는다. `jest` + `ts-jest`다.**
`jest-expo`는 `react-server-dom-webpack`을 통해 같은 react-dom 충돌을 일으킨다.
우리 테스트는 순수 로직과 SQL뿐이라 RN 테스트 환경이 필요 없다.

**③ 리포지토리 테스트는 Node 24 내장 `node:sqlite`로 실제 SQL을 돌린다.**
`expo-sqlite`는 네이티브 모듈이라 jest에서 못 돈다. 그래서 `DbDriver` 인터페이스로 분리했고
`__tests__/support/setup.ts`의 `useFreshDb()`가 인메모리 드라이버를 꽂는다.
**이 경계는 Plan B(클라우드 동기화)의 교체 지점이기도 하다.**

**④ `tsconfig.json`에 `"types": ["jest","node"]`가 필요하다.** 없으면 테스트에서 `expect` 타입이 안 잡힌다.

---

## 4. 화면 구조 (확정)

**홈과 판이 한 화면이다.** 목록을 따로 두면 판을 카드 크기로 줄여야 하는데,
그러면 달력판이 달력이 아니게 되고 스티커가 색 얼룩이 된다. 칩이 목록 역할을 대신한다.

```
app/
├── _layout.tsx        스택 (이미 있음)
├── index.tsx          ★ 칩 + 판 + 팔레트  — 홈이자 판
├── goal/new.tsx       목표 만들기 (모달)
└── sticker/[id].tsx   스티커 상세 (기록)
```

### `app/index.tsx` — 화면 하나에 세 덩어리

```
┌─ nav ─────────────────┐
│ 차곡차곡          9월  │
├───────────────────────┤
│ [독서▮▮▯][러닝▮▮▯][+] │ ← 칩: 이름 + 채움 막대, 가로 스크롤
│                       │
│        16 / 30        │ ← 진행 (Gaegu)
│  ┌─────────────────┐  │
│  │ 일 월 화 수 목…  │  │
│  │  ○ ○ ⊙ ★ ○ ♥ ○  │  │ ← 판: 달력 7열 / 적립판 5열
│  │  ○ ⊙ ○ ○ ★ ○ ○  │  │
│  └─────────────────┘  │
├───────────────────────┤
│ [도장] 꽃 그림 목적    │ ← 팔레트 그룹 탭
│  ⊙ ⊙ ✿ ✿ ☺          │ ← 선택 유지됨
└───────────────────────┘
```

**규칙**
- 칩은 `이름 + 채움 비율 막대`만. 판 종류는 칩에서 구분하지 않는다
- 목표가 없으면 칩도 팔레트도 숨기고 빈 판 고스트 + 안내 + `새 목표 만들기` 버튼
- **붙이기 버튼이 없다.** 팔레트에서 고르고 칸을 직접 탭한다
- 팔레트 선택은 **유지**된다. 탭을 옮겨도, 칸을 붙여도 그대로
- 달력판은 **오늘 칸만** 붙일 수 있다 (`nextSlotIndex`가 null이면 막힘). 지난 날 소급 금지
- 붙인 스티커 탭 → `/sticker/[id]`
- 붙일 때 `Haptics.impactAsync(Medium)` + 스티커가 튀어나오는 스프링 모션

---

## 5. 스티커 22종

`src/stickers/catalog.ts`에 id·그룹·색이 이미 정의돼 있다. **남은 일은 SVG 컴포넌트뿐.**

| 그룹 | 개수 | id |
|---|---|---|
| 클래식 도장 | 2 | `stamp-good` `stamp-great` |
| 꽃 도장 | 12 | `bloom-{good,great,face}-{y,r,g,p}` |
| 그림 | 4 | `star` `heart` `flower` `thumb` |
| 목적 | 4 | `obj-water` `obj-dumbbell` `obj-shoe` `obj-book` |

### 색

```
classic  petal #B5372B  sink #B5372B
y(노랑)  petal #E0A32E  sink #8A5F12
r(빨강)  petal #D4645F  sink #9B3A35
g(초록)  petal #6D9A8B  sink #3D6357
p(보라)  petal #8D7AB0  sink #55457A
b(파랑)  petal #5B8CA8  sink #355A70
```

`petal` = 본체/꽃잎, `sink` = 그 위에 얹히는 글자·디테일.
**노랑 꽃잎에 노랑 글자를 쓰면 종이 위에서 안 읽혀서 분리했다.**

### ⚠️ 가장 중요한 규칙 — `board` 색

여러 스티커가 **판 색으로 구멍을 파내서** 형태를 만든다
(꽃 도장 안쪽, 물컵 수면, 책 책등, 운동화 밑창·스트라이프, 꽃 중앙, 따봉 손가락 선).

> **스티커가 놓이는 면의 배경색과 구멍 색이 정확히 같아야 한다.**
> 그라데이션을 깔면 구멍 색과 어긋나 테두리가 생긴다.

시안 작업 중 이걸 놓쳐서 꽃 도장·물컵·운동화·책이 **전부 검은 덩어리**로 렌더된 적이 있다.
RN에서는 `<Sticker board="#FFFDF7">` 같이 prop으로 내려주고,
판·팔레트·카드 배경을 전부 같은 플랫 컬러로 둘 것.

### SVG 원본

시안 아티팩트(https://claude.ai/artifact/L2FvWa53FDxhZLVdQVsRcx)의 `<defs>`에 심볼이 있다.
`ringClassic` `ringBloom` `txtGood` `txtGreat` `face` `star` `heart` `bloomShape` `thumb`
`objWater` `objDumbbell` `objShoe` `objBook`. 전부 viewBox `0 0 100 100`.
`react-native-svg`로 옮길 때 `<use>`는 `<G>` 합성으로 풀어야 한다.

**도장(ringClassic/ringBloom + 글자)에만 잉크 떨림 필터가 걸려 있다.**
`feTurbulence` + `feDisplacementMap`인데 **react-native-svg에서 동작이 불확실하다.**
안 되면 필터를 빼고, 대신 붙일 때 미세한 랜덤 회전(±4°)으로 "찍힌" 느낌을 낸다 (이미 시안에 있음).
그림·목적 스티커는 필터 없음.

### 폰트

도장 글씨는 **Gaegu**다. `@expo-google-fonts/gaegu` + `expo-font`가 설치돼 있다.
앱 전반에서 목표 이름·진행·날짜·라벨 같은 **개인적인 글자는 Gaegu**,
UI 안내문만 시스템 고딕으로 가른다.

---

## 6. 데이터 모델

```sql
goals    id, name, board_type('calendar'|'tally'), total_slots, created_at
stickers id, goal_id→goals(CASCADE), placed_at, slot_index, sticker_type
records  id, sticker_id→stickers(CASCADE, UNIQUE), photo_uri, memo, created_at
```

- `total_slots`는 `tally`일 때만 값, `calendar`는 null
- `sticker_type`에 22종 id가 그대로 들어간다. **알 수 없는 값이 와도 `resolveSticker()`가 기본값으로 떨어뜨린다**
- 기록은 스티커에 1:1이고 **선택 사항**. 없어도 모든 기능이 정상 동작해야 한다 (테스트로 고정돼 있음)
- `buildSlots(goal, stickers, now)`가 판 2종을 모두 처리한다. 화면은 이 결과만 그리면 된다

---

## 7. 디자인 토큰

```
paper   #FBF7EC   앱 배경 (공책 종이)
board   #FFFDF7   판·카드·팔레트 — 스티커 구멍 색과 반드시 일치
rule    #E2D8BF   테두리
print   #D9CCAE   인쇄된 빈칸 테두리, 번호, 힌트 글자
ink     #2E2A24   본문
ink-soft#7C7264   보조
pink    #B5372B   도장 빨강 = 강조색 (버튼, 오늘 칸, 선택된 칩)
```

- 전 화면에 **종이 결 노이즈**를 얇게 깐다 (SVG feTurbulence, opacity ~.5)
- 판·카드는 `0 2px 0 #F3ECDA` + 부드러운 그림자로 **종이 두께**를 준다
- 버튼도 `box-shadow: 0 3px 0` 로 눌리는 두께
- **빈칸은 점선 회색이 아니라 인쇄된 실선 동그라미**다. 번호는 Gaegu
- 오늘 칸만 `2px dashed var(--pink)` + 흰 배경

---

## 8. 작업 순서 제안

1. `src/stickers/Sticker.tsx` — id로 분기하는 SVG 컴포넌트. **먼저 만들고 실기기에서 22종을 눈으로 확인할 것**
2. `src/components/BoardCell.tsx` — 빈칸(인쇄) / 붙은 스티커 / 오늘 칸
3. `src/components/CalendarBoard.tsx`, `TallyBoard.tsx`
4. `src/components/StickerPalette.tsx` — 그룹 탭 + 선택 유지
5. `src/components/GoalChips.tsx`
6. `app/index.tsx` — 위를 조립
7. `app/goal/new.tsx`
8. `app/sticker/[id].tsx`

**실기기 확인이 필요한 것**: 잉크 떨림 필터 동작 여부, Gaegu 렌더, 햅틱, 팔레트가 한 손에 닿는지,
56px 칸에서 노랑 글자가 읽히는지.

---

## 9. Plan B (이 범위 밖)

계정 + 클라우드 동기화. 리포지토리 3종을 원격 구현체로 교체하면 된다 — 인터페이스는 이미 고정돼 있다.
온보딩에서 **익명으로 시작하고 나중에 계정 연결**하는 방식을 쓸 것.
첫 화면이 로그인이면 "혼자 소소하게"라는 톤과 정면으로 어긋나고 이탈률이 높다.
