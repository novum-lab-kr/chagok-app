# 화면 흐름도

Storybook `Flows/앱 전체`. 앱의 모든 화면을 실제 Storybook 스토리로 한 판에 깔고 이동을 화살표로 잇는다
(2026-10-04 도입, `@zigbang/storybook-addon-story-flow`의 `StoryFlowMap`).
화면 기획이나 디자인이 바뀌면 **같은 작업 안에서** 이 흐름도도 맞춘다. 흐름도만 따로 늦게 고치지 않는다.

| 파일 | 역할 |
|---|---|
| `app-flow.json` | 화면(노드)·이동(화살표)·시나리오. 스키마는 애드온의 `flow.schema.json` |
| `appFlow.ts` | 배치. 화면마다 `[줄, 칸]` |
| `AppFlow.mdx` | 흐름도 페이지 |

`app-flow.json`은 일부러 `*.flow.json`이 아니다. 그 이름이면 애드온이 간격이 고정된 자동 배치 문서를 따로 만든다.

## 언제 고치나

| 바뀐 것 | 흐름도에서 할 일 |
|---|---|
| 새 화면 | 노드 추가 + `appFlow.ts`에 자리 + 들어오고 나가는 화살표 |
| 화면의 새 상태(빈 상태·다이얼로그·오류·시안 A/B) | 그 노드의 `stories`에 한 줄. 노드를 새로 만들지 않는다 |
| 이동 경로(버튼·뒤로가기·분기) | 화살표 추가·삭제, `label`은 사용자가 누르는 것 |
| 화면 삭제·통합 | 노드·화살표·자리 삭제 |
| 스토리 제목이나 export 이름 변경 | 스토리 ID가 바뀌므로 `stories[].id` 갱신 |
| PRD 절 번호·앱 라우트 변경 | `tags` 갱신 |
| 기획만 있고 화면이 아직 없음 | `stories` 없이 노드만 둔다 → 빨간 점선. 스토리가 생기면 `stories`만 채운다 |

시안 단계(아티팩트)의 화면은 확정되어 Storybook에 들어온 뒤 흐름도에 넣는다
([작업 방식](../../docs/WORKING-AGREEMENT.md) 11절). 그전에는 위 마지막 줄처럼 빈 노드로 둘 수 있다.

## 쓰는 법

- **노드** `{ id, data: { label, tags, stories, scenarios } }`. `position`은 쓰지 않는다(`appFlow.ts`가 넣는다).
  - `tags`: `PRD 4.9`처럼 PRD 절, `app/goal/[id]`처럼 앱 라우트, 필요하면 `미정`·`시안` 같은 표시.
  - `stories`: `{ id, label }`. 첫 번째가 기본으로 보인다. 확정안을 앞에, 시안은 뒤에 `(시안)`을 붙여 둔다.
  - `coverage`: 앱 밖 화면(OS 사진 보관함, 메일 앱, 웹 문서)만 `external`. 나머지는 쓰지 않는다.
- **화살표** `{ id: "출발-도착", source, target, label, data: { scenarios } }`. 양방향은 두 개를 쓰면 하나로 합쳐 그린다.
- **시나리오**는 7개다: `first` 첫 사용 · `daily` 일상 기록 · `complete` 판 완료 · `goal` 목표 관리 · `account` 계정·백업 · `info` 앱 설정·정보 · `sticker` 스티커 묶음·구매.
  새 흐름이 이 중 어디에도 맞지 않을 때만 추가한다.
- **배치** `appFlow.ts`의 `grid`. 줄은 영역(0 첫 사용·계정 연결, 1 일상 기록, 2 목표 관리·판 완료, 3 앱 설정·정보, 4 계정 삭제, 5 스티커 묶음·구매),
  칸은 흐름 순서다. 빈칸에 넣고, 끼워 넣어야 하면 같은 줄 뒤쪽 칸을 민다. 자리를 빠뜨리면 페이지가 오류를 낸다.
  간격·화면 크기 상수는 Storybook 기본 기기(iPhone X 375px) 기준이다. 기본 기기를 바꾸면 상수도 바꾼다.

## 확인

1. Storybook에서 `Flows/앱 전체`를 열어 고친 화면이 보이는지, 화살표가 맞는 곳을 잇는지 눈으로 본다.
   화면이 있어야 할 노드가 빨간 점선이면 스토리 ID가 틀린 것이다.
2. 스토리 ID 검사 — Storybook을 띄운 채로(포트는 맞게 바꾼다):

   ```sh
   curl -s http://127.0.0.1:6006/index.json | node -e '
     const ids = new Set(Object.keys(JSON.parse(require("fs").readFileSync(0)).entries));
     const flow = require("./stories/flows/app-flow.json");
     const bad = flow.nodes.flatMap(n => (n.data.stories ?? []).map(s => s.id)).filter(id => !ids.has(id));
     console.log(bad.length ? "없는 스토리 ID: " + bad.join(", ") : "스토리 ID 모두 있음");'
   ```

3. `npm run typecheck` (`appFlow.ts`).
