# Pocket 스티커 자산

화면 컴포넌트와 독립된 스티커 라이브러리. `catalog.ts`는 안정적인 ID·이름·분류·자산의 단일 등록 위치다. `StickerArtwork`는 색과 크기를 외부에서 받아 SVG를 렌더한다. 디자인 시스템의 `StickerGlyph`는 이 라이브러리에 현재 ink 색상을 전달하는 어댑터다.

## 추가 방법

1. `assets/<id>.ts`에 `StickerAsset` 형식의 투명 SVG path, viewBox, revision, 참조 파일과 crop `[x,y,width,height]`를 등록한다. 배경색이나 UI 프레임을 넣지 않는다.
2. `catalog.ts`에서 import하여 ID·이름·분류와 함께 추가한다. 선택 목록과 `PocketStickerId` 타입은 여기서 파생된다. 기존 ID는 바꾸거나 다른 그림에 재사용하지 않는다.
3. `Stickers / Asset Library`에서 32·48·56·64px 및 원본 비교를 확인한다. 그림을 수정하면 revision을 올린다.

## 현재 자산 출처

- 새싹: 사용자가 지정한 v6 기본 스티커 미리보기의 기존 56×56 경로를 그대로 이동. 기존 디자인 시스템 경로는 호환 export만 제공한다.
- 고양이·별·꽃·책·운동화: `review-set-02/screens/04-goal-settings.png`의 각 스티커를 흑백 윤곽으로 추출. 원본 배경·질감·광원은 제외하고 현재 ink 색상으로 표시한다. 56×56 정수 격자에 정규화했으므로 원본의 모든 미세 픽셀이 동일한 것은 아니다.
- 추출 재현: Storybook 실행 후 `node scripts/trace-pocket-stickers.mjs <Playwright 모듈 경로>`. 스크립트는 5종만 재생성하며 새싹은 덮어쓰지 않는다. 임계값 110, 4×4 면적 샘플링, 윤곽의 긴 변을 56 단위에 맞추는 비율 유지 배율를 사용한다. 생성 파일에는 원본 SHA256과 crop이 기록된다.

상위 `src/stickers/catalog.ts`는 기존 저장 모델의 다른 22종 카탈로그다. 이 작업에서는 저장 ID를 변경하거나 자동 변환하지 않는다. 앱 저장 연동 시 별도 마이그레이션이 필요하다.
