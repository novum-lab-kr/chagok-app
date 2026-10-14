# 차곡차곡

스스로 정한 목표에 스티커를 붙여 기록하고, 쌓인 판을 다시 보며 성취감을 얻는 앱.
평가·판정·타인 개입은 제품에서 명시적으로 제외했다.

## 문서 지도

| 문서 | 언제 읽나 |
| --- | --- |
| [docs/HANDOFF.md](docs/HANDOFF.md) | **세션을 시작할 때.** 지금 상태, 진행 중인 브랜치, 다음 할 일, 확인 못 한 것 |
| [docs/PRD.md](docs/PRD.md) | 기능이 어떻게 동작해야 하는지. 남은 결정(11절) |
| [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) | 화면을 만들 때. 색·폰트·컴포넌트·화면 수치 |
| [docs/PITFALLS.md](docs/PITFALLS.md) | 빌드·테스트·기기 확인 전에. 한 번 크게 헤맨 함정 |
| [docs/WORKING-AGREEMENT.md](docs/WORKING-AGREEMENT.md) | 작업 방식 전체와 그 이유 |
| [docs/DEV-SETUP.md](docs/DEV-SETUP.md) | 개발 빌드·시뮬레이터·개발 서버 실행 |
| [docs/RELEASE-DECISIONS.md](docs/RELEASE-DECISIONS.md) | 식별자·계정·가격·광고 같은 출시 결정 |
| [docs/RELEASE-CHECKLIST.md](docs/RELEASE-CHECKLIST.md) | 스토어에 내기 직전. 출시 전 최종 점검 목록 |
| [docs/LEGAL-REVIEW.md](docs/LEGAL-REVIEW.md) | 출시·업데이트 때마다. 약관·처리방침이 기대는 법령의 개정 확인과 문서 유효성 점검 |
| [docs/migration/README.md](docs/migration/README.md) | 레포를 옮긴 직후에만 |

Expo는 버전마다 API가 다르다. 코드를 쓰기 전에 [Expo 57 문서](https://docs.expo.dev/versions/v57.0.0/)를 확인한다. 지금 Expo ~57 / RN 0.86 / React 19.2.3.

## 사용자와 일하는 규칙

자세한 내용과 이유는 [작업 방식](docs/WORKING-AGREEMENT.md) 11절.

- **한국어로 쓴다.** 진행 메모와 질문까지. 쉬운 말로 쓰고, 시험 구현인지 실제 구현인지 밝힌다. 커밋 메시지는 영어.
- **작업마다 새 worktree와 브랜치를 먼저 만든다.** main 체크아웃은 다른 세션과 같이 쓴다. 문서 초안도 마찬가지다.
- **커밋은 확인 뒤에.** 계획·설계는 사용자가 승인한 뒤, 코드는 사용자가 직접 돌려 본 뒤 커밋한다. 테스트 통과는 확인으로 치지 않는다. main에는 `--no-ff`로 합친다. **push는 사용자가 요청할 때만.**
- **애매하면 선택지 3개.** 하나를 추천으로 표시한다. 한 번에 4개 이하로 묻는다.
- **시안은 아티팩트로 먼저.** 고르기와 메모가 되고 고른 안을 `db`에 저장하는 아티팩트로 보여 준다. 캡처는 실제 컴포넌트를 렌더해서 만든다. 확정된 뒤에 Storybook과 코드에 반영한다. 시안에 달린 메모는 범위 밖으로 보여도 모두 답한다.
- **화면 문구는 사용자 관점으로.** 시스템 상태가 아니라 사용자가 할 일과 결과를 말한다("로그인이 필요해요").
- **계정·외부 설정이 필요한 일은 뒤로.** 실기기 테스트는 맨 뒤. Google 로그인은 OAuth 준비 전에 제안하지 않는다.
- **브랜드·캐릭터는 묻고 시작한다.** 새싹이는 기본 스티커일 뿐 대표가 아니다.
- 확인하지 않은 것을 확인한 것처럼 쓰지 않는다. 실패한 명령과 미검증 항목은 그대로 보고한다.

## 빠른 확인

```sh
npm test                 # 도메인·저장소 (jest + ts-jest)
npm run test:components  # 컴포넌트 (vitest)
npm run typecheck
npm run lint             # react-hooks 규칙이 핵심
npm run storybook
```

화면 코드를 만졌으면 실제 번들까지 돌린다.

```sh
npx expo export --platform ios --output-dir /tmp/check && rm -rf /tmp/check
```

화면을 추가·변경·삭제했거나 이동 경로가 바뀌었으면 같은 작업에서 화면 흐름도(Storybook `Flows/앱 전체`)도 맞춘다 — [stories/flows/README.md](stories/flows/README.md). 시각 작업은 렌더해서 눈으로 보고 고친다.

## 건드리면 안 되는 것

- `package.json`의 `overrides: { "react-dom": "19.2.3" }` — 지우면 모든 설치가 ERESOLVE로 실패한다. 의존성을 더할 때는 `package.json`·`package-lock.json`을 백업하고, 설치 뒤 `npm ls react-dom --all`이 `19.2.3` 하나인지 본다.
- `jest-expo` 도입 — 같은 충돌. `jest` + `ts-jest`가 맞다.
- `src/stickers/catalog.ts` — 쓰는 코드는 없지만 마이그레이션 매핑 근거다.
- `src/design-system/` 토큰·프레임·팔레트의 기존 값 — 추가만 한다.
- PRD 절 번호 — 코드 주석과 흐름도 태그가 가리킨다.
- 실행 중인 Storybook·Metro — 다른 세션 것일 수 있다.
