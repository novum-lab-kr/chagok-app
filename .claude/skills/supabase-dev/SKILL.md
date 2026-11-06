---
name: supabase-dev
description: 개발 서버(Supabase chagok-dev)의 테이블, RLS, RPC, Edge Function을 만들거나 고치거나, 개발 데이터를 조회하고 되돌릴 때. 토큰 다루는 법, 마이그레이션 규칙(1.0 공개 뒤라 새 파일만 더한다), 배포와 테스트 순서.
---

# 개발 서버 작업

배경은 [DEV-SETUP](../../../docs/DEV-SETUP.md) 「개발 서버」, 설계는 [계정과 백업 설계](../../../docs/superpowers/specs/2026-09-30-account-backup-design.md), 함정은 [PITFALLS](../../../docs/PITFALLS.md).

## 대상

- 개발 서버만 다룬다: 프로젝트 ref `cmkmhrzvxbtuxbgixqoo`(`chagok-dev`). 운영 서버는 이 스킬로 다루지 않는다([DEV-SETUP](../../../docs/DEV-SETUP.md) 「운영 DB 바꾸기」). 다른 프로젝트 ref가 보이면 멈추고 보고한다.

## 토큰

- CLI와 Management API는 `SUPABASE_ACCESS_TOKEN="$(cat .secrets/supabase-token)"`로 쓴다. 키체인 로그인은 쓰지 않는다.
- 토큰, service_role 키, `.p8` 내용은 출력하지 않는다. 명령에 넣을 때도 파일에서 읽어 넣고 화면에 찍히지 않게 한다.
- service_role 키는 서버 테스트와 개발 계정 만들기에만 쓴다(`.secrets/server-test.env`). 앱 코드와 `.env.local`에 넣지 않는다.

## 조회

- 짧은 SQL: `supabase db query --linked "<sql>"` 또는 Management API `POST https://api.supabase.com/v1/projects/<ref>/database/query`.
- 값을 바꾸기 전에 바꿀 행의 원래 값을 파일로 남긴다. 끝나면 되돌리거나, 되돌릴 필요가 없음을 확인해 보고한다.

## 구조 바꾸기

1. 올린 파일을 고치지 않고 새 마이그레이션 파일을 더한다. 기기 DB(`src/db/schema.ts`)도 버전을 올린다. 1.0.0과 함께 돌 수 있게 칸 추가부터 생각한다.
2. 새 테이블은 RLS를 켜고 본인 행만 읽고 쓰게 한다. 다른 사용자 행이 보이는 정책을 만들지 않는다.
3. 개발 서버에는 `supabase db push --linked`로 새 파일만 올린다. 개발 서버는 다른 세션(출시 시험)도 쓰므로 이미 있는 RPC는 옛 앱이 보내는 모양을 그대로 받게 고친다.
4. `supabase db reset --linked`(개발 서버를 비우고 처음부터 다시)는 사용자가 허락할 때만. 리셋하면 로그인 사용자도 지워져 `npm run server:dev-user`로 개발 계정을(함께 목표 시험용 두 번째 계정은 `npm run server:dev-friend -- setup`) 다시 만들고 `record-photos`를 비워야 한다. `public.change_seq`가 남는 함정은 PITFALLS.
5. 운영 반영은 이 스킬 밖이다([DEV-SETUP](../../../docs/DEV-SETUP.md) 「운영 DB 바꾸기」).

## Edge Function

- 배포: `supabase functions deploy <이름> --use-api`(Docker 없이).
- 타입 검사: `deno check`는 저장소 밖 임시 폴더에서 돌린다(저장소 안에서는 끝나지 않는다).
- secret 확인: `supabase secrets list`. 값은 출력하지 않는다.
- 실패 이유는 개발 빌드 Metro 로그 `[connect] failed`에 함수 응답 본문째 나온다.

## 확인

- `npm run test:server`로 실제 서버를 시험한다. 만든 테스트 사용자는 끝나면 지운다.
- 앱 쪽 확인이 필요하면 `sim-qa` 스킬로 넘긴다.

## Gotchas

- **서버를 비우고 다시 만드는 일은 2026-11-05(서버 2판)가 마지막이다.** 사용자: 「이런 방식은 이번까지만 할꺼고, 나중에는 마이그레이션과 수정하는 방법들을 택해야 할꺼야.」 개발 서버도 리셋하지 않고 새 파일로만 바꾼다.

- 2026-11-04: 「구조 바꾸기」가 새 파일을 더하라면서 3번에 `db reset`을 남겨 두어 출시 뒤 규칙과 어긋났다. `db push`로 고쳤다. 리셋은 다른 세션이 쓰는 개발 서버 데이터를 모두 지운다.
