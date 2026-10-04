# 레포 이전 체크리스트

작성: 2026-10-04. 레포를 옮기기 전에 git에 없는 것까지 빠짐없이 챙기고, 옮긴 뒤 같은 상태에서 이어서 작업하기 위한 목록이다.
옮긴 뒤 첫 세션은 이 문서 → [HANDOFF](../HANDOFF.md) 0절 순서로 읽는다.

## 1. git에 없어서 손으로 옮겨야 하는 것

| 무엇 | 위치 | 왜 | 처리 |
| --- | --- | --- | --- |
| 앱용 개발 키 | `.env.local` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_DEV_EMAIL`, `EXPO_PUBLIC_DEV_PASSWORD`) | git-ignore | 새 위치에 파일째 복사. 값은 문서에 적지 않는다 |
| 서버 관리자 키 | `.secrets/server-test.env` | git-ignore. 이름을 `.env.`로 시작하면 Expo가 번들에 넣으려다 깨진다 | 폴더째 복사 |
| Supabase CLI 연결 | `supabase/.temp/` | CLI가 만든 link 정보 | 복사하거나 새 위치에서 `supabase link`(프로젝트 `chagok-dev`) |
| Claude 메모리 | `~/.claude/projects/-Users-eunjukim-Desktop-workspace-chagok-app/memory/` | **저장소 경로 기준**이라 경로가 바뀌면 새 세션이 못 찾는다 | 사본: [`docs/agent-memory/`](../agent-memory/MEMORY.md). 아래 3절로 복원 |

## 2. 로컬에만 있는 작업

원격(`origin`)에 없는 것. 브랜치째 올리면 가장 안전하고, 그래도 빠질 때를 위해 패치를 이 폴더에 둔다.

| 무엇 | 상태 | 패치 |
| --- | --- | --- |
| `feat/terms-change-notice` (작업 공간 `../chagok-wt-terms`) | **커밋 안 함.** 약관 변경 안내 다이얼로그 — jest·타입·린트·iOS 번들 통과, 기기 확인 전 | [`feat-terms-change-notice.patch`](feat-terms-change-notice.patch) |
| `fix/light-mode-font-scale` (b4d9101) | 커밋 1개, main에 안 합침. 다크 모드 막기·글자 크기 고정. 실기기 확인 대기 | [`fix-light-mode-font-scale.patch`](fix-light-mode-font-scale.patch) |
| `docs/scope-decisions` (b06564f) | 커밋 1개, main에 안 합침. 2026-10-04 내용을 PRD·HANDOFF에 옮겼으니 되살리지 않아도 된다(기록용) | [`docs-scope-decisions.patch`](docs-scope-decisions.patch) |
| `integration/expo-go-phase` (작업 공간 `../chagok-app-backup`) | main에 없는 병합 커밋 4개 — 로컬 통합 확인용이라 버려도 된다(내용은 각 브랜치로 main에 들어감) | — |
| main의 문서 변경 | HANDOFF·PRD 수정, `docs/design/character/`, `docs/design/proposals-2026-10/`, `docs/migration/`, `docs/agent-memory/` — **커밋 안 함** | — |
| 원격에 없는 병합된 브랜치 | `feat/account-screens`, `feat/account-wiring`, `feat/tutorial-replay-proposals` — 내용은 main에 있다 | — |

패치 적용: `git checkout -b feat/terms-change-notice main && git apply docs/migration/feat-terms-change-notice.patch`,
커밋 패치는 `git am docs/migration/<이름>.patch`.

태그 `backup/main-before-split`는 원격에 있다. 정책 저장소 `../chagok-app-policy`는 `main`·`publish` 모두 원격과 같고, 원격은 이미 GitHub Org `nol-meok`(`github.com/nol-meok/chagok-app-policy`)으로 옮겼다(2026-10-04 확인). 앱 저장소 원격은 아직 개인 계정(`eunjukkkkim/chagok-app`)이다.

## 3. 옮긴 뒤 이어서 작업하기

1. 위 1절 파일 복사, `npm install` (react-dom override 유지 — `npm ls react-dom --all`이 `19.2.3` 하나인지).
2. 메모리 복원 — 새 경로의 프로젝트 키는 경로의 `/`를 `-`로 바꾼 이름이다:
   ```sh
   NEW=~/.claude/projects/$(pwd | sed 's#/#-#g')/memory
   mkdir -p "$NEW" && cp docs/agent-memory/*.md "$NEW"/
   ```
   메모리를 고친 뒤에는 `docs/agent-memory/`도 같이 갱신한다.
3. 2절 브랜치·패치를 되살린다(커밋·병합은 사용자 확인 뒤).
4. 확인: `npm test`, `npm run test:components`, `npm run typecheck`, `npm run lint`, `npm run test:server`(관리자 키 필요).
5. 원격 주소가 바뀌면 `git remote set-url origin <새 주소>`. 정책 사이트(Netlify)가 정책 저장소의 `publish` 브랜치를 보고 있으니, 정책 저장소를 옮기면 Netlify 연결도 바꾼다.

## 4. 외부에 걸린 것 (레포와 별개로 계속 쓰임)

- 시안 아티팩트 3개(비공개): [시안 기록](../design/proposals-2026-10/README.md). 원본·메모는 저장소에 있다.
- 정책 사이트 `https://chagok-app-terms.netlify.app` — 앱 코드(`src/policy/urls.ts`)가 이 주소를 본다.
- Supabase 개발 프로젝트 `chagok-dev`(서울) — 앱이 `.env.local`로 연결.
