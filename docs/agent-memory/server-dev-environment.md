---
name: server-dev-environment
description: "Backup server runs on a Supabase cloud dev project (chagok-dev, Seoul); where keys live and how to push/test; production hosting undecided"
metadata:
  node_type: memory
  type: project
  originSessionId: 0f07339a-94c2-4372-aeaa-17ac8036a01b
  modified: 2026-09-30T14:49:57.929Z
---

백업 서버의 개발 환경은 Supabase 클라우드 무료 프로젝트 **`chagok-dev`**(ref `cmkmhrzvxbtuxbgixqoo`, 서울)다. 2026-09-30 사용자 결정 — 로컬 Docker는 맥을 켜 둬야 해서, VPS(Hostinger KVM 4, 말레이시아)는 준비가 많아서 택하지 않았다. 프로젝트는 "새 테이블 자동 공개" 끔, 자동 RLS 켬.

- 서버 설정은 저장소 `supabase/`에 있고 `supabase db push`, `supabase functions deploy delete-account --use-api`로 올린다. CLI는 Homebrew(앱 의존성 아님), 로그인·link 완료.
- 키: 앱용 `.env.local`(publishable 키, 개발 계정 `dev@chagok.test`), 관리자 키는 **`.secrets/server-test.env`**. 둘 다 git-ignore. 관리자 키 파일 이름을 `.env.`로 시작하게 두면 Expo 개발 서버가 번들에 넣으려다 빌드가 깨진다(실제로 겪음).
- 실제 서버 테스트 `npm run test:server`(27개, 테스트 사용자는 끝나면 지움). 평소 `npm test`에서는 건너뛴다. 서버 키를 환경에 띄운 채 `npm test`를 돌리면 서버 테스트가 병렬로 돌아 실패한다.
- 앱의 개발용 화면: 앱 설정 → 개발 → 서버 동기화 (`/dev/sync`, `__DEV__` 전용). 오류 원문을 그대로 보여주는 것은 의도다(사용자 확인).
- 실기기에서 로그인·올리기·사진(1600×1200)·자동 백업·오프라인 복귀 확인, 복원은 미확인.

**Why:** 운영 서버는 출시 전에 정하기로 했다. 1순위는 Supabase 클라우드 서울의 별도 프로젝트(무료면 매일 DB 백업 작업 필수), 대안은 VPS(처리방침에 국외 이전 기재). 약관의 `[클라우드 사업자]` 빈칸이 이 결정에 달려 있다 — [[policy-site-pending]].

**How to apply:** 서버 작업은 새 마이그레이션 파일을 더해 `db push`한다(올린 파일은 고치지 않는다). 남은 일은 `docs/superpowers/specs/2026-09-30-account-backup-design.md`의 「서버 단계 뒤에 남은 것」. 사용자가 직접 바꾼 미커밋 문서 변경(HANDOFF·PRD)은 건드리지 않는다.
