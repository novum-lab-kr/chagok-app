# 차곡차곡

스스로 정한 목표에 스티커를 붙여 기록하고, 쌓인 판을 다시 보며 성취감을 얻는 앱.
평가·판정·타인 개입은 제품에서 명시적으로 제외했다.

## 코드 작성 전에 읽을 것

1. **[docs/WORKING-AGREEMENT.md](docs/WORKING-AGREEMENT.md)** — 이 저장소의 작업 방식. 시각 작업은
   렌더해서 보고 고치기, 결정과 작성 분리, 되돌리면 안 되는 것 목록.
2. **[docs/HANDOFF.md](docs/HANDOFF.md)** — 구현 현황과 시각 기준의 **단일 출처**.
   PRD가 요구하는 것과 현재 구현이 다를 때는 이쪽이 현황이다.
3. **[docs/PRD.md](docs/PRD.md)** — 제품 요구사항, 확정 이력, 미확정 목록.
4. **Expo 57 버전 문서** — https://docs.expo.dev/versions/v57.0.0/
   Expo는 버전마다 API가 달라진다. 추측하지 말고 해당 버전 문서를 확인한다.

## 빠른 확인

```sh
npm test                 # 도메인·저장소 (jest + ts-jest)
npm run test:components  # 컴포넌트 (vitest)
npm run typecheck
npm run lint             # ESLint — react-hooks 규칙이 핵심이다
npm run storybook        # 화면 검토
npx expo start           # 앱 실행 — docs/DEV-SETUP.md 참고
```

화면 코드를 만졌으면 타입 체크만으로 끝내지 말고 실제 번들까지 돌린다.

```sh
npx expo export --platform ios --output-dir /tmp/check && rm -rf /tmp/check
```

## 건드리면 안 되는 것

- `package.json`의 `overrides: { "react-dom": "19.2.3" }` — 지우면 모든 설치가 ERESOLVE로 실패
- `jest-expo` 도입 — 같은 react-dom 충돌. `jest` + `ts-jest`가 맞다
- `src/stickers/catalog.ts` — 참조는 없지만 마이그레이션 매핑 근거다
- `src/design-system/` 토큰·프레임·팔레트 — 사용자 승인 기준. 추가는 하되 기존 값은 바꾸지 않는다
- `overrides` 때문에 의존성을 추가할 때는 **설치 전 `package.json`·`package-lock.json`을 백업**하고,
  설치 후 `npm ls react-dom --all`이 `19.2.3` 하나만 내놓는지 확인한다
