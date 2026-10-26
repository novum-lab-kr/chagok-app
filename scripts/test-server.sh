#!/bin/sh
# 개발 프로젝트(.secrets/server-test.env)에 대고 __tests__/server를 돌린다. 평소 npm test에서는 이 테스트들이 건너뛰어진다.
set -e
[ -f .secrets/server-test.env ] || { echo ".secrets/server-test.env이 없습니다 (docs/DEV-SETUP.md 참고)"; exit 1; }
set -a
. ./.secrets/server-test.env
# 카카오 웹훅 테스트(kakaoUnlink)가 어드민 키를 쓴다. 없으면 키가 필요한 테스트만 건너뛴다.
[ -f .secrets/kakao.env ] && . ./.secrets/kakao.env
set +a
npx jest __tests__/server --runInBand "$@"
