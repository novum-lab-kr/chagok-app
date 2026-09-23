# 이미지 생성 기록

생성 방식: 내장 `image_gen` 도구. CLI/API fallback 사용하지 않음.

- `design-bible.txt`: 전체 레트로 방향에 공통 적용한 프롬프트.
- `03-home-calendar.txt`, `04-new-goal.txt`, `05-sticker-record.txt`: 이번 확장에서 사용한 전체 최종 프롬프트.
- 03–05는 모두 `../screens/01-home-tally.png`를 디자인 참조 이미지로 전달해 새 화면을 생성했다. 원본 자르기나 확대가 아니다.
- 01·02는 앞선 대화에서 생성 후 사용자가 선택한 원본을 보관했다. 공통 디자인 기준은 design-bible.txt, 각 화면별 원본 프롬프트는 해당 대화 도구 호출에 남아 있다.

## 원본 파일 추적

기본 생성 경로: `/Users/eunjukim/.codex/generated_images/01a0c3b8-bb93-77c3-af64-48b77aefee6f/`

| 프로젝트 파일 | 생성 원본 파일 |
| --- | --- |
| 01-home-tally.png | exec-cd5c7bd0-e260-4fc7-b24b-1ad6f099f2db.png |
| 02-goal-settings.png | exec-d455757d-60e5-4135-9f20-c0d2106963bc.png |
| 03-home-calendar.png | exec-59a7d169-9adb-4294-bb6a-b51a31654430.png |
| 04-new-goal.png | exec-c9536795-3f1c-4bcd-b63f-b407caa1be68.png |
| 05-sticker-record.png | exec-a7b654c8-8f4c-449e-ad82-3d1576c3839b.png |

모든 이미지는 프로젝트 폴더에 복사했으며 기본 생성 경로의 원본도 보존했다.
