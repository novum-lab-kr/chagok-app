# 운영 서버 준비 계획

> 출시용 백업 서버를 지금 쓰는 VPS에 Supabase로 올리고, 매일 외부에 백업하고, 앱 빌드를 그 서버로 돌리기까지의 순서다.
> 2026-10-21 초안. 사용자가 승인하기 전에는 서버에 읽기 말고 아무것도 하지 않는다.
> 단계마다 서버를 바꾸는 명령은 실행 전에 무엇을 바꾸는지 말하고 허락을 받는다.

**목표:** 출시 빌드(`production`)가 운영 서버에 로그인하고, 백업하고, 다른 기기에서 복원하고, 계정을 지울 수 있다. 서버가 통째로 사라져도 하루 전 상태로 되살릴 수 있다.

**근거 문서:** [계정과 백업 설계](../specs/2026-09-30-account-backup-design.md), PRD 4.8과 11절, [출시 점검](../../RELEASE-CHECKLIST.md), [개발 설정](../../DEV-SETUP.md) 「개발 서버」.

## 정한 것 (2026-10-21)

| 항목 | 결정 | 이유 |
| --- | --- | --- |
| 운영 서버 | 이미 쓰는 Hostinger VPS(KVM 4, 말레이시아 쿠알라룸푸르, Ubuntu 24.04)에 Supabase를 셀프호스팅 | 추가 비용이 없다. 자원이 충분하다(아래 「서버 현황」) |
| 백업 보관 | Cloudflare R2, 관할 지역 `us`, Standard 등급 | 가장 싸고 설정이 단순하다. 관할 지역을 정하면 저장 위치가 보장되어 처리방침에 나라를 적을 수 있다 |
| 백업 주기 | 매일, 30일 보관 | PRD 「서버」 절의 기존 결정(매일 백업, 30일 보관) 그대로 |
| 개발 서버 | Supabase 클라우드 `chagok-dev` 그대로 | `preview` 빌드와 개발은 계속 여기를 쓴다 |
| 분리 | 리눅스 사용자 `chagok`을 만들고, 그 사용자만 쓰는 Docker(rootless Docker)에서 Supabase를 돌린다. `chagok`에는 sudo를 주지 않는다 | 이 VPS에서는 AI 에이전트가 root로 일한다. 서버 Docker를 같이 쓰면 `docker compose down`이나 `prune` 한 번에 같이 내려간다. 따로 돌리면 서버 Docker 명령에 보이지도 않는다. root는 여전히 모두 볼 수 있으므로 매일 외부 백업은 그대로 둔다 |
| swap | 서버 전체에 4GB, `swappiness` 10 | 아래 「swap」 |
| 주소 | `chagok-api.novum-lab.com`. Cloudflare DNS에 A 레코드 `187.127.114.161`, 프록시 끔(DNS only) | Caddy가 인증서를 직접 받아 가장 단순하다. 서버 IP는 Hostinger 서버 이름(`srv1840750.hstgr.cloud`)으로 이미 공개돼 있어 프록시로 숨기는 이득이 작다. 필요해지면 프록시를 켜고 SSL 모드를 Full (strict)로 맞춘다 |

검토한 다른 안: Supabase 클라우드 서울(운영 부담이 가장 적지만 월 비용이 든다), S3 서울 리전 백업(처리방침의 나라가 하나 줄지만 설정이 더 복잡하다). 공식 문서와 가격 확인 결과는 2026-10-21 대화 기록에 있다.

**처리방침에 생기는 일:** VPS가 말레이시아라 국외 이전 항목이 생긴다. 개인정보 보호법 제28조의8 제1항 제3호 가목(계약 이행에 필요한 처리위탁이나 보관을 처리방침에 공개)에 따라 별도 동의 없이 처리방침 공개로 한다. 나라는 말레이시아(Hostinger)와 미국(Cloudflare) 둘이다. PRD 「서버」 절의 「국내 리전」은 이 결정으로 바뀐다.

**root SSH 설정 (2026-10-21 확정): 바꾸지 않는다.** root SSH는 다른 사람도 쓰는 서버 설정이고, 비밀번호 로그인(`PasswordAuthentication`)이 이미 꺼져 있어 `PermitRootLogin prohibit-password`로 바꿔도 실제로 달라지는 것이 거의 없다.

**swap (2026-10-21 확정):** 서버 전체에 4GB, `swappiness` 10. 지금 swap이 0이라 메모리가 순간적으로 모자라면 프로세스가 강제로 죽는다(Postgres일 수도 있다). swap은 서비스별로 나눌 수 없어 다른 서비스도 같이 쓴다. 평소에는 거의 쓰지 않고, 모자란 순간에만 죽는 대신 느려진다. 다른 서비스의 설정은 바꾸지 않는다.

## 서버 현황 (2026-10-21, 읽기만 해서 확인)

- RAM 16GB 중 약 8.5GB 여유, swap 0. 디스크 193GB 중 92GB 여유. 부하 0.5 안팎.
- Caddy가 80과 443을 받아 `novum-lab.com` 하위 도메인으로 나눈다. ufw는 22, 80, 443만 연다. 나머지 서비스는 모두 `127.0.0.1`에 묶여 있다.
- 쓰고 있는 포트: 3000, 3100, 3113, 3120, 3200, 5000, 8093~8099, 8642, 15432(별개의 postgres:17 `db-container`). Supabase가 쓸 8000, 5432, 6543은 비어 있다.
- Hostinger 자체 백업은 주 1회다. 운영 백업으로는 모자라 R2 백업을 따로 둔다.
- 기존 `db-container`(postgres:17, `/root/db-container`)는 `safemeal_db`, `shared_db`를 담은 다른 서비스의 DB다. Supabase는 전용 이미지(`supabase/postgres`)로 자기 DB를 따로 띄우므로 이 컨테이너를 쓰지도 지우지도 않는다.
- rootless Docker 준비 상태: Docker CE 29.6.2(공식 deb), `docker-ce-rootless-extras`와 `dbus-user-session` 설치됨, cgroup v2, `apparmor_restrict_unprivileged_userns=1`(deb 설치는 AppArmor 설정이 함께 들어 있다고 공식 문서에 있음). `uidmap`은 없다. `chagok` 사용자는 아직 없다.

Supabase 공식 권장 사양은 RAM 8GB, CPU 4코어, 디스크 80GB 이상이다(최소 4GB, 2코어, 40GB). 로그 분석(Logflare)은 기본으로 꺼져 있고 켜지 않는다.

## 지킬 것

- 이 문서와 바뀐 문서는 새 worktree에서 쓰고, 사용자 승인 뒤 커밋한다.
- 서버를 바꾸는 명령은 단계마다 먼저 보여 주고 허락을 받는다. 바꾸기 전에 그 파일을 백업한다(Caddy는 `Caddyfile.pre-chagok-<날짜>`).
- 비밀값(DB 비밀번호, JWT, 키, R2 키, Apple `.p8`)은 서버의 `/home/chagok/supabase/.env`와 이 맥의 `.secrets/prod/`에만 둔다. 커밋하지 않고, 대화나 문서에 값을 쓰지 않는다.
- 기존 컨테이너, 기존 `db-container`, 다른 사이트의 Caddy 블록은 건드리지 않는다.

## 0단계: 계정 준비 (사용자)

도메인은 Hostinger에서 샀고 DNS는 Cloudflare다. 2026-10-22에 존을 다른 Cloudflare 계정(`Mcsung.novum`, 네임서버 `annalise`, `vick`)에서 `Novum-lab@naver.com` 계정(네임서버 `carrera`, `clayton`)으로 옮겼다. 옛 존의 레코드 10개 가운데 메일(이메일 라우팅의 MX 3개, SPF, DKIM)은 더 쓰지 않아 옮기지 않았다. 옛 존은 전환이 퍼질 때까지(최대 이틀) 지우지 않는다.

- [x] `Novum-lab@naver.com` 계정에서 R2를 켠다. 공식 문서에 "You must purchase R2 before you can generate an API token"이라고 되어 있어 결제 수단 등록이 필요할 수 있다.
- [x] 새 존 레코드: `novum-lab.com`, `*`(A), `www`(CNAME), `syung`(A, DNS only), Google 인증 TXT, `chagok-api`(A `187.127.114.161`, DNS only). SSL/TLS 모드 Full. 확인: 공개 DNS 4곳이 `chagok-api`를 `187.127.114.161`로 답한다.
- [ ] 새 계정 활성화와 인증서 발급 뒤, 전환 동안 회색으로 둔 `novum-lab.com`, `*`, `www`를 다시 프록시로 켠다.
- [ ] 이틀 뒤 옛 계정의 존을 지워도 되는지 확인한다(계정 주인이 지운다).
- [ ] Hostinger의 정식 법인 이름과 연락처를 확인한다(처리방침의 이전받는 자).

## 1단계: 자리 만들기

공식 문서(Docker Rootless mode) 순서를 따른다. root로 하는 일(서버 전체)과 `chagok`으로 하는 일을 나눈다.

**root로 (서버 전체, 단계마다 먼저 묻는다)**

- [x] 사용자 `chagok` 만들기. sudo 그룹에 넣지 않는다. 홈 폴더는 다른 사용자가 못 읽게 `700`.
- [x] `/etc/subuid`, `/etc/subgid`에 `chagok` 줄이 65,536개 이상으로 생겼는지 확인(사용자를 만들 때 자동으로 생긴다).
- [x] `apt-get install uidmap`. 지금 서버에 없는 유일한 준비물이다.
- [x] 지금 쓰시는 SSH 공개키를 `/home/chagok/.ssh/authorized_keys`에 넣는다. 운영 작업은 `ssh chagok@187.127.114.161`로 한다. 공식 문서상 `sudo -iu`나 `sudo su`로 사용자를 바꾸면 rootless Docker가 제대로 안 돈다.
- [x] `loginctl enable-linger chagok`. 로그아웃해도 `chagok`의 Docker와 백업 타이머가 계속 돈다.
- [x] swap 4GB 파일을 만들고 `swapon`, `sysctl vm.swappiness=10`. 둘 다 바로 적용되어 재부팅하지 않는다. 재부팅 뒤에도 유지되게 `/etc/fstab`와 `/etc/sysctl.d/`에 적는다. 확인: `free -h`에 Swap 4.0Gi, `findmnt --verify`가 깨끗하고, `swapoff` 뒤 `swapon -a`로 fstab만 보고 다시 켜진다(fstab이 틀리면 다음 부팅이 막힐 수 있어서).

**`chagok`으로**

- [x] `dockerd-rootless-setuptool.sh install --force`. 서버 Docker는 다른 서비스가 쓰므로 끄지 않는다. 공식 문서상 서버 Docker를 켜 둔 채 설치하려면 `--force`가 필요하다.
- [x] `systemctl --user enable --now docker`. `DOCKER_HOST=unix:///run/user/<chagok uid>/docker.sock`(또는 `docker context use rootless`).
- [x] 확인:
  - `chagok`의 `docker run --rm hello-world`가 된다.
  - root의 `docker ps`에 `chagok` 컨테이너가 보이지 않고, `chagok`의 `docker ps`에 서버 컨테이너가 보이지 않는다.
  - 서버 재부팅 없이 `systemctl --user restart docker` 뒤에도 다시 뜬다.
  - root의 `docker ps`, `ss -tlnp`에 기존 서비스가 그대로 있다.

**rootless로 돌릴 때 알아 둘 것 (공식 문서)**

- 네트워크가 사용자 공간에서 돌아 일반 Docker보다 느리다. 차곡차곡의 백업 요청 규모에서는 문제가 아닐 것으로 보지만, 4단계 확인에서 응답 시간을 본다.
- 포트를 `127.0.0.1`에만 여는 것이 rootless에서도 되는지는 문서에 없다. 2단계에서 확인한다.
- 요청한 사람의 IP가 컨테이너에 그대로 가지 않는다. Caddy가 `X-Forwarded-For`로 넘기므로 로그인 요청 제한이 이 값을 쓰는지 4단계에서 확인한다.
- Supabase를 rootless Docker로 돌리는 방법은 Supabase 공식 문서에 없다. 2단계에서 막히면 멈추고 사용자에게 알린다.

## 2단계: Supabase 설치

공식 문서(Self-Hosting with Docker) 순서를 따른다. 문서 예시는 `self-hosted/v0.8.3`이고, 설치할 때 최신 `self-hosted/v*` 태그를 고른다. 모두 `chagok`으로, `chagok`의 Docker에서 한다.

- [x] `git clone --depth 1 --branch <태그> https://github.com/supabase/supabase`, `docker/` 내용을 `/home/chagok/supabase/`로 복사, `.env.example`을 `.env`로.
- [x] compose 설정에서 서버 Docker 소켓(`/var/run/docker.sock`)을 가리키는 곳이 있으면 `chagok`의 소켓으로 바꾼다. 서버 Docker에 붙으면 분리가 깨진다.
- [x] `sh utils/generate-keys.sh`, `sh utils/add-new-auth-keys.sh`로 비밀값을 만든다. 기본값으로 절대 시작하지 않는다(공식 문서 경고).
  - 직접 정하는 값: `POSTGRES_PASSWORD`(영문과 숫자만), `DASHBOARD_PASSWORD`(영문 포함, 특수문자 없이)
  - 주소 값: `SUPABASE_PUBLIC_URL`, `API_EXTERNAL_URL`을 `https://chagok-api.novum-lab.com`으로
- [x] **포트를 모두 `127.0.0.1`에 묶는다.** 게이트웨이 8000, 풀러 5432와 6543. 기본 compose는 이 셋을 호스트 IP 없이(모든 주소에) 연다. 밖에서는 Caddy를 거쳐서만 들어온다.
  - 기본 게이트웨이는 Envoy다(`self-hosted/v0.8.3` 기준). Kong으로 바꾸지 않는다. Kong 설정을 켜면 HTTPS 포트 8443이 더 생기므로, 켜게 되면 그것도 `127.0.0.1`에 묶는다.
  - 확인: 이 맥에서 서버로 포트를 훑어 22, 80, 443만 열려 있다.
- [x] Studio(관리 화면)는 인터넷에 열지 않는다. 쓸 때는 이 맥에서 SSH 터널(`ssh -L 8000:127.0.0.1:8000 chagok@...`)로 연다.
- [x] 사진 저장은 기본값(VPS 디스크, `volumes/storage`)을 쓴다. 원본은 말레이시아에 두고 R2에는 암호화한 백업만 둔다.
- [x] `sh run.sh start`. 확인: 컨테이너가 모두 healthy, `curl http://127.0.0.1:8000/rest/v1/` 응답.

**2단계 결과 (2026-10-21)**

- `self-hosted/v0.8.3`(최신 태그, Postgres 17.6). 공식 `setup.sh`는 sudo로 준비물을 깔려고 해서 쓰지 않고 같은 순서를 손으로 했다. 받은 원본은 `/home/chagok/supabase-src`.
- 서버 Docker 소켓은 로그 수집 추가 설정(`docker-compose.logs.yml`)에서만 쓴다. 켜지 않으므로 바꿀 것이 없었다.
- `POSTGRES_PORT`는 컨테이너끼리 연결하는 데도 쓰여 값에 `127.0.0.1`을 넣을 수 없다. 공식 파일은 그대로 두고 `docker-compose.chagok.yml`(`ports: !override`)로 묶은 뒤 `sh run.sh config add chagok`으로 `COMPOSE_FILE`에 더했다.
- 전화번호 가입과 이메일 가입은 처음 켜기 전에 껐다(4단계에서 하려던 것). `/auth/v1/settings`의 `external`이 모두 false.
- 11개 컨테이너가 rootless에서 모두 healthy. 서버 `ss`에 8000, 5432, 6543이 `127.0.0.1`에만 있고, 이 맥에서 훑으면 22, 80, 443만 열려 있다. 메모리는 약 1.2GB 늘었다(여유 7.3GB).
- 확인 못 한 것: anon 키로 `/rest/v1/` 루트가 403이다(키 없이는 401). 테이블이 없는 지금은 판단할 수 없어 4단계에서 실제 테이블로 확인한다.
- 비밀값 사본: 이 맥 `.secrets/prod/supabase.env`(권한 600, git 제외, 서버와 해시 같음).
- 서버에서 `chagok` Docker 보기: `ssh chagok@187.127.114.161` 뒤 `docker ps`, 또는 root에서 `docker -H unix:///run/user/1003/docker.sock ps`. 8단계에서 DEV-SETUP에 옮긴다.

## 3단계: 주소 연결 (Caddy)

- [x] Caddyfile을 백업하고 `chagok-api.novum-lab.com` 블록을 더한다. `127.0.0.1:8000`으로 넘기되, 앱이 쓰는 경로(`/auth/v1/`, `/rest/v1/`, `/storage/v1/`, `/functions/v1/`)만 열고 나머지는 막는다. 앱은 실시간(realtime) 기능을 쓰지 않는다.
- [x] `caddy validate` 뒤 reload. 확인: 바깥에서 `https://chagok-api.novum-lab.com/auth/v1/health` 응답, 루트 경로(Studio)는 막힘, 기존 사이트가 그대로 열림.

**3단계 결과 (2026-10-22)**

- 백업 `/etc/caddy/Caddyfile.pre-chagok-20261022`. 블록은 파일 맨 끝에 더했고 다른 블록은 그대로다. `systemctl reload caddy`(재시작 아님).
- 인증서: Let's Encrypt, 2027-01-19까지. reload 10초 안에 받았다.
- 바깥에서: `/auth/v1/health`는 anon 키로 200, 키 없이 401. `/rest/v1/` 401, `/functions/v1/delete-account` 토큰 없이 401. `/`, `/project/default`, `/realtime/v1/`, `/pg/`, `/analytics/v1/`은 404. HTTP는 HTTPS로 308.
- 바깥에서 이메일 가입과 전화번호 가입이 400(`email_provider_disabled`, `phone_provider_disabled`)으로 거절되고, 남은 사용자는 0이다. 로그인 수단은 `apple`만 켜져 있다.
- 기존 사이트 `novum-lab.com`, `www`, `office`, `safemeal`, `dev.safemeal`, `syung`은 VPS에 직접 붙여 200(www는 301).
- 되돌리기: 백업 파일을 `/etc/caddy/Caddyfile`로 복사하고 `systemctl reload caddy`.

## 4단계: 스키마, 함수, 로그인

- [ ] **스키마:** `supabase/migrations`의 파일 4개를 순서대로 적용한다. 방법은 SSH 터널로 Postgres에 붙어 `supabase db push --db-url`을 쓰는 것을 먼저 시험하고, 안 되면 `psql`로 파일을 차례로 넣는다(셀프호스팅 문서가 `db push`를 다루지 않는다). 확인: 테이블, RPC, `record-photos` 버킷, 접근 정책(RLS)이 개발 서버와 같다.
- [ ] **함수:** `supabase/functions/delete-account`, `apple-link`, `_shared`를 `volumes/functions/`로 복사하고 `sh run.sh restart functions`. 셀프호스팅은 파일 복사가 공식 배포 방법이다.
- [ ] **함수 비밀값:** `.env.functions`에 `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_CLIENT_ID`, `APPLE_PRIVATE_KEY`를 넣는다. 두 함수가 읽는 `SUPABASE_SERVICE_ROLE_KEY`가 셀프호스팅 함수 환경에 들어오는지 확인한다(문서에는 새 키 이름만 나온다).
- [ ] **함수의 로그인 검증 주소:** `supabase/functions/_shared/auth.ts`는 토큰 서명 키(JWKS) 주소와 issuer를 함수 환경의 `SUPABASE_URL`로 만든다.
  - 셀프호스팅에서 이 값은 내부 주소(`http://api-gw:8000`)이고, 토큰의 issuer는 외부 주소(`https://chagok-api.novum-lab.com/auth/v1`)일 수 있다.
  - 어긋나면 계정 삭제와 Apple 연결이 401로 실패한다. 막히는 쪽으로 실패하므로 보안 문제는 아니다.
  - 확인: 운영 서버에서 로그인한 토큰으로 두 함수를 불러 본다. 실패하면 issuer 비교에 쓸 외부 주소를 함수 환경 변수로 따로 넘기도록 `auth.ts`를 고친다(코드 변경이므로 별도 작업).
- [ ] **Apple 로그인:** `.env`의 `APPLE_ENABLED=true`, `APPLE_CLIENT_ID=com.novumlab.chagok`와 `docker-compose.yml` auth 서비스의 `GOTRUE_EXTERNAL_APPLE_*` 줄. 공식 문서는 웹 방식(Services ID와 secret)만 다룬다. 앱은 기기에서 받은 ID 토큰 방식이라 secret을 비워도 되는지 시험해서 정한다.
- [ ] **Apple 말고 다른 가입을 모두 끄기:** `.env`에 `ENABLE_PHONE_SIGNUP=false`, `ENABLE_EMAIL_SIGNUP=false`, `ENABLE_ANONYMOUS_USERS=false`를 명시한다.
  - 셀프호스팅 `.env.example`의 기본값은 `ENABLE_PHONE_SIGNUP=true`, `ENABLE_PHONE_AUTOCONFIRM=true`다(2026-10-21 보안 검토에서 확인).
  - 그대로 두면 누구나 `POST /auth/v1/signup`에 아무 전화번호와 비밀번호를 보내, SMS 확인 없이 로그인된 계정을 얻는다.
  - 그 계정으로 자기 폴더에 사진을 개수 제한 없이 올려 서버를 파일 호스팅으로 쓸 수 있다. 다른 사용자의 데이터에는 닿지 않는다.
  - `DISABLE_SIGNUP=true`로 막으면 Apple로 처음 들어오는 사용자도 계정을 못 만든다. 그래서 수단별로 끈다.
- [ ] **확인:**
  - `npm run test:server`를 운영 서버로 한 번 돌리고 만든 테스트 사용자를 지운다.
  - `/auth/v1/settings`의 `external`에서 `apple`만 true이고 `phone`과 `email`은 false다.
  - 바깥에서 전화번호로 `/auth/v1/signup`을 보내면 거절된다.

**4단계 결과 (2026-10-21, DNS 없이 한 부분)**

- 2단계에서 `API_EXTERNAL_URL`을 `/auth/v1` 없이 넣은 것을 고쳤다(공식 예시는 `/auth/v1`까지). 이 값이 토큰 발급자(`GOTRUE_JWT_ISSUER`)가 된다. 서버가 바깥에 열리기 전이라 영향 없음.
- 토큰 서명은 ES256이고 JWKS에 공개 키가 나온다. 게이트웨이의 JWKS 경로는 API 키 없이 열린다.
- Apple: `docker-compose.chagok.yml`의 auth에 `GOTRUE_EXTERNAL_APPLE_ENABLED`, `CLIENT_ID=com.novumlab.chagok`, `SECRET` 빈 값. `/auth/v1/settings`의 `external`은 apple만 true. **기기의 ID 토큰으로 실제 로그인은 주소와 빌드가 생긴 뒤 확인한다.**
- 스키마: SSH 터널로 `supabase db push --db-url "postgresql://postgres.chagok:<비밀번호>@127.0.0.1:<터널>/postgres?sslmode=disable"`. 서버가 TLS를 받지 않아 `sslmode=disable`(터널 안이라 밖에 드러나지 않음). 사용자 이름은 풀러 테넌트를 붙인 `postgres.chagok`.
- 함수: `_shared`, `apple-link`, `delete-account`를 `volumes/functions/`로 복사(예제 `hello`는 지움). Apple 값 네 개는 서버 `.env`의 `APPLE_*`에 두고 override의 functions 환경으로 넘긴다. 개발 서버 secret과 해시로 같은 값임을 확인.
- 함수 발급자 비교: 셀프호스팅 함수의 `SUPABASE_URL`은 `http://api-gw:8000`이라 `auth.ts`가 `SUPABASE_PUBLIC_URL`을 쓰도록 고쳤다(브랜치 `fix/functions-public-issuer`). 클라우드 함수 환경에는 `SUPABASE_PUBLIC_URL`이 없다(`supabase secrets list`로 확인).
- 서버 테스트: 이메일 로그인을 잠깐 켜고 터널로 `__tests__/server` 32개 통과, 바로 끔. 남은 사용자, 파일, 행 0.
- **7단계 직전 점검:** 그때의 최종 마이그레이션으로 운영 DB를 지우고 다시 넣는다(출시 전이라 가능, 매번 허락받고). 함수도 최신으로 다시 복사하고 서버 테스트를 다시 돌린다. 카카오, Google, 9단계(최소 앱 버전)가 스키마를 바꿀 수 있다.

## 5단계: 매일 백업과 복구 연습

- [x] **R2 버킷:** 대시보드 R2 → Create bucket → Location에서 **Specify jurisdiction**, `us`. 만든 뒤에는 바꿀 수 없다. 이름 예: `chagok-prod-backup`.
- [x] **R2 토큰:** 이 버킷만, Object Read & Write. Access Key ID와 Secret은 한 번만 보이니 바로 서버 `.env`와 `.secrets/prod/`에 둔다. 접속 주소는 `https://<ACCOUNT_ID>.us.r2.cloudflarestorage.com`(관할 지역 버킷은 이 주소로만 열린다).

**DB와 사진을 모두 restic 저장소 하나에 올린다 (2026-10-22 사용자 결정).**
- 사진까지 매일 통째로 올리고 30일 두면 R2에 사진 용량의 30배가 쌓인다. 앱은 사진을 긴 변 1600px, JPEG 0.8로 줄여 올리므로(`src/sync/expoPhotoIO.ts`) 한 장에 0.3~0.5MB로 추정하고(실측 아님), 그러면 사진 1,000장 근처에서 R2 무료 저장량 10GB를 넘는다. restic은 바뀐 것만 올리고 같은 내용은 한 번만 저장한다.
- 처음에는 DB를 `age`로 암호화해 `rclone`으로 따로 올리려 했다. `age`는 체크섬 파일 없이 서명 증명만 배포하고 `rclone` 최신판은 나온 지 2주가 안 되어, 받은 파일을 확인하기 쉬운 restic 하나로 줄였다.
- 잃는 것: `age`는 서버에 공개 키만 두므로 서버가 뚫려도 DB 백업을 못 열었다. restic은 서버에 비밀번호가 있어야 한다. 다만 그때는 원본 DB와 사진이 이미 그 서버에 있으므로 더 잃는 것은 거의 없다.

- [x] **보관 기간:** 버킷 Settings → Object Lifecycle Rules에 `db-30-days`(접두어 `db/`, 30일)를 만들었다. DB도 restic에 넣기로 바꿔 지금은 쓰이지 않는다. 해는 없으니 두거나 지운다. restic 저장소 폴더(`restic/`)에는 규칙을 걸지 않는다. R2가 restic 파일을 임의로 지우면 저장소가 깨진다.
- [x] **restic 설치:** 0.19.1을 `/home/chagok/bin/restic`(700)에 두었다. sudo 없이. 받은 원본은 `/home/chagok/backup/dl/`. `SHA256SUMS`와 서명(`SHA256SUMS.asc`)을 확인했고, 서명 키 지문 `CF8F 18F2 8445 7597 3F79 D4E1 91A6 868B D3F7 A907`이 restic 공식 설치 문서와 같다. 키는 keys.openpgp.org에 없어 keyserver.ubuntu.com에서 받았다.
- [x] **restic 저장소:** `s3:https://<ACCOUNT_ID>.us.r2.cloudflarestorage.com/chagok-prod-backup/restic`. 설정은 `/home/chagok/backup/restic.env`(600, `AWS_DEFAULT_REGION=auto`, 키는 `~/supabase/.env`의 `R2_*`를 읽는다).
- [x] **restic 비밀번호:** 서버 `/home/chagok/backup/restic.pass`(600)와 이 맥 `.secrets/prod/restic-password`(600, 해시 같음). 사용자가 따로 보관하는 곳에도 둔다. **잃으면 백업을 영영 못 연다.**
- [ ] **백업 스크립트**(`/home/chagok/backup/`, `chagok`의 systemd 사용자 타이머로 매일 새벽):
  1. DB를 `docker exec`로 DB 컨테이너 안에서 `pg_dump -Fc`로 내보내 `restic backup --stdin --stdin-filename chagok.dump --tag db`로 올린다. 서버 디스크에 덤프 파일을 남기지 않는다.
  2. 사진 폴더(`volumes/storage`)를 `restic backup --tag photos`로 올린다. rootless에서는 컨테이너가 만든 파일의 소유자가 `chagok`이 아닌 번호로 보여 그냥 읽으면 못 읽을 수 있다. `rootlesskit`의 네임스페이스 안에서 돌리는 방법을 이 단계에서 확인한다.
  3. 주 1회 `restic forget --keep-daily 30 --prune`으로 30일 넘은 시점을 정리하고, 같은 날 `restic check`로 저장소가 온전한지 본다. 지운 데이터도 30일 동안은 되살릴 수 있다.
  4. 끝나면 상태 알림 주소(아래 6단계)에 성공을 알린다. 어느 단계든 실패하면 알리지 않는다.
- [ ] **확인하지 못한 것:** 무료 사용량(저장 10GB, Class A 100만, Class B 1,000만 건/월)은 기억에 근거한 값이라 요금 문서로 확인한다.

**5단계 결과 (2026-10-22, 저장소 준비까지)**

- 버킷 `chagok-prod-backup`, 관할 United States(US), Standard. 공개 주소와 사용자 도메인 없음. 관할 버킷은 Data Access Logs를 쓸 수 없다.
- Account API 토큰 `chagok-prod-backup-server`: 이 버킷만, Object Read & Write, 기한 없음, IP는 서버의 IPv4 `187.127.114.161`과 IPv6 `2a02:4780:5e:83c9::1`만 허용.
- 키는 이 맥 `.secrets/prod/r2.env`(600)와 서버 `~/supabase/.env` 끝의 `R2_*`(해시 같음). 서버 `.env` 백업 `~/supabase/.env.pre-r2-20261022`.
- 서버에서 `curl --aws-sigv4`로 `test/`에 올리기, 목록, 읽기, 지우기가 모두 성공했고 시험 파일은 지웠다. 이 맥에서는 같은 키가 403(`AccessDenied`)으로 막힌다. restic 저장소를 만들고 다시 여는 것까지 확인했다.
- 함정: R2 주소에는 IPv6도 있고 서버도 IPv6로 나간다. 토큰에 IPv4만 넣었을 때 IPv6로 나간 요청은 403이었다(curl `-4`는 200, `-6`은 403, restic은 계속 403). IP 제한을 걸 때는 서버의 IPv4와 IPv6를 모두 넣는다. 처음에 이를 "토큰이 퍼지는 시간"으로 잘못 읽었다.
- 이 맥에서 복구 연습을 할 때는 읽기 전용 토큰을 따로 만든다.

- [ ] **복구 연습:** R2에서 받은 백업을 이 맥(Docker)의 빈 Supabase에 되살린다. 확인: 사용자 수, 기록 행 수, 사진 한 장이 원래 서버와 같다. 절차를 DEV-SETUP에 「운영 서버 복구」로 적는다.

## 6단계: 지켜보기

**정할 것 (운영 서버를 다 셋팅한 뒤, 2026-10-21 사용자):** 한 화면에서 보는 대시보드. `chagok` Docker는 root `docker ps`, Hostinger 화면, supabase.com 어디에도 나오지 않아 따로 볼 곳이 필요하다. 후보 셋:
1. (추천) Uptime Kuma를 `chagok` 안에 두고, 바깥 감시(UptimeRobot) 하나를 더한다. API, 컨테이너, 백업, 디스크와 메모리 경고를 한 화면에서 본다. 주소 후보 `chagok-status.novum-lab.com`(DNS 레코드와 Caddy 블록 하나씩 더, Kuma 로그인).
2. Beszel: 자원 그래프는 좋지만 API와 백업 확인을 따로 붙여야 한다.
3. 바깥 서비스만(UptimeRobot 상태 페이지, Healthchecks.io): 설치는 없지만 컨테이너와 자원이 안 보인다.

- [ ] **백업이 빠지면 알림:** 백업 스크립트가 끝날 때 외부 상태 확인 서비스(예: Healthchecks.io 무료)에 신호를 보내고, 하루 넘게 신호가 없으면 메일을 받는다. 서비스는 이 단계에서 정한다.
- [ ] **서버가 죽으면 알림:** `/auth/v1/health`를 외부에서 몇 분마다 확인한다(예: UptimeRobot 무료).
- [ ] **디스크:** 사용량이 80%를 넘으면 알림. 지금 53%다.
- [ ] **R2 사용량:** 버킷 저장량이 8GB(무료 10GB의 80%)를 넘으면 알림. 넘으면 보관 기간이나 사진 크기를 다시 정한다.
- [ ] **메모리:** swap을 오래 많이 쓰면 알림. 메모리가 실제로 모자라다는 신호라 RAM을 늘리거나 서비스를 줄인다.
- [ ] **업데이트:** Supabase는 대략 한 달에 한 번 이미지를 낸다. `update.sh`는 설정만 백업하고 DB와 사진은 백업하지 않으므로(공식 문서), 올리기 전에 5단계 백업을 손으로 한 번 돌린다. 이미지 태그를 섞지 않는다.

## 7단계: 앱 빌드 연결

- [ ] EAS 환경 변수 `production`의 `EXPO_PUBLIC_SUPABASE_URL`과 `EXPO_PUBLIC_SUPABASE_ANON_KEY`를 운영 값으로 바꾼다. `preview`는 개발 서버 그대로.
- [ ] 결제와 광고(별도 작업)의 실제 키가 준비됐으면 같은 때 `production`에 넣는다: RevenueCat 스토어 키, AdMob 앱 ID와 광고 단위 ID. 빌드 한 번으로 서버와 결제, 광고를 함께 확인해 EAS 비용을 줄인다. 준비가 안 됐으면 기다리지 않고 서버만 먼저 확인한다.
- [ ] 운영 값으로 `production` 빌드를 만들어 TestFlight에서 확인한다(EAS 비용이 드니 빌드 전에 묻는다). 확인: Apple 로그인, 기록과 사진 백업, 다른 기기에서 복원, 로그아웃, 계정 삭제(서버의 행과 사진까지 지워지는지).

## 8단계: 문서와 처리방침

- [ ] **처리방침**(별도 저장소 `chagok-app-policy`, 1판에 넣는다): 5절 수탁자와 국외 이전 항목. 제28조의8 제2항의 다섯 가지(항목, 나라와 시기와 방법, 이전받는 자와 연락처, 목적과 보유 기간, 거부 방법과 효과)를 Hostinger(말레이시아)와 Cloudflare(미국) 각각 적는다. 거부 방법은 "로그인하지 않고 이 기기에서만 쓰기"다. 결제와 광고(별도 작업)의 국외 이전 항목(RevenueCat, Google)과 함께 한 번에 써서 게시한다.
- [ ] **법 확인:** 개인정보 보호법은 2027-03-09와 2027-07-01 시행 개정이 예정돼 있다. 제28조의8과 안전성 확보조치(접근 통제, 접속기록 보관 등)가 바뀌는지 [법 검토](../../LEGAL-REVIEW.md) 절차로 확인한다.
- [ ] **출시 뒤 규칙:** 운영에 스키마를 올린 날부터는 마이그레이션 파일을 고치지 않고 새 파일을 더한다. AGENTS.md 「출시 전까지」와 DEV-SETUP에 날짜를 적는다.
- [ ] PRD 「서버」 절과 11절, RELEASE-DECISIONS, RELEASE-CHECKLIST, HANDOFF, DEV-SETUP(운영 서버 접속과 복구)을 맞춘다.

## 9단계: 출시 전에 서버와 함께 필요한 기능

- [ ] **최소 앱 버전과 동기화 버전.** RELEASE-CHECKLIST 25줄 항목인데 `supabase/`와 `src/`에서 관련 코드를 찾지 못했다. 운영 서버를 열기 전에 넣어야 나중에 옛 앱을 막을 수 있다. 별도 계획으로 쓴다.

## 확인하지 못한 것 (단계에서 확인)

- Supabase가 rootless Docker에서 그대로 도는지, 포트를 `127.0.0.1`에만 열 수 있는지 (2단계)
- 사진 폴더를 rootless 소유자 문제 없이 백업하는 방법 (5단계)
- 셀프호스팅에서 `supabase db push --db-url`이 되는지 (4단계)
- 네이티브 Apple 로그인(ID 토큰)의 셀프호스팅 설정, secret을 비워도 되는지 (4단계)
- 함수 환경에 `SUPABASE_SERVICE_ROLE_KEY`가 들어오는지 (4단계)
- 함수의 issuer와 JWKS 주소가 셀프호스팅에서 맞는지 (4단계)
- R2 관할 지역 버킷의 요금이 일반 버킷과 같은지, Wrangler로 관할 지역 버킷을 만드는 옵션 (5단계, 대시보드로 만들면 필요 없다)
- R2 무료 사용에 결제 수단이 필요한지 (0단계)
- Hostinger 정식 법인 이름 (0단계)

## 보안 검토 (2026-10-21)

- **대상:** main의 계정 이전 커밋(`97a8cf2`)과 이 계획. 그대로 운영에 올라갈 서버 코드(`supabase/migrations`, `supabase/functions`)도 함께 봤다.
- **결과:** 실제로 악용할 수 있는 취약점은 없었다.
  - 동기화 RPC는 `auth.uid()`로만 사용자를 정하고 `search_path = ''`다.
  - `admin_*` RPC는 service_role만 실행할 수 있다.
  - 테이블과 `record-photos` 버킷은 자기 것만 허용한다.
  - 두 함수는 토큰을 검증한 뒤에만 service_role을 쓴다.
  - Caddy가 여는 경로로는 Studio와 `/pg/`에 닿지 않는다.
- **반영한 것:**
  - 전화번호 가입 기본값 끄기 (4단계)
  - 포트 확인과 Kong 8443 (2단계)
  - 함수 issuer 확인 (4단계)

## 되돌리기

- 1~4단계: `chagok`으로 `sh run.sh stop`과 `systemctl --user disable --now docker`, root로 `loginctl disable-linger chagok`과 `userdel -r chagok`, Caddyfile을 백업본으로 되돌리고 reload. swap은 남겨 두어도 된다. 서버 Docker와 기존 서비스에는 손대지 않았으므로 이것으로 끝난다.
- 7단계 이후(사용자 데이터가 생긴 뒤): 지우지 않는다. 가장 최근 R2 백업으로 되살리는 것이 되돌리기다.
