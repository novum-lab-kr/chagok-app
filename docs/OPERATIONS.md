# 운영

운영 서버를 되살리고, 지켜보고, 로그를 모으고, DB와 함수를 올리고, 업데이트하는 방법이다. 로컬 개발과 개발 서버는 [개발 설정](DEV-SETUP.md), 출시 문서는 [출시](release/README.md)에 있다.

운영 서버는 Hostinger VPS(말레이시아)에 셀프호스팅한 Supabase다. 앱이 붙는 주소는 `https://chagok-api.novum-lab.com`, 접속은 `ssh chagok@<운영 서버 주소>`. 설계와 결정 이유는 [운영 서버 계획](superpowers/plans/2026-10-21-production-server.md).

## 운영 서버 복구

운영 서버는 매일 한국 시각 03:30에 DB와 사진을 R2 버킷 `chagok-prod-backup`의 restic 저장소(`restic/`)에 올린다. 설계와 서버 쪽 설정: [운영 서버 계획](superpowers/plans/2026-10-21-production-server.md) 5단계.

**필요한 것**

- restic 비밀번호: 이 맥 `.secrets/prod/restic-password`, 사용자의 비밀번호 관리자. 잃으면 백업을 열 수 없다.
- 읽기 전용 R2 토큰: `.secrets/prod/r2-restore.env`(`r2.env`와 같은 형식). 없으면 Cloudflare R2 → Manage API tokens에서 이 버킷만 Object Read only로 만든다.
- 이 맥에서 연습할 때: `brew install restic colima docker`, `colima start --cpu 2 --memory 4 --disk 20`.

**순서**

```sh
S=<chagok-app>/.secrets/prod
set -a; . $S/r2-restore.env; set +a
export AWS_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY AWS_DEFAULT_REGION=auto
export RESTIC_REPOSITORY=s3:$R2_ENDPOINT/$R2_BUCKET/restic RESTIC_PASSWORD_FILE=$S/restic-password

restic --no-lock snapshots

# DB: 운영과 같은 이미지의 빈 DB에 넣는다
restic --no-lock dump latest --tag db /chagok.dump \
  | docker exec -i <DB 컨테이너> pg_restore -U supabase_admin -d postgres --clean --if-exists

# 사진: 스냅샷 안의 경로가 서버 전체 경로(/home/chagok/supabase/volumes/storage)로 들어 있다
restic --no-lock restore latest --tag photos --target <폴더>
```

- **`--no-lock`을 꼭 붙인다.** restic은 읽기만 할 때도 저장소에 잠금 파일을 쓰려 해서, 읽기 전용 토큰으로는 `PutObject: Access Denied`로 멈춘다. 쓰기 권한이 있는 서버 토큰으로 복구할 때는 붙이지 않아도 된다.
- 실제로 서버를 새로 세울 때는 운영 서버 계획 1~4단계대로 Supabase 전체를 먼저 띄운 뒤 DB 컨테이너에 넣고, 사진은 `volumes/storage`로 옮긴다. 이 부분은 해 보지 않았다.

**연습 결과 (2026-10-22, 이 맥)**

- 운영과 같은 `supabase/postgres:17.6.1.136` 컨테이너 하나만 띄워 되살렸다. 테이블 41개의 목록, 내용이 있는 테이블 4개의 행 수, `record-photos` 버킷, RLS 정책 8개가 운영과 같았다.
- `pg_restore` 오류 38개는 모두 `supabase_realtime_admin`, `supabase_functions_admin` 계정이 없어 `realtime`, `supabase_functions` 스키마의 주인 바꾸기와 권한 주기가 실패한 것이다. 이 계정은 Postgres 이미지가 아니라 Supabase의 다른 서비스가 만든다. 전체를 띄우면 생기지 않을 것으로 보지만 확인하지 않았다. `public`, `auth`, `storage`에서는 오류가 없었다.
- 운영에 아직 사용자, 기록, 사진이 없어 실제 데이터로는 비교하지 못했다. 첫 실사용 데이터가 생기면 같은 순서로 다시 한다.
- 끝난 뒤 컨테이너와 이미지를 지우고 `colima stop`.

## 운영 서버 감시

Healthchecks.io 프로젝트 `chagok-prod`(계정 `novum-lab@naver.com`, 무료)가 신호를 받는다. 신호가 끊기거나 실패 신호가 오면 그 메일로 알린다. 점검 6개와 기준은 [운영 서버 계획](superpowers/plans/2026-10-21-production-server.md) 6단계.

- 서버: `~/monitor/monitor.sh`(5분마다 API, 컨테이너, 디스크, 메모리), `~/backup/backup.sh`(매일 백업과 R2 용량). 신호 주소는 `~/monitor/hc.env`(비밀값).
- 이 맥: API 키 `.secrets/prod/healthchecks.env`. `curl -H "X-Api-Key: $HC_API_KEY" https://healthchecks.io/api/v3/checks/`로 상태를 본다.
- 로그: `journalctl --user -u chagok-monitor -u chagok-backup`.
- 서버를 일부러 멈출 때(업데이트 등)는 알림이 온다. 미리 알고 있으면 무시하거나, Healthchecks.io 화면에서 점검을 잠깐 Pause한다. Pause한 점검은 다음 신호가 오면 다시 켜진다.

## 운영 서버 로그

컨테이너 로그는 다시 만들면 사라지므로 서버 파일로 모아 둔다(2026-10-29~, `chagok` 계정). 설계: [운영 로그 계획](superpowers/plans/2026-10-26-prod-logs.md) A. 보관 기간은 2026-10-29 결정(로그인 기록과 서버 로그, 인증 감사 기록을 달력상 3개월)을 따른다.

- **모으기:** 타이머 `chagok-logs.timer`가 5분마다 `~/logs/collect.sh`를 돌린다. auth, functions, envoy, storage, rest, db의 로그를 `~/logs/<서비스>/<UTC 날짜>.log`에 덧붙이고, 지난 날짜 파일은 압축한다.
- **보관:** 달력으로 3개월 지난 날짜 파일을 지운다. 로그인 로그에는 이메일, 이름, 접속 IP가 들어 있다.
- **인증 감사 기록:** DB의 `auth.audit_log_entries`는 매일 한 번 3개월 지난 행을 지운다. 계정을 삭제하면 `delete-account`와 `kakao-unlink`가 그 사용자의 행에서 이메일, 전화, 이름을 지우고 UUID만 남긴다(`admin_scrub_user_audit_log`).
- **파기 기록:** 계정 삭제를 처리할 때마다 `private.account_deletions`에 계정 UUID, 요청 시각, 처리 시각, 경로(`app`, `kakao_unlink`, `email`), 결과(`success`, `failed`)를 한 줄 남긴다. 이메일은 넣지 않는다. 1년 지난 행은 서버 타이머가 매일 아래 한 줄로 지운다.

```sql
delete from private.account_deletions where completed_at < now() - interval '1 year';
```

- **로그 크기:** `docker-compose.chagok-logging.yml`이 모든 컨테이너 로그를 10MB 파일 3개까지로 묶는다(`run.sh config add chagok-logging`).
- **DB 오류:** 오류는 남기되 오류 난 SQL 문장은 남기지 않는다(`log_min_error_statement=panic`, `ALTER SYSTEM`이라 다시 만들어도 남는다).
- **알림:** Healthchecks.io의 「서버 오류」 점검이 모은 로그의 오류를 받아 메일로 알린다. 신호 주소는 `~/monitor/hc.env`(비밀값).
- **다시 만들기 전에:** `sh run.sh recreate`나 업데이트 전에 `~/logs/collect.sh`를 한 번 돌린다. 안 돌리면 마지막으로 모은 뒤의 로그가 사라진다.

## 운영 DB 바꾸기

`supabase/migrations`를 운영 DB에 올리는 방법은 1.0.0 심사 제출 전과 뒤가 다르다. 지금은 제출 뒤다(AGENTS.md 「서버와 약관 규칙」).

**주의: 파일을 고쳐도 버전 번호가 같으면 운영은 「이미 적용됨」으로 보고 넘어간다.** `supabase db push`는 `supabase_migrations.schema_migrations`의 버전 번호만 보고 내용은 비교하지 않는다. 2026-10-26에 `20260930000004_account_admin.sql`을 고쳐 카카오 실패 기록 표와 찾기 함수를 더했지만, 운영은 그 전에 같은 번호로 적용돼 있어 들어가지 않았다. 2026-10-29 카카오 웹훅 테스트에서 `failed … find not recorded`로 드러났다.

**1.0.0 심사 제출 전까지만 쓴 방법 (지금은 하지 않는다): 통째로 다시 넣는다**

심사와 승인 직후 사용이 운영 서버를 쓰므로 다시 하면 안 된다. 기록으로만 남긴다.

마이그레이션 파일을 고쳐도 된다. 운영은 DB와 사진을 비우고 main의 파일 전체를 다시 넣는다(2026-10-29에 이 순서로 했다). 운영의 사용자, 기록, 사진이 모두 사라진다.

```sh
# 서버 (ssh chagok@<운영 서버 주소>)
# 1. 백업
mkdir -p ~/backup/manual
docker exec supabase-db pg_dump -U supabase_admin -d postgres -Fc > ~/backup/manual/prod-<날짜>-before-reset.dump
tar -C ~/supabase/volumes -czf ~/backup/manual/storage-<날짜>-before-reset.tgz storage

# 2. 비우기
~/logs/collect.sh   # 다시 만들면 컨테이너 로그가 사라지므로 먼저 모은다(운영 서버 로그)
cd ~/supabase && sh run.sh stop
mv volumes/db/data volumes/db/data.bak-<날짜>
mv volumes/storage volumes/storage.bak-<날짜>
sh run.sh start     # 빈 DB로 뜬다. 컨테이너 11개가 healthy인지 본다

# 3. 이 맥 (main 체크아웃): 터널을 열고 마이그레이션 전체를 넣는다
ssh -f -N -L 18432:127.0.0.1:5432 chagok@<운영 서버 주소>
supabase db push --db-url "postgresql://postgres.chagok:<비밀번호>@127.0.0.1:18432/postgres?sslmode=disable"
pkill -f "ssh .*-L 18432:127.0.0.1:5432"

# 4. 서버: DB 설정을 다시 건다. ALTER SYSTEM 값은 volumes/db/data 안에 있어 새 DB에는 없다
docker exec supabase-db psql -U supabase_admin -d postgres \
  -c "ALTER SYSTEM SET log_min_error_statement = panic" -c "select pg_reload_conf()"
```

5. **함수:** [운영 서버 함수 올리기](#운영-서버-함수-올리기)대로 네 폴더를 모두 main으로 넣는다.
6. **확인:** `public` 표 4개, `private` 표 3개(`apple_tokens`, `kakao_unlink_failures`, `account_deletions`), `record-photos` 버킷, RLS 정책 8개가 있는지 본다. 그다음 함수 「올린 뒤 확인」(401, `external`, Healthchecks)과 카카오 콘솔 웹훅 테스트(200, 함수 로그 `no_user`)를 한다.
7. **되돌리기:** `sh run.sh stop`, 새 `data`와 `storage`를 지우고 `.bak-<날짜>` 이름을 되돌린 뒤 `sh run.sh start`.

**지금: 통째로 지우지 않는다**

올린 마이그레이션 파일을 고치지 않고 새 파일만 더한다. 운영에는 새 파일만 올린다.

1. **운영과 main 비교:** 운영 `supabase_migrations.schema_migrations`의 `statements`(버전마다 적용한 문장 목록)를 꺼내 main의 같은 버전 파일과 문장 단위로 비교한다. 주석과 공백은 빼고 본다. 이미 있는 버전에 차이가 있으면 누군가 올린 파일을 고친 것이니 멈추고, 그 차이를 새 파일로 옮긴다.

   ```sh
   docker exec supabase-db psql -U supabase_admin -d postgres -At \
     -c "select version, statements from supabase_migrations.schema_migrations order by version"
   ```

2. **백업:** `docker exec supabase-db pg_dump -U supabase_admin -d postgres -Fc > ~/backup/manual/prod-<날짜>-before-<파일 이름>.dump`
3. **올리기:** 위 3번처럼 터널을 열고 같은 `supabase db push --db-url ...`를 한다. 운영에 없는 버전(새 파일)만 들어간다. 먼저 `--dry-run`을 붙여 들어갈 파일이 새 파일뿐인지 본다.
4. **함수:** 바뀐 폴더만 올린다. 방법은 [운영 서버 함수 올리기](#운영-서버-함수-올리기)와 같고 묶음과 지울 폴더 목록만 바뀐 폴더로 줄인다.
5. **확인:** 새 파일이 만든 표, 함수, 정책이 있는지 보고, 함수 「올린 뒤 확인」을 한다.
6. **되돌리기:** 2번 덤프를 [운영 서버 복구](#운영-서버-복구)의 `pg_restore`로 넣는다. 그 사이에 생긴 사용자 데이터는 사라지므로 먼저 새 파일로 되돌리는 마이그레이션을 쓸 수 있는지 본다.

## 운영 서버 함수 올리기

셀프호스팅은 파일 복사가 배포다. `supabase/functions`의 `_shared`, `apple-link`, `delete-account`, `kakao-unlink`를 서버 `~/supabase/volumes/functions/`에 넣고 functions만 다시 띄운다. `main/`과 `deno.jsonc`는 Supabase가 둔 파일이라 건드리지 않는다. 함수가 읽는 비밀값(`APPLE_*`, `KAKAO_ADMIN_KEY`)은 서버 `.env`에 있고 `docker-compose.chagok.yml`이 넘긴다.

```sh
# 이 맥 (main 체크아웃)
COPYFILE_DISABLE=1 tar -C supabase/functions -czf /tmp/fn.tgz _shared apple-link delete-account kakao-unlink
scp /tmp/fn.tgz chagok@<운영 서버 주소>:~/fn.tgz && rm /tmp/fn.tgz

# 서버
cd ~/supabase/volumes
cp -a functions functions.bak-<날짜>
cd functions && rm -rf _shared apple-link delete-account kakao-unlink && tar -xzf ~/fn.tgz && rm ~/fn.tgz
~/logs/collect.sh   # 다시 만들면 컨테이너 로그가 사라지므로 먼저 모은다(운영 서버 로그)
cd ~/supabase && sh run.sh recreate functions
```

- **네 폴더를 모두 넣는다.** 2026-10-29까지 이 목록에 `kakao-unlink`가 빠져 있어 운영에 카카오 연결 해제 웹훅이 없었다(404).

- **`COPYFILE_DISABLE=1`을 꼭 붙인다.** 없으면 맥 tar가 `._apple.ts` 같은 부속 파일을 함께 넣는다(2026-10-26).
- **묶음은 파일로 보낸다.** `tar ... | ssh '...' <<EOF`처럼 원격 명령을 heredoc으로 넘기면서 묶음을 같은 입력에 섞으면, 원격 셸이 묶음을 명령으로 읽고 아무것도 하지 않는다.
- **다시 띄울 때는 `sh run.sh`를 쓴다.** `docker compose up`은 우리 설정 `docker-compose.chagok.yml`을 빼고 띄워 카카오, Google, 함수 비밀값이 사라질 수 있다.
- 되돌리기: `rm -rf functions && mv functions.bak-<날짜> functions && sh run.sh recreate functions`.

**올린 뒤 확인** — 로그인을 끊지 않는 확인만 한다. 출시 뒤에도 이것만 한다.

- 서버 파일이 main과 같은지: 양쪽에서 `sha256sum`(맥은 `shasum -a 256`)을 비교한다.
- `supabase-edge-functions`가 healthy이고 `docker logs --since 10m supabase-edge-functions`에 오류가 없는지.
- 토큰 없이 부르면 막히는지: `curl -X POST http://127.0.0.1:8000/functions/v1/delete-account`와 `apple-link`가 401, `kakao-unlink`도 어드민 키 없이 부르면 401.
- `/auth/v1/settings`의 `external`이 `apple`, `google`, `kakao`만 true인지.
- 5분 안에 Healthchecks.io 6개가 모두 초록인지.

**운영 서버 테스트 (출시 전까지만, 2026-10-26 결정)**

`__tests__/server`는 관리 키로 테스트 사용자를 만들고 이메일과 비밀번호로 로그인한다. 운영은 이메일 로그인이 꺼져 있어, 돌리는 동안만 켠다.

```sh
# 서버: 켜기
cd ~/supabase && sed -i "s|^ENABLE_EMAIL_SIGNUP=.*|ENABLE_EMAIL_SIGNUP=true|" .env && sh run.sh recreate auth

# 이 맥: 터널을 열고 돌린다. server-test.env는 http://127.0.0.1:18000과 운영 키를 가리킨다
ssh -f -N -L 18000:127.0.0.1:8000 chagok@<운영 서버 주소>
set -a; . .secrets/prod/server-test.env; set +a
npx jest __tests__/server --runInBand
pkill -f "ssh .*-L 18000:127.0.0.1:8000"

# 서버: 끄기, 그리고 남은 사용자, 사진, 행이 0인지 본다
sed -i "s|^ENABLE_EMAIL_SIGNUP=.*|ENABLE_EMAIL_SIGNUP=false|" .env && sh run.sh recreate auth
```

출시 뒤에는 운영에서 돌리지 않는다. 켜고 끌 때 auth를 두 번 다시 띄워 그때마다 몇 초 로그인과 토큰 갱신이 실패한다. 켜져 있는 동안은 누구나 이메일 가입을 보낼 수 있다(자동 확인이 꺼져 있어 로그인은 못 하지만 계정 행은 남을 수 있다). 중간에 끊기면 `@chagok.test` 계정이 운영에 남는다. 출시 뒤에는 전체 테스트를 [개발 서버](DEV-SETUP.md#개발-서버-백업복원-개발)에서 돌리고, 운영은 위 「올린 뒤 확인」만 한다. 셀프호스팅에서만 생기는 문제(2026-10-21 함수의 토큰 발급자 주소처럼)는 운영 로그로 찾는다.

## 운영 서버 업데이트

Supabase는 대략 한 달에 한 번 `self-hosted/v*` 태그를 낸다. 공식 `update.sh`가 설정 파일을 새 판과 3방향으로 합친다. `.env` 값, `volumes/db/data`, `volumes/storage`는 건드리지 않지만 **DB와 사진을 백업하지는 않는다.** 지금 판은 `~/supabase/.supabase-version`에 있다(2026-10-26 `self-hosted/v0.8.3`). 모두 `ssh chagok@<운영 서버 주소>`에서 한다.

1. **바뀌는 것 읽기:** 새 태그의 `CHANGELOG.md`와 `upgrades.json`(깨지는 변경)을 읽는다. Postgres 큰 판이 바뀌면(17 → 18 등) 이 순서로 하지 않고 따로 계획한다.
2. **백업:** `systemctl --user start chagok-backup.service`. Healthchecks.io의 백업이 방금 시각으로 초록인지 본다.
3. **미리 보기:** `cd ~/supabase && sh update.sh --dry-run --to <태그>`. 바뀌는 파일과 충돌을 본다.
4. **설정 합치기:** `sh update.sh --to <태그>`. 충돌이 나면 멈추고 손으로 고친다.
5. **이미지 받기와 다시 띄우기:** `sh run.sh pull`, `~/logs/collect.sh`(다시 만들기 전에 로그를 모은다), `sh run.sh recreate`. 한 태그의 이미지만 쓴다. 서비스 하나만 다른 판으로 올리지 않는다.
6. **확인:**
   - 컨테이너 11개가 healthy인지(`docker ps`).
   - 포트가 여전히 `127.0.0.1`에만 열려 있는지(`ss -tlnp | grep -E ':(8000|5432|6543) '`). 우리 설정 `docker-compose.chagok.yml`은 공식 파일이 아니라 합치기에서 빠지지만, 공식 파일의 포트 줄이 바뀌면 다시 본다.
   - 5분 안에 Healthchecks.io 6개가 모두 초록인지.
   - 앱(개발 빌드를 운영 서버에 붙인 것)에서 로그인과 백업을 한 번.
7. **기록:** 계획 문서나 HANDOFF에 날짜, 이전 태그, 새 태그를 적는다.

되돌리기: `update.sh`가 바꾸기 전 설정을 `~/supabase/backups/`에 남긴다. 설정을 되돌리고 `sh run.sh recreate`. DB 구조가 이미 새 판으로 바뀌었으면 설정만 되돌려서는 안 되고 2번 백업에서 [복구](#운영-서버-복구)한다.

이 순서는 아직 실제로 해 보지 않았다. 처음 할 때 `--dry-run` 결과를 보고 고친다.
