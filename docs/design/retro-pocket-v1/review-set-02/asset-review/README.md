# 스티커 자산 검수 — 2026-09-23

고양이·별·꽃·책·운동화를 설정 시안의 실제 윤곽으로 교체했다. 새싹 기존 경로는 유지했다. 투명 단색 SVG이며 팔레트·프레임·포커스는 기존 디자인 시스템 그대로다. 56×56 격자로 정규화하므로 원본 이미지의 질감이나 모든 미세 픽셀까지 동일한 것은 아니다.

- [시안 / 자산 100% 비교](http://localhost:6006/?path=/story/stickers-asset-library--reference-comparison) · [캡처](reference-comparison.png)
- [32·48·56·64px 크기별 보기](http://localhost:6006/?path=/story/stickers-asset-library--size-matrix) · [캡처](size-matrix.png)
- [목표 설정](http://localhost:6006/?path=/story/screens-review-set-02--goal-settings) · [390px](settings-390.png) · [320px](settings-320.png)

Playwright Chromium DPR 1, 브라우저 확대 없이 캡처 후 직접 확인. 자산 검수 화면과 설정 화면에서 console error/pageerror 없음. TypeScript 검사, 컴포넌트 테스트 11개 및 Storybook 빌드 통과.

자산은 `src/stickers/pocket/assets/`에 하나씩 저장한다. `catalog.ts`의 등록 정보로 목록과 타입을 파생한다. 추가·수정 절차는 [스티커 라이브러리 안내](../../../../../src/stickers/pocket/README.md)를 따른다. 원본 crop과 버전은 각 자산 파일에 포함한다. 기존 DB 저장용 카탈로그는 변경하지 않았다.
