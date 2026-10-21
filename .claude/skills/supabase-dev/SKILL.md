---
name: supabase-dev
description: 개발 서버(Supabase chagok-dev)의 테이블, RLS, RPC, Edge Function을 만들거나 고치거나, 개발 데이터를 조회하고 되돌릴 때. 토큰 다루는 법, 출시 전 마이그레이션 규칙, 배포와 테스트 순서.
---

# 개발 서버 작업

배경은 [DEV-SETUP](../../../docs/DEV-SETUP.md) 「개발 서버」, 설계는 [계정과 백업 설계](../../../docs/superpowers/specs/2026-09-30-account-backup-design.md), 함정은 [PITFALLS](../../../docs/PITFALLS.md).

## 대상

- 개발 서버만 다룬다: 프로젝트 ref `cmkmhrzvxbtuxbgixqoo`(`chagok-dev`). 운영 서버는 아직 정하지 않았다. 다른 프로젝트 ref가 보이면 멈추고 보고한다.

## 토큰

- CLI와 Management API는 `SUPABASE_ACCESS_TOKEN="$(cat .secrets/supabase-token)"`로 쓴다. 키체인 로그인은 쓰지 않는다.
- 토큰, service_role 키, `.p8` 내용은 출력하지 않는다. 명령에 넣을 때도 파일에서 읽어 넣고 화면에 찍히지 않게 한다.
- service_role 키는 서버 테스트와 개발 계정 만들기에만 쓴다(`.secrets/server-test.env`). 앱 코드와 `.env.local`에 넣지 않는다.

## 조회

- 짧은 SQL: `supabase db query --linked "<sql>"` 또는 Management API `POST https://api.supabase.com/v1/projects/<ref>/database/query`.
- 값을 바꾸기 전에 바꿀 행의 원래 값을 파일로 남긴다. 끝나면 되돌리거나, 되돌릴 필요가 없음을 확인해 보고한다.

## 구조 바꾸기 (출시 전 규칙)

1. 새 마이그레이션 파일을 더하지 않는다. `supabase/migrations`의 파일을 최종 구조로 고친다. 기기 DB(`src/db/schema.ts`)도 v1을 고친다.
2. 새 테이블은 RLS를 켜고 본인 행만 읽고 쓰게 한다. 다른 사용자 행이 보이는 정책을 만들지 않는다.
3. `supabase db reset --linked`로 개발 서버를 비우고 다시 적용한다. `public.change_seq`가 남는 함정은 PITFALLS를 본다.
4. 리셋하면 로그인 사용자도 지워진다. `npm run server:dev-user`로 개발 계정을 다시 만들고, 사진 저장소(`record-photos`)에 남은 파일을 지운다.
5. 개발 기기의 앱 데이터도 지운다(`sim-qa` 스킬 「처음 상태로 돌리기」).

## Edge Function

- 배포: `supabase functions deploy <이름> --use-api`(Docker 없이).
- 타입 검사: `deno check`는 저장소 밖 임시 폴더에서 돌린다(저장소 안에서는 끝나지 않는다).
- secret 확인: `supabase secrets list`. 값은 출력하지 않는다.
- 실패 이유는 개발 빌드 Metro 로그 `[connect] failed`에 함수 응답 본문째 나온다.

## 확인

- `npm run test:server`로 실제 서버를 시험한다. 만든 테스트 사용자는 끝나면 지운다.
- 앱 쪽 확인이 필요하면 `sim-qa` 스킬로 넘긴다.
