---
name: repo-migration
description: 레포 이전 준비(2026-10-04) — git에 없는 것과 메모리 복원 절차는 docs/migration/README.md, 메모리 사본은 docs/agent-memory/
metadata:
  type: project
---

2026-10-04 앱·정책 저장소 모두 GitHub Org `nol-meok`으로 옮겼다(앱 origin: `https://eunjukkkkim@github.com/nol-meok/chagok-app.git`, 로컬 폴더는 그대로라 메모리도 그대로 유효). 사용자가 레포를 옮기며 옮긴 뒤에도 이어서 작업할 수 있어야 한다고 했다. 체크리스트는 `docs/migration/README.md`(키 파일 `.env.local`·`.secrets/`, 커밋 안 한 작업 패치, 로컬에만 있는 브랜치, 메모리 복원 명령).

**Why:** 이 메모리 폴더는 저장소 경로 기준이라 경로가 바뀌면 새 세션이 찾지 못한다.

**How to apply:** 메모리를 고치면 `docs/agent-memory/`에도 같은 파일을 복사해 둔다. 새 경로에서 메모리가 비어 있으면 `docs/migration/README.md` 3절대로 복원한다.
