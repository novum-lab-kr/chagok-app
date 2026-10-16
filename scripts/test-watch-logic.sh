#!/bin/sh
# 워치 Logic 테스트 (워치 계획 2). targets/watch/Logic과 __tests__/watch-logic을 맥용 실행 파일 하나로 묶어 돌린다.
set -e
cd "$(dirname "$0")/.."
out="${TMPDIR:-/tmp}/chagok-watch-logic-tests"
xcrun swiftc -O -o "$out" targets/watch/Logic/*.swift __tests__/watch-logic/Harness.swift __tests__/watch-logic/main.swift
"$out"
