# 함께 목표 개발 이관 (2026-11-05)

이전 세션(chagok-app-e9)이 기획, 시안, 디자인 시스템, 서버까지 끝냈다. **앱 쪽 개발은 이 문서를 받은 세션이 맡는다.** 새 worktree 정리(AGENTS.md 「새 worktree를 만들면 먼저 정리한다」)는 이전 세션이 이 worktree에서 한다(사용자: 「정리하는건 여기서 작업하고」). 정리 커밋(`chore(cleanup): ...`)이 이 브랜치에 들어온 뒤 개발을 시작한다. 그전에는 문서를 읽고 계획만 세운다.

## 작업 공간

- worktree: `/Users/eunjukim/Desktop/workspace/chagok-wt-friends-goal`, 브랜치 `feat/friends-goal`(로컬, push 안 함)
- 기준: `origin/release/1.1.0`(f1126da, 서버 2판 포함) + `docs/friends-goal`(기획, 시안, 디자인 시스템, 스토리) 병합 `e5c611e`
- 링크해 둔 것: `node_modules`(1.1.0 패키지가 있는 `test-1.0.1-integration` 것), `.env.local`, `.secrets`(main 체크아웃). git이 무시하는 `src/design-system/apple-siwa-logo.generated.ts`를 복사해 둠
- 확인: `npm run typecheck` 오류 없음, `npm test` 709 통과(서버 시험 68 건너뜀)
- 버전: 함께 목표는 1.1.0 다음 버전. 버전 이름은 `docs/RELEASE-VERSIONING.md`로 정한다(기능 추가라 MINOR, 1.2.0 후보). 사용자에게 확인

## 정본 문서

- 동작: `docs/PRD.md` 4.15 「함께 목표」
- 기획: `docs/superpowers/specs/2026-11-04-friends-goal-design.md`
- 개발 설계: `docs/superpowers/specs/2026-11-04-friends-goal-dev-design.md`(12절 순서, 13절 결정, 14절 B안)
- 서버 2판: `docs/superpowers/specs/2026-11-04-server-v2-plan.md`(10절: 보안 검토 반영과 **다음 앱이 처리할 것**)
- 시안: https://claude.ai/artifact/6ar4PMAu3UFt7grFTGGqio (9판 확정), 메모 한도 https://claude.ai/artifact/JZsDy8GjGrY9nZVKkc3Cg5 (2안 확정)
- 약관과 처리방침 다음 판 초안: `docs/superpowers/specs/friends-goal-policy-draft/`

## 이미 끝난 것

| 영역 | 상태 |
| --- | --- |
| 디자인 시스템 | `together-screens.tsx`(친구 판 줄과 목록, 친구 판 크게, 사람 줄, 더하기 시트, 친구와 함께, 초대 세 화면, 함께하는 사람, 함께 목표 설정, 차단 시트, 차단한 사람), `board-shape.ts`(칸 수 규칙), `PixelFrame` `thin`/`thinSlot`/`stroke`, `PixelFocusRing cornersOnly`, `PixelPanel invalid`, 토큰 `invalid`(#A61E1E), `BoardDetailScreen` 새 prop(title, readOnly, hideProgress, below, boardRows, members), `InlineModalContext` |
| 검사 | `MEMBER_NAME_MAX = 10`, `memberNameError`(문구는 목표 이름과 같은 「n자까지 입력할 수 있어요.」) |
| Storybook | `Screens/함께 목표` 21개, `Rules/입력 검사`에 함께 목표 상태, `Flows/앱 전체`에 시나리오 `together` 노드 13개 |
| 서버 | 2판 구조와 2판 RPC(아래 목록), 1.1.0 호환 RPC. **개발과 운영 모두 적용**(2026-11-05). 서버 시험 68개 통과, 1.1.0 앱 시뮬레이터 확인 |
| 정책 | novum-web 약관 2판, 처리방침 2판 PR #64(함께 목표 문안 없음, 아직 안 합침) |

2판 RPC: `sync_push`, `sync_pull`, `pull_goal`, `create_shared_goal`, `preview_invite`(로그인 전), `join_goal`(`{error}` 값 반환: closed, full, invalid_name, name_not_allowed, invalid_sticker, sticker_taken, rate_limited), `update_member`, `update_goal`, `rotate_invite`, `leave_goal`(혼자 목표 id 반환), `kick_member`, `block_user`, `unblock_user`, `my_blocks`, `report`. 서버에 **보여주기를 만드는 함수는 아직 없다**(mode 값만 있음).

## 개발 목록 (빠짐없이, 순서대로)

### A. 데이터와 동기화
1. 로컬 DB 새 판(`src/db/schema.ts` 끝에 더하기): goals(목표 자체), goal_members(사람마다 값: 순서, 기본 스티커, 완성, 마지막 붙인 시각, 이름, 역할), stickers(판 주인, 붙인 사람), records(공개 범위). 기존 기기 데이터 옮기기(내 목표마다 멤버 행 하나). 마이그레이션 시험(`__tests__/migrations.test.ts`)
2. 리포지토리와 도메인 타입(`Goal`, `GoalShare`/멤버, 판 주인)을 새 표로. 위젯, 워치, 기록 탭, 완성, 목표 순서가 그대로 도는지
3. 2판 동기화로 바꾸기: 올리기 `sync_push`(행별 거절 `slot_taken`, `not_allowed` 처리: 한 판 칸 되돌리기), 받아 오기 `sync_pull(since)` 주기 실행(앱 시작, 포그라운드, 목표 탭, 판 화면, 30초), 새로 들어간 목표는 `pull_goal`. 멤버 행 `gone: true`면 그 사람 판 지우기, 목표 행이 오면 `pull_goal`로 다시 받기, 차단한 쪽은 상대를 직접 지우고 풀면 `pull_goal`
4. 1.1.0 호환 길(push_changes, pull_changes, replace_all)에서 새 길로 넘어가는 기기 처리(첫 실행 때 커서 정하기, 복원 흐름 `restore.ts`, 계정 연결 `connectAccount.ts`)
5. 로그아웃과 계정 삭제 때 기기에 남은 다른 사람 이름과 칸, 함께 목표 캐시 지우기
6. 오프라인: 각자 판은 지금처럼 붙이고 나중에 올림, 한 판은 연결 없으면 「연결되면 붙일 수 있어요」

### B. 화면 연결 (`stories/TogetherGoal.stories.tsx`와 시안 9판 기준)
7. 목표 탭 + → 더하기 시트 [혼자 채우기] [친구와 함께] → 로그인 전이면 로그인 권하기
8. 친구와 함께(`app/goal/together.tsx`): 어떻게 채울까요(각자 판에, 한 판에 같이), 이름, 판 종류, 칸 수 또는 종료일, 내 이름, 내 스티커(지난 값 채우기 `member_defaults`) → `create_shared_goal` → OS 공유 창
9. 판 화면 분기: 각자 판(진행 막대 없음, 내 판 4칸 두 줄, 친구 줄 목록 7/8칸 두 줄, 달력판 두 주, 기다리는 자리와 [링크 다시 보내기]), 한 판(사람 줄, 칸마다 붙인 사람, 친구 칸 누르면 누가 언제, 같은 날 두 장), 친구 판 크게
10. 목표 탭 카드 「n명이 함께」, 보여주기 받은 목표 「보기만」
11. 목표 설정: 함께하는 사람 n/6(만든 사람 배지, [내보내기], [친구 초대하기], [초대 링크 새로 만들기]), 이름과 칸 수는 만든 사람만, 내 이름과 스티커, 「문제가 있을 때」(신고, 사람 차단하기, 이 목표에서 나가기), 차단 고르기 시트와 확인
12. 앱 설정 「차단한 사람」(`app/settings/blocked.tsx`)과 [풀기]
13. 보여주기: 내 목표 설정 → [보여줄 친구 초대하기], 받은 쪽 「보기만」 판(톱니 없음). **서버에 만들기 RPC를 더해야 한다**(새 마이그레이션 파일). 보는 사람만 남은 목표가 알림 없이 사라지지 않게(서버 2판 계획 10절)
14. 문제 화면: 자리가 다 찼어요, 이 목표에는 들어갈 수 없어요, `rate_limited`(「잠시 뒤 다시 해 주세요」 문구 새로)
15. 입력: 내 이름 10자, 금칙어(`name_not_allowed` → 「다른 이름을 써 주세요」), 스티커 겹침, 적립판 칸 수 상한 1000(서버 값, 앱 입력과 안내 문구 더하기)
16. 혼자 판도 4칸(판 안 폭 330 이상 5칸)으로(`board-shape.ts`의 규칙 사용, PRD 4.1과 4.2 고치기)

### C. 초대 링크
17. `app.json`: iOS `associatedDomains: applinks:chagok.novum-lab.com`, Android `intentFilters`(autoVerify, `/invite/*`). 라우트 `app/invite/[code].tsx`, `chagok://invite/<코드>`도 같은 파일
18. 흐름: `preview_invite` → 로그인 전이면 「은주님이 함께하자고 했어요」 + 로그인(`account/connect` 재사용, 끝나면 초대로 돌아오기) → 함께하기 → `join_goal` → 판
19. novum-web: `/.well-known/apple-app-site-association`(Team ID와 번들 ID), `/.well-known/assetlinks.json`(Android 서명 인증서 SHA-256), `/invite/[코드]` 페이지([앱에서 열기] `chagok://invite/<코드>`, 스토어 버튼, 「설치한 뒤 이 링크를 다시 눌러 주세요」). 지연 딥링크는 넣지 않는다(사용자 결정)
20. `preview_invite` 로그인 전 호출 횟수 제한을 서버 앞단(Caddy 등)에 건다(보안 검토, 받아들인 위험으로 둘지 사용자에게)

### D. 위젯과 워치
21. 위젯 「n명」(`WidgetInput` → `WidgetGoal` → `CardBase`에 `members`, 세 위젯 컴포넌트)
22. **한 판 목표 위젯에서 바로 붙이기**(사용자 결정): 앱이 로그인 토큰을 앱 그룹 공유 키체인에 두고, 위젯 버튼 처리(App Intent)가 서버를 부른다. 서버 확인 뒤에만 칸을 그리고, 실패하면 한 줄 안내(「연결되면 붙일 수 있어요」, 「이미 누가 붙였어요」, 「앱을 열어 다시 로그인해 주세요」), 요청 시간 제한 약 5초. Android 위젯도 같은 규칙
23. 워치: 한 판 목표도 목록에 넣는다. 워치는 붙임 요청만, 폰이 서버를 부르고 결과를 워치에 짧게 보인다. 워치 스냅샷 계약(`watchSnapshotContract.test.ts`, Swift `Snapshot.swift`) 갱신

### E. 운영과 정책
24. 신고 알림: Edge Function `report-notify` + DB 웹훅, Gmail SMTP(`chagok.app.help@gmail.com`, 사용자가 2단계 인증을 켜고 앱 비밀번호를 만들어 줘야 함). 24시간 안에 확인
25. 금칙어 목록(`banned_words`)을 심사 제출 전에 채운다(외부 목록은 사용권 확인)
26. 약관 3판, 처리방침 3판(초안 `friends-goal-policy-draft/`). 그때 이용자가 있으면 불리한 변경은 30일 전 고지. novum-web `versions.json`
27. 스토어: App Privacy 라벨(다른 이용자에게 보이는 정보), 연령 등급 설문(사용자 간 상호작용), 심사 메모에 함께 목표 시험 방법과 **심사관용 두 번째 계정**(초대를 받아 볼 수 있게)
28. 이벤트 기록(PostHog)과 오류 보고(Sentry): 함께 목표 이벤트를 더할지 사용자에게(처리방침 2판 범위 확인)

### F. 문서와 확인
29. PRD 4.15, 5절, 12절과 화면 흐름도(`stories/flows/app-flow.json`)를 실제 라우트에 맞추기, DESIGN-SYSTEM 컴포넌트 표, HANDOFF
30. 영어 문구(`src/i18n/en.ts`), 화면 낭독 이름
31. 시험: jest(리포지토리, 동기화, 마이그레이션), vitest(화면), 서버 시험(나눠 돌리기), 시뮬레이터 두 계정 흐름(각자 판, 한 판, 보여주기, 차단, 나가기, 내보내기, 계정 삭제 넘겨주기), iOS 26.5 기본 + 18.3, Android
32. `qa`와 `security` 에이전트를 동시에 → 고칠 것 고치기 → 사용자 확인 → 커밋. push는 사용자가 요청할 때만

## 사용자가 정한 것 (다시 묻지 않는다)

방 없음, 세 방식(각자 판, 한 판, 보여주기), 최대 6명(서버 값), 로그인 필요, 친구 판은 줄 목록 `[이름][얇은 판 두 줄]` 7칸(큰 폰 8칸), 달력판 두 주, 진행 막대 없음, 숫자와 % 없음, 누가 붙였다는 알림 없음, 초대 링크 `https://chagok.novum-lab.com/invite/<코드>` 기간 없음, 차단(서로 안 보이고 알리지 않음), 금칙어 장치는 넣고 목록은 심사 전에, 만든 사람이 나가면 가장 먼저 들어온 사람이 이어받음, 내 이름 10자, 위젯 「n명」, 한 판도 위젯과 워치에서 바로 붙이기, 혼자 판도 4/5칸, 메모 한도는 안쪽 선만 빨강, 신고 알림은 Gmail, 지연 딥링크 없음.

## 알아 둘 함정

- 서버 시험은 로그인 한도(5분 30번) 때문에 한 번에 돌리면 무더기 실패한다. 나눠 돌린다(PITFALLS).
- 1.1.0의 기기 id는 uuid가 아니다. 서버는 `client_id`에 보관하고 서버 id는 uuid(`private.v1_id`).
- `src/design-system`은 `src/domain`을 가져다 쓸 수 없다(린트).
- 개발 서버는 다른 세션도 쓴다. **서버 통째 리셋은 2026-11-05가 마지막**이다. 이제부터 서버 변경은 새 마이그레이션 파일로만(DEV-SETUP 「운영 DB 바꾸기」 출시 뒤 방식).
- 시안용 임시 스토리 원본은 `chagok-wt-friends-board`의 `stories/_proposal/`(커밋 안 함). 필요하면 거기서 본다.
