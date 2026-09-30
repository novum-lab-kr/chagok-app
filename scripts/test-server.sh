#!/bin/sh
# 개발 프로젝트(.env.server.local)에 대고 __tests__/server를 돌린다. 평소 npm test에서는 이 테스트들이 건너뛰어진다.
set -e
[ -f .env.server.local ] || { echo ".env.server.local이 없습니다 (docs/DEV-SETUP.md 참고)"; exit 1; }
set -a
. ./.env.server.local
set +a
npx jest __tests__/server --runInBand "$@"
