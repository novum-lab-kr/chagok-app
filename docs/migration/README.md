# 레포 이전 체크리스트

작성: 2026-10-04. 레포를 옮기기 전에 git에 없는 것까지 빠짐없이 챙기고, 옮긴 뒤 같은 상태에서 이어서 작업하기 위한 목록이다.
옮긴 뒤 첫 세션은 이 문서 → [HANDOFF](../HANDOFF.md) 순서로 읽는다.

## 0. 어떤 이전인지에 따라 할 일이 다르다

- **GitHub에서 저장소만 옮기는 경우(예: Org `nol-meok`으로 transfer)** — 이 컴퓨터의 폴더는 그대로라 다시 clone할 필요가 없다. `git remote set-url origin <새 주소>`만 바꾸면 된다(GitHub가 예전 주소를 한동안 넘겨 주지만 바꿔 두는 것이 맞다). git이 무시하는 파일(`.omc/`, `.env.local`, `.secrets/`, `node_modules/`)과 에이전트 메모리도 폴더 경로가 같으니 그대로 쓴다. 정책 저장소가 이미 이렇게 옮겨졌다.
- **새로 clone하거나 폴더 위치를 바꾸는 경우** — 아래 1~3절을 모두 한다. git이 무시하는 파일은 따라오지 않고, 메모리는 폴더 경로 기준이라 새 경로에서 비어 보인다.

## 1. git에 없어서 손으로 옮겨야 하는 것

| 무엇 | 위치 | 왜 | 처리 |
| --- | --- | --- | --- |
| 앱용 개발 키 | `.env.local` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_DEV_EMAIL`, `EXPO_PUBLIC_DEV_PASSWORD`) | git-ignore | 새 위치에 파일째 복사. 값은 문서에 적지 않는다 |
| 서버 관리자 키 | `.secrets/server-test.env` | git-ignore. 이름을 `.env.`로 시작하면 Expo가 번들에 넣으려다 깨진다 | 폴더째 복사 |
| Supabase CLI 연결 | `supabase/.temp/` | CLI가 만든 link 정보 | 복사하거나 새 위치에서 `supabase link`(프로젝트 `chagok-dev`) |
| Claude 메모리 | `~/.claude/projects/<경로 키>/memory/` | 저장소 경로 기준이라 새 경로에서는 비어 보인다 | 옮기지 않아도 된다. 규칙은 AGENTS.md와 WORKING-AGREEMENT에 있고, 메모리에는 이 맥에서만 맞는 정보(서명 인증서, 기기 번호, CLI 토큰 쓰는 법)만 둔다 |
| 도구 상태 | `.omc/` | git-ignore. 세션 기록과 자동 스캔 결과(`project-memory.json`, 사용자 지시는 비어 있음 — 2026-10-04 확인)라 옮기지 않아도 다시 생긴다 | 선택 |
| Claude 대화 기록 | `~/.claude/projects/<경로 키>/*.jsonl` | 메모리처럼 경로 기준. 새 경로에서는 지난 대화를 `/resume`으로 못 연다 | 옮기지 않아도 된다 — 이어 갈 내용은 HANDOFF·PRD·이 문서에 있다 |

## 2. 원격 주소

두 저장소는 2026-10-04 GitHub Org `nol-meok`을 거쳐 2026-10-17 `novum-lab-kr`로 옮겼다. `origin`은 `https://eunjukkkkim@github.com/novum-lab-kr/chagok-app.git`, `https://eunjukkkkim@github.com/novum-lab-kr/chagok-app-policy.git`이다. 앞의 `eunjukkkkim@`은 로그인 계정을 고르는 용도라, 빼면 「Repository not found」가 난다.

**저장소 밖에 있던 근거 문서:** PRD 12절이 가리키던 원 인터뷰는 2026-10-04 [archive/](../archive/deep-interview-chamjal-sticker-app.md)로 옮겼다.

**작업 공간(git worktree):** 절대 경로로 묶여 있어 폴더를 옮기면 끊긴다. 옮긴 뒤 `git worktree repair <새 경로들>` 또는 필요 없으면 `git worktree prune`. GitHub에서만 옮기면 손댈 것 없다.

이전 전에 로컬에만 있던 브랜치와 패치 기록은 모두 main에 들어가 2026-10-18 지웠다(`402913e`에 있다).

## 3. 옮긴 뒤 이어서 작업하기

1. 위 1절 파일 복사, `npm install` (react-dom override 유지 — `npm ls react-dom --all`이 `19.2.3` 하나인지).
2. 확인: `npm test`, `npm run test:components`, `npm run typecheck`, `npm run lint`, `npm run test:server`(관리자 키 필요).
3. 원격 주소가 바뀌면 `git remote set-url origin <새 주소>`. 정책 사이트는 정책 저장소 `main`에 push하면 GitHub Actions가 운영 VPS로 올린다(2026-10-29~). 정책 저장소를 옮기면 Actions secret(배포 키와 서버 주소)도 새 저장소에 다시 넣는다.
   - 정책 저장소는 이미 `nol-meok`을 거쳐 2026-10-17 `novum-lab-kr`로 옮겼다. (2026-10-29 전 Netlify 시절 기록) Netlify의 GitHub 앱이 `novum-lab-kr` Org 저장소에 접근할 수 있는지, 사이트 설정(Build & deploy → Repository)이 새 주소를 가리키는지 확인한다. 사이트는 2026-10-04에도 열렸지만(200), 다음 `publish` push가 배포되는지는 확인 전이다.
4. 같은 방식으로 작업되는지 확인: 새 세션의 첫 응답이 한국어인지, 시안을 아티팩트로 내는지.

## 4. 외부에 걸린 것 (레포와 별개로 계속 쓰임)

- 시안 아티팩트 3개(비공개): [시안 기록](../design/proposals-2026-10/README.md). 원본·메모는 저장소에 있다.
- 정책 사이트 `https://chagok.novum-lab.com` — 앱 코드(`src/policy/urls.ts`)가 이 주소를 본다.
- Supabase 개발 프로젝트 `chagok-dev`(서울) — 앱이 `.env.local`로 연결.
