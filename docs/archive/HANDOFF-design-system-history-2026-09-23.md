> 과거 작업 기록 보관본. 최신 지시와 현재 상태는 ../HANDOFF.md를 따른다. 아래에는 폐기된 수치와 오래된 검수 상태가 포함된다.

# 차곡차곡 — 다음 세션 인계

## 최신 작업: 2026-09-23 전체 화면 더블체크

8개 시안 재비교 후 제목 중앙 정렬, 설정 구분선 두 곳, 미리보기 정렬, 달력 화살표, 기록의 사진 비율/크롭과 메모 패널, 튜토리얼 3단계 위치를 보정했다. 판 선택은 사용자 추가 첨부 이미지 기준으로 외곽 주황 선택 표시·요일/빈 날짜 칸·적립판 첫 칸 체크를 적용했다. 기존 DS 토큰/프리미티브는 유지했다. [화면별 검수표와 최종 캡처](design/retro-pocket-v1/review-set-02/implementation-review/README.md)를 참고한다.

## 최신 작업: 2026-09-23 스티커 자산 분리 및 시안 윤곽 반영

- 스티커는 계속 추가될 예정이므로 `src/stickers/pocket/`에서 별도로 관리한다. [추가 방법](../src/stickers/pocket/README.md). `catalog.ts`가 ID·이름·분류·자산의 단일 등록 위치다.
- 새싹 기존 path는 그대로 이동하고 기존 DS 경로는 호환 export로 유지. 고양이·별·꽃·책·운동화는 review-set-02 설정 시안에서 실제 윤곽을 추출해 기존 임의 SVG를 교체했다. 꽃 스티커는 헤더 꽃 아이콘과 분리했다.
- 배경/질감/광원은 제외한 투명 단색 경로다. 기존 팔레트·프레임·포커스는 변경하지 않았다. 원본 crop·SHA256·revision 및 재생성 스크립트가 있다.
- [시안 비교 및 크기별 캡처](design/retro-pocket-v1/review-set-02/asset-review/README.md). Storybook `Stickers/Asset Library`에 100% 비교와 32/48/56/64px 매트릭스를 추가했다.
- 기존 `src/stickers/catalog.ts`의 저장용 22종은 별도이며 DB ID 변경/마이그레이션은 하지 않았다.

## 최신 작업: 2026-09-22 화면 구성 컴포넌트 추가

**아래 과거의 시안 일치 지시보다 최신 사용자 지시를 우선한다.** `review-set-02/screens`의 8개 이미지는 화면 구성 참고다. 그 이미지에 맞춰 현재 디자인 시스템의 색상·폰트·프레임·포커스·원본 새싹/톱니바퀴를 변경하지 않는다.

- 기존 디자인 시스템 위에 목표 종류/칸 수 선택, 스티커 선택, 달력, 기록 사진/메모, 튜토리얼을 추가했다. 기존 primitives/tokens/geometry/새싹/톱니바퀴 파일은 작업 전후 SHA256 동일.
- Storybook `Screens/Review Set 02`에 8개 화면, `Components/Screen Building Blocks`에 재사용 컴포넌트 예시가 있다.
- [구현 목록·화면 링크·검수 캡처](design/retro-pocket-v1/review-set-02/implementation-review/README.md)
- typecheck, 컴포넌트 테스트 11개, Storybook 빌드 통과. Playwright로 390/320px의 8개 화면과 생성·설정·기록·튜토리얼 동작 확인. 가로 overflow 및 browser error 없음.
- **범위:** React Native 공통 컴포넌트 및 Storybook 내 메모리 데모. 실제 Expo 앱 라우팅/DB 저장/네이티브 사진 선택기 연결은 하지 않았다. 네이티브 실기기 검수도 별도다. 시안과 픽셀 단위 일치나 사용자 디자인 승인을 의미하지 않는다.

---

작성: 2026-09-21 · 프로젝트: `/Users/eunjukim/Desktop/workspace/chagok-app`

## 공통 포커스 및 100% 표시 재검수

- 사용자 요구: 7번째 focus 형태 수정, 향후 재사용할 공통 기준, 상단 버튼/목표 박스의 우글거림을 확대하지 않은 배율에서 확인.
- `PixelFocusRing` export 및 `retro.focus` 토큰 추가. available 슬롯은 기존 프레임을 가리지 않고 공통 표시만 사용. 모서리 15px/두께 8px/절삭 2px/가는 선 2px/안쪽 2px/끊김 3px.
- 컨트롤 외곽의 안팎 겹침 도형을 단일 miter stroke로 변경. 하이라이트가 모서리 외곽을 침범하지 않도록 시작/끝 위치 수정.
- 홈 칸 너비·높이·간격을 정수 px로 배치해 줄마다 달라지는 선의 래스터화 완화.
- Storybook `Focus Details`: 100% 우선 + 3배 보조 + 다른 크기 재사용 예시. `Controls Actual Size`: 상단 버튼을 100%에서 시안과 비교.
- 폰트 획 두께는 유지 조건 때문에 해결되지 않음. 형태 승인으로 기록하지 말 것.

## 사용자 재지적 후 재수정 (앞선 형태 보정 미승인)

사용자: “도트 느낌이랑 선 굵기가 아예 다른것같은데? 라운드도 다르고 뭐가 됐다는겨?”

앞선 배치/테스트 통과 보고는 시각적 일치의 근거가 아니다. 이번 재수정도 사용자 승인 전이다.

- 균일한 작은 3단 모서리 대신 원본의 큰 2단 계단으로 변경: 패널 6px, 버튼 5px, 칸 3px.
- LCD 띠를 화면색 그대로 쓰지 않고 기존 ink 62%를 겹쳐 어둡게 표현. 외곽 3px / 띠 5px / 내부 4px.
- 버튼 외곽 3px, 그림자는 오른쪽 1px / 아래 2px. 기존 큰 오른쪽 돌출 축소.
- 새싹은 3px 간격 근사표를 폐기. 지정 원본 x292:378, y622:714의 어두운 윤곽을 원본 해상도로 추출한 `src/design-system/assets/sprout.ts`를 단일 SVG Path로 사용. 밝은 부분은 투명. source의 접지 부분도 유지.
- `Reference Match / Frame Details`: 시안과 공통 컴포넌트의 선·모서리 3배 비교. 새싹은 v6 홈이 아닌 별도 지정 원본과 비교한다.
- 폰트 차이(얇은 획, 도트 크기)는 해결되지 않았다. 폰트는 임의 교체하거나 가짜 bold를 적용하지 않았다.

## 2026-09-21 실제 브라우저 검수 후 추가 기록

아래 기존 인계는 수정 전 기록이다. 이번 세션에서는 Playwright Chromium으로 **수정 전후 모두 캡처하고 실제 이미지를 열어 검수**했다. 디자인 승인을 의미하지 않는다.

- 실행 중 Storybook: `http://localhost:6006/?path=/story/design-system-reference-match--home`
- 동일 폭 비교: `http://localhost:6006/?path=/story/design-system-reference-match--side-by-side`
- 캡처·검증: [browser-review](design/retro-pocket-v1/revisions/v6/browser-review/README.md)
- 원인: 전역 decorator 24px 여백 + 홈 16px 여백으로 390px 화면의 패널이 310px로 축소, 고정 88px 셀이 2열로 줄어듦.
- 수정: 홈 전용 edgeToEdge, 패널 350px, 비율 기반 3열×5행. 공통 슬롯 기본 84×64 및 가변 치수 지원.
- 공통 프레임: LCD 외곽 3px + mint 띠 6px + 안쪽 선 3px. 안쪽도 같은 4px 계단 유지. 슬롯 선 2px.
- 새싹: 지정 원본 첫 스탬프 x294–375 / y622–715를 3px 간격으로 분석해 32 단위 SVG로 옮김. 단일 Path로 픽셀 사이 렌더 틈 방지. 얼굴 투명 유지. 손작업 정리가 포함된 근사 자산이며 원본과 완벽 일치로 주장하지 않음.
- Neo둥근모 파일·굵기와 지정 색 유지. 제목 크기·목표 이름 크기 조정. 꽃 아이콘의 꽃잎도 기존 ivory로 표시.
- RN SVG의 `accessible`이 웹 DOM으로 전달되는 콘솔 경고 수정. 웹은 aria 속성, 네이티브는 기존 접근성 속성 사용.
- Playwright: 390×844 / DPR 1, 15칸의 실제 좌표로 3열×5행 확인, 붙이기·목표 전환·팝업 닫기·한글 입력·필터 선택 통과. 8개 스토리 캡처, console error/pageerror 없음.
- 최종 typecheck, 컴포넌트 테스트 6개, Storybook 빌드 통과. RN Web use-client 무시/번들 크기 등 빌드 경고는 남아 있음.
- 남은 차이: Neo 글자 형태·굵기, 시안의 입체 질감/광원, 프레임·아이콘의 세부 실루엣. 실제 Expo 제품 화면 통합과 실제 모달 동작은 여전히 별도 범위.

## 1. 바로 이어서 할 일

**기준 이미지 시안을 실제 공통 컴포넌트로 최대한 재현하고, Playwright로 Storybook의 실제 렌더링을 열어 비교·수정한다.**

사용자 최신 지시:

> “시안이랑 최대한 비슷하게 맞춰. 폰트는 나중에 다시 논의하는걸로 하고”
> “지금 이게 일치한다고 생각해?”
> “내가 실제 렌더링 확인할 수 있게 세션 다시 열테니깐 handoff 문서 작성해”

**현재 구현은 사용자에게 시안과 다르다고 지적받은 상태다. 승인·완료된 디자인으로 취급하지 않는다.** 이전 에이전트는 프레임 치수와 새싹을 임의로 정하고, 브라우저에서 결과를 보지 않은 채 시안에 맞췄다고 보고했다. 같은 방식으로 더 그리지 말 것. 이번 세션은 인계 문서 작성으로 종료하며 추가 디자인 수정은 하지 않았다.

형태 재현 작업에서는 현재 Neo둥근모를 임의로 교체하지 않는다. 이미지의 글씨까지 동일하다고 주장하지 않는다.

**인계 작성 후 추가 의견:** 사용자는 “시안처럼 폰트를 구현하려면 폰트를 새로 만드는 수밖에 없나? Neo 저거는 너무 안 맞는 느낌”이라고 물었다. Neo둥근모는 최종 승인 폰트가 아니다. 기존 한글 도트 폰트 후보를 실제 같은 문구로 렌더해 비교하는 방법과, 커스텀 폰트 제작의 차이를 논의 중이며 대체 폰트는 아직 선택하지 않았다. 전체 한글 입력을 지원해야 하므로 로고/일부 문구만 그림으로 만드는 것으로 폰트 문제를 해결했다고 취급하지 않는다. 자동 굵게/그림자로 Neo를 덧칠하는 것을 승인된 대안으로 간주하지 않는다.

## 2. 시각 기준과 우선순위

작업 전 다음 두 파일을 **이미지 뷰어로 실제 열어서** 확인한다.

1. [v6 홈](design/retro-pocket-v1/revisions/v6/screens/01-home.png)
   - 상단 목표 이름+progress bar, 각진 목표 버튼, 메인 LCD 이중 프레임, 3열×5행 적립판의 기준.
2. [새싹·기본 스티커 영역의 원본](design/retro-pocket-v1/revisions/v6/references/sprout-and-label-source.png)
   - 사용자가 지목한 `exec-93ab5d47-912d-4bea-8349-9ef01356d83f.png`의 보관본.
   - **새싹 캐릭터와 ‘기본 스티커’ 영역에만 적용.** 이 이미지의 둥근 상단 버튼·둥근 메인 프레임으로 되돌리면 안 된다.

색상은 아래 사용자 지정값이 이미지보다 우선한다. 이미지를 다시 샘플링해서 색을 바꾸지 않는다.

| 용도 | 값 |
| --- | --- |
| Viewport | `#AFE1CB` |
| Main frame / LCD | `#C7DE94` |
| Primary button | `#FD855F` |
| Secondary button / dialog / input | `#FEF1D1` |
| Main text / frame / sticker | `#06261C` |
| Button text | `#01241C` |

- 새싹 얼굴 내부는 투명. 피부색·새 채움색 금지.
- 새싹은 설정·작은 미리보기·붙인 칸에서 같은 단일 원본을 재사용.
- ‘기본 스티커’ 텍스트 유지.
- 전체/친구/모양/사물 필터의 전체·개별 테두리 없음. 선택 채움과 세로 구분선만 유지.
- 목표 설정 우측의 기능 없는 4×3 점 장식 없음.
- 스티커는 목표별 설정에서 선택. 하단 상시 스티커 팔레트를 되살리지 않는다.
- 일반 화면 장황한 가이드 대신 최초 튜토리얼. OS 상태바는 기본 글씨 허용.
- 많은 목표·긴 텍스트·validation 보정은 뒤로 미뤘다. 우선 디자인을 확정한다.
- `review-set-01`, `screen-preview`는 거절된 실험이다. 최신 폴더라는 이유로 다른 이미지 세트를 기준 삼지 않는다.

## 3. 구현 위치와 현재 한계

| 파일 | 역할 |
| --- | --- |
| `src/design-system/components.tsx` | PixelText, PixelFrame, PixelButton, PixelPanel, PixelInput, ProgressBar, GoalChip, StickerFilters, SproutSticker, DefaultStickerLink, StickerSlot, PixelDialog, PixelIcon |
| `src/design-system/geometry.ts` | SVG 계단형 외곽 경로, 진행률 계산 |
| `src/design-system/tokens.ts` | JSON 토큰을 실제 컴포넌트로 연결 |
| `docs/design/retro-pocket-v1/system/tokens.json` | 팔레트·형태·타이포 값 |
| `src/design-system/assets/neodgm-1.601.ttf` | 실제 Neo둥근모 폰트, OFL.txt 함께 보관 |
| `src/design-system/RetroFontProvider.tsx` | Expo 앱용 폰트 로더 |
| `.storybook/main.ts`, `preview.tsx`, `preview.css` | 웹 번들 설정, 폰트 로딩, 배경 |
| `stories/ReferenceMatch.stories.tsx` | 390px 홈 구성과 시안 비교. **미승인 수정본** |
| `stories/Overview.stories.tsx` | 공통 컴포넌트 모음 |
| `src/design-system/components.test.tsx` | Vitest/jsdom 동작 테스트 6개 |
| `scripts/check-storybook-modules.cjs` | 개발 서버가 제공하는 ESM 연결 검사 |

현재 토큰 버전은 `1.2.0`이다. **이 숫자와 문서의 locked-baseline 표기가 형태 승인 상태를 뜻하지 않는다.** 사용자가 고정한 색·폰트와, 에이전트가 임의로 만든 미승인 형태 값을 구분해야 한다.

직전 수정 내용(그대로 정답으로 취급하지 말 것):

- 패널/다이얼로그 계단 4px, 버튼/입력 3px, 셀 2px.
- 패널 외곽 4px + mint 띠 4px + 안쪽 선 2px, 내용 여백 18px.
- SVG 안쪽 경로의 절삭 폭을 inset에 따라 감소.
- 버튼 위·왼쪽 하이라이트, 슬롯 88×64, 선택 모서리 두께 6px.
- 새싹은 `components.tsx`에 문자열로 그린 24×24 픽셀 초안. **원본에서 정확하게 추출·측정한 자산이 아니다.**
- plus/chevron/gear/flower 픽셀 아이콘 추가. 이것도 기준 이미지와 렌더 비교가 안 된 상태.
- Reference Match의 홈은 검토용 구성. 목표 설정/추가/기본 스티커는 실제 설정 대신 프레임 확인 팝업을 연다.
- PixelDialog는 표면 컴포넌트이며 실제 모달 포커스·배경 차단 구현이 아니다.

공통 컴포넌트는 RN + react-native-svg이며 Storybook에서 RN Web으로 같은 소스를 렌더한다. 기존 Expo 제품 화면·DB에 이 디자인 시스템을 통합한 상태는 아니다. `src/theme/tokens.ts`의 종이 테마를 현재 공통 디자인 기준으로 혼동하지 않는다.

## 4. 새 세션 시작 및 실행

사용자에게 안내한 명령:

```sh
codex -C /Users/eunjukim/Desktop/workspace/chagok-app \
  --sandbox workspace-write \
  -a on-request \
  -c sandbox_workspace_write.network_access=true
```

기존 세션은 approval `never`였다. `network_access=true`는 macOS 브라우저 프로세스 실행 권한까지 해결하지 않는다. 새 세션에서 실제 적용된 권한을 확인하고 Playwright 실행이 샌드박스에 막히면 해당 실행에 대한 승인을 요청한다. 이미 권한이 있다고 가정하거나 Chrome 확장 설치부터 다시 요구하지 않는다.

이전 Playwright Chromium 실패:

```text
bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer.<pid>:
Permission denied (1100)
```

이전 Computer Use는 `Computer Use was not approved to use Google Chrome`이었다. 승인되지 않은 접근을 우회하지 않는다. 이때 실제 브라우저 캡처는 한 장도 검수하지 못했다.

로컬 Playwright 설치는 `/private/tmp/chagok-preview-tools/node_modules/playwright`에 있었다. 임시 경로이므로 존재 여부를 확인한다. Chromium 캐시는 `~/Library/Caches/ms-playwright`에 있다. 프로젝트 의존성으로 Playwright를 추가한 상태는 아니다.

```sh
cd /Users/eunjukim/Desktop/workspace/chagok-app
npm run storybook
```

기본 포트는 6006. 인계 직전 확인 시 **6007에 PID 50716이 LISTEN**, 6006은 LISTEN 없음이었다. 재시작 후에는 반드시 다시 확인한다. 오래된 서버나 PID를 무조건 종료하지 말 것.

6007로 명시 실행하려면:

```sh
WATCHPACK_POLLING=true ./node_modules/.bin/storybook dev \
  -p 6007 --host 127.0.0.1 --no-open --disable-telemetry
```

검토할 주소(실제 실행 포트로 조정):

- [홈 구성](http://localhost:6007/?path=/story/design-system-reference-match--home)
- [시안 나란히 비교](http://localhost:6007/?path=/story/design-system-reference-match--side-by-side)
- [컴포넌트 모음](http://localhost:6007/?path=/story/design-system-overview--component-board)
- 캡처용 iframe: `http://localhost:6007/iframe.html?id=design-system-reference-match--home&viewMode=story`

## 5. 무한 로딩 원인과 수정 — 되돌리지 말 것

정적 빌드는 통과했지만 개발 서버가 SVG 내부 CommonJS를 변환하지 않아 모듈 연결에서 실패했다. 재현 오류:

```text
react-native-svg/lib/module/lib/extract/transform.js ...
does not provide an export named 'parse'
```

수정한 설정:

- `react-native` → `react-native-web` alias.
- `react-native-svg` → `lib/module/ReactNativeSVG.web.js` 정확한 웹 진입점 alias.
- Vite/esbuild 모두 `.web.*` 확장자 우선.
- `optimizeDeps.include`에 `react-native-web`, `react-native-svg` 포함.
- **SVG를 optimizeDeps.exclude로 빼지 않는다.** 그 설정이 개발 서버의 CommonJS 문제를 노출했다.
- 폴링 watcher 사용, `storybook-static` 감시 제외.
- `tsconfig.json`은 기존 Expo 제외 항목에 `storybook-static`, `dist`를 추가. 빌드가 출력 폴더를 지울 때 타입 검사가 생성 JS를 읽는 충돌을 방지.

## 6. 다음 에이전트의 작업 순서

1. 이 문서와 두 기준 이미지를 읽고, 먼저 현재 Storybook을 실제 브라우저에서 연다.
2. 로딩 완료, 콘솔/pageerror, 폰트 로딩, SVG 프레임과 새싹 표시를 확인하고 **수정 전 스크린샷을 저장**한다.
3. 폰 목업 외곽을 제외한 시안의 앱 콘텐츠를 기준으로 논리 폭을 맞춰 비교한다. 이미지 전체 크기와 CSS px를 그대로 비교하지 않는다.
4. 프레임 외곽/안쪽 두께, 계단 절삭 크기, 버튼 높이/그림자, 제목/진행행/기본 스티커 정렬, 셀 종횡비/간격, 새싹 실루엣·얼굴·팔·발 위치를 측정해 차이를 기록한다.
5. 해당 차이를 공통 컴포넌트에 반영한다. “더 레트로스럽게” 재해석하거나 임의 수치로 다시 그리지 않는다. 새싹은 원본 형태를 분석해 단일 픽셀/벡터 자산으로 옮긴다.
6. 같은 viewport·배율에서 **수정 후 실제 캡처**를 만들고 기준과 비교한다. 글씨와 고정 팔레트의 의도된 차이는 분리한다.
7. 홈뿐 아니라 공통 버튼·입력·다이얼로그·필터·새싹 크기별 Storybook도 확인한다. 클릭/입력 기능과 border 없는 필터를 보존한다.
8. 사용자에게 실제 볼 수 있는 Storybook 링크와 전후 캡처를 제시한다. 남은 차이는 명시하고, 직접 보지 않았으면 확인했다고 말하지 않는다.

이미지 생성 시안을 또 만들어 대체하는 작업이 아니다. 실제 공통 컴포넌트와 Storybook 결과를 수정하는 작업이다.

## 7. 검증 사실과 한계

이전 세션에서 통과한 항목:

- `npm run typecheck`
- `npm run test:components` — 6개
- `npm run build-storybook`
- `npm run check:storybook -- http://127.0.0.1:6007` — 9개 스토리 파일 + 진입점, 53개 모듈 연결
- Storybook 인덱스: 기존 30개 + Reference Match 2개 = 32개 스토리
- 기존 Jest 도메인/저장소 29개는 디자인 시스템 최초 추가 단계에서 통과. 직전 형태 수정 때 재실행하지 않음.

마지막 빌드 이후 패널 여백/마커 명세를 소폭 조정했으므로 최종 작업 후 빌드를 다시 실행한다. 위 결과는 **시각적 일치나 브라우저 상호작용 검증을 뜻하지 않는다.** 최종 브라우저 검수는 미수행이다.

새 세션의 필수 확인은 브라우저 렌더링이다. HTTP 200, 타입 검사, jsdom, 정적 빌드만 통과하고 완료라고 끝내지 않는다.

## 8. 문서·기존 작업 보존

- 제품 요구사항은 별도 [PRD.md](PRD.md).
- 공통 컴포넌트 설명: [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).
- 토큰 설명: [DESIGN-TOKENS.md](design/retro-pocket-v1/system/DESIGN-TOKENS.md), [변경 기록](design/retro-pocket-v1/system/CHANGELOG.md).
- 과거 종이 테마 인계 원문: [archive/HANDOFF-legacy-paper-theme.md](archive/HANDOFF-legacy-paper-theme.md). 과거 팔레트·Gaegu·하단 스티커 팔레트 지시는 최신 요청으로 대체됨.
- 루트 AGENTS.md: 코드 작성 전 Expo 57 버전 문서 확인. Expo 57.0.24 / RN 0.86.3 / React·React DOM 19.2.3. React DOM override 유지.
- 저장소에 커밋되지 않은 사용자/기존 작업이 많다. `git reset`, 일괄 복원/삭제 금지. `app.json`, `src/stickers`, 기존 계획 문서, `.omc` 등 관련 없는 변경을 건드리지 않는다.
- 이 작업에서 커밋·푸시하지 않았다.

### 마지막 border 재확인

버튼 본체/그림자의 서로 다른 윤곽 경로를 `surfaceOutline`으로 통일했다. ReferenceCrop의 소수점 크기가 이후 요소의 y 위치를 흐리게 하던 문제를 정수 크기로 보정했다. 최종 픽셀 측정은 browser-review/border-measurements.json 참고: 5개 컨트롤 top/left 3px, right 4px 및 bottom 5px는 그림자를 포함한 값. 확대하지 않은 실제 캡처는 border-100-percent.png. 폰트 및 디자인 승인 상태는 변함없다.

### 타이틀·적립판 선 및 톱니바퀴 재지적 반영

사용자가 타이틀 아래 선, 숫자 칸 border, 톱니바퀴의 굵기와 방향을 추가 지적했다. `shape.panelTitleBorder` 3px 추가, `shape.cellBorder` 2→3px, `focus.lineWidth` 2→3px로 공통 기준을 수정했다. 홀수 폭 포커스 선 중심은 반 픽셀 보정해 가장자리가 정수 위치에 오도록 했다. 톱니바퀴는 16단위 임의 도형 대신 v6 홈 x717:779/y437:498 원본 윤곽을 assets/gear.ts로 추출하여 PixelIcon에서 재사용한다. 홈 gear SVG는 36px이며 실제 윤곽은 약30px. `Gear Details`에서 100% 크기와 확대 비교 가능. 검수 중 드러난 슬롯 초기 height=0일 때 음수 SVG 크기를 만드는 문제도 0 이상으로 제한했다.

### 2026-09-22 새싹·박스 안 여백 재수정 (최신)

사용자가 기본 스티커 옆 새싹을 시안과 맞추고 박스 내부 여백도 수정하라고 요청했다. 큰 스탬프를 축소하던 원본을 폐기하고, 지정 참조의 작은 미리보기 x540:591/y530:586을 56×56 viewBox의 공통 sproutPath로 추출했다. 기본 링크(32px), 붙인 칸(최대54px), 설정(72px)은 모두 같은 경로다. 얼굴은 투명하며 색은 기존 ink다.

- DefaultStickerLink: gap 4px, 문구 14px/20px. 현재 Neo 폰트 유지.
- StickerGrid 공통 컴포넌트: 제목보다 좌우 6px 안쪽, 열 사이15px/행 사이10px. ReferenceHome과 Overview 모두 사용. 390px 홈에서 칸84×64px.
- 붙인 새싹: 수직 중앙 대신 아래 정렬, 하단2px. 크기는 최대54px, 작은 칸에서는 줄어듦.
- 진행행→칸 간격8→2px. 칸 숫자만 slotNumber 28px/32px 추가; 진행행의 number는 유지.
- Storybook Sprout Details는 지정 원본의 작은 새싹과 실제 100% 결과, 같은 원본의 크기별 사용, 칸 내부 배치를 보여준다. 시안 자체의 큰/작은 캐릭터 윤곽은 조금 다르므로 각각 다른 그림으로 따라 그리지 않았다.
- Playwright 전체 검수, 같은 SVG path 확인, typecheck, 테스트6개, 빌드 통과. 최신 캡처 sprout-spacing-100-percent.png, home-after.png, comparison.png, components.png.
