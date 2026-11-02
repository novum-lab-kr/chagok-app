---
name: ship
description: 작업을 커밋하고 main에 합치고 push한 뒤 worktree를 정리할 때, 그리고 새 worktree를 만든 직후 정리할 때. 사용자 확인 조건, 확인 명령, 커밋 나누기, 병합과 push 뒤 정리 순서.
---

# 커밋, 병합, push

규칙의 이유는 [작업 방식](../../../docs/WORKING-AGREEMENT.md) 8절, 11절.

## 커밋 전에

- **사용자가 직접 돌려 봤는지** 대화에서 확인한다. 테스트 통과는 확인으로 치지 않는다. 계획과 설계 문서는 사용자 승인이 있어야 한다. 없으면 커밋하지 않고 무엇을 확인해 달라고 할지 보고한다.
- 확인 명령을 모두 돌린다. 번들은 [AGENTS.md](../../../AGENTS.md) 「빠른 확인」의 `expo export` 명령으로 확인한다.

```sh
npm test
npm run test:components
npm run typecheck
npm run lint
```

- 화면을 추가, 변경, 삭제했거나 이동 경로가 바뀌었으면 화면 흐름도(`stories/flows/app-flow.json`)를 맞추고 [stories/flows/README.md](../../../stories/flows/README.md)의 스토리 ID 검사를 돌린다. 시안을 거치는 작업은 그 작업의 시안이 전부 확정된 뒤 맞추므로, 아직 남은 시안이 있으면 이 커밋에서는 맞추지 않는다.
- 새로 쓴 문구, 스토리 이름, 문서에 가운뎃점이 없는지 본다.

## 커밋

- 덩어리별로 나눈다. 예: 규칙 문서, 새 공통 컴포넌트, 기능, 시안 원본.
- 메시지는 영어, `type(scope): summary`. 끝에 대화에서 안내된 Co-Authored-By 줄을 붙인다.

## main에 합치기

1. main 체크아웃(`chagok-app`)이 깨끗한지(`git status --short`), 다른 세션이 쓰는 중이 아닌지 본다.
2. `git merge --no-ff <브랜치>`. 그 뒤 main에서 `npm run typecheck`, `npm test`를 다시 돌린다.

## push (사용자가 요청할 때만)

1. `git push origin main`. 로컬 main에 이번 작업이 아닌 커밋이 먼저 쌓여 있으면 함께 올라간다고 보고한다.
2. push가 끝나면 묻지 않고 정리한다: 그 worktree에서 내가 띄운 Metro를 끄고, `.env.local` 링크를 지우고, `git worktree remove <폴더>`, `git branch -d <브랜치>`.
3. 내가 띄운 다른 서버(시안 미리보기 등)도 끈다.

## PR로 합칠 때 (출시 브랜치 `release/*` 포함)

1. PR을 만들거나 push하는 것은 사용자가 요청할 때만 한다.
2. PR이 합쳐진 것을 확인하면(`gh pr view <번호> --json state,baseRefName`) 위 push 뒤 정리와 똑같이 그 worktree와 로컬 브랜치를 지운다. base가 main이 아니어도 같다.
3. 확인을 기다리느라 커밋하지 못한 변경이 남으면 지우지 말고 HANDOFF 「커밋 안 한 작업」에 적는다.

## Gotchas

- **`git add`에 이미 지운 파일 경로를 섞으면 add 전체가 멈춘다**(`fatal: pathspec ... did not match`). 그 상태로 `git commit`하면 미리 staged된 것만 들어간다. 지운 파일은 `git rm`으로 따로 올리고, 커밋 뒤 `git status --short`가 비었는지 본다(2026-11-02).
- 새 worktree에는 git 밖 파일이 없어 확인 명령이 실패할 수 있다. AGENTS.md 「작업마다 새 worktree」 줄의 세 파일을 먼저 챙긴다.

## 새 worktree를 만든 직후

[AGENTS.md](../../../AGENTS.md) 「새 worktree를 만들면 먼저 정리한다」 순서를 따른다. 지울 목록을 먼저 보여 주고 OK를 받은 뒤 `chore(cleanup): ...` 커밋 하나로 남긴다. 반영된 시안의 아티팩트는 지울 목록을 사용자에게 준다(에이전트는 지울 수 없다).
