# 컬러 스티커 자산

흑백 `../pocket`과 별도로 두는 24×24 도트 컬러 스티커 묶음. 아직 화면에서는 쓰지 않고 Storybook `Stickers / Color Assets`에서만 확인한다.

- `source/sticker-packs-24.json` — 원본. 시안(docs/design/proposals-2026-10, 2026-10-05 확정분) 데이터를 그대로 옮겼다. 사용자 PNG에서 옮긴 그림과 생성기로 그린 그림이 섞여 있어 칸 데이터 자체를 원본으로 삼는다.
- `stickers.generated.ts` — `node scripts/build-color-stickers.mjs`로 만든다. 직접 고치지 않는다.
- `catalog.ts` — 묶음 순서·무료 여부, 타입, 조회 함수.
- `ColorStickerArtwork` — 색별 층을 SVG path로 그린다. 칸이 흐려지지 않게 24의 정수배 크기(24·48·72·96)로 쓴다.

## 규칙

- ID는 `묶음.이름`(예: `snack.cheese`). 흑백 스티커 ID와 겹치지 않는다. 한 번 정한 ID는 바꾸거나 다른 그림에 다시 쓰지 않는다.
- 그림 사양: 외곽선 `#1A1426` 한 칸, 투명 배경, 안티에일리어싱 없음, 한 칸에 한 색.
- 그림을 고칠 때는 원본 JSON을 고친 뒤 스크립트를 다시 돌리고 `npm run test:components`로 형식을 확인한다.
