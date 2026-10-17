# Retro Pocket v1 (남은 원본)

2026-09-21 처음 잡은 디자인 방향(민트 본체, 연두 LCD, 살구색 버튼, 픽셀 스티커)의 시안 묶음이다. 지금 기준은 [디자인 시스템](../../DESIGN-SYSTEM.md)과 Storybook이고, 옛 시안 이미지와 검토본은 2026-10-18 정리하며 지웠다(`402913e`에 있다).

코드와 Storybook이 실제로 읽는 것만 남겼다.

| 위치 | 쓰는 곳 |
| --- | --- |
| [`system/tokens.json`](system/tokens.json), [`system/DESIGN-TOKENS.md`](system/DESIGN-TOKENS.md) | 디자인 토큰 원본. `src/design-system/tokens.ts`와 `scripts/make-brand-assets.mjs`가 읽는다 |
| `revisions/v6/screens/` | Storybook 정적 파일 `/reference`(`.storybook/main.ts`) |
| `revisions/v6/references/sprout-and-label-source.png` | 새싹 스티커 그림의 출처(`src/stickers/pocket/assets/sprout.ts`) |
| `review-set-02/screens/04-goal-settings.png` | 기본 스티커 5종을 따낸 원본(`scripts/trace-pocket-stickers.mjs`) |
| `review-set-02/references/board-type-detail-user.png` | 판 종류 카드의 기준 시안(DESIGN-SYSTEM.md) |
