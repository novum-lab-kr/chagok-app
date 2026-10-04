# 2026-10 시안 기록 (앱 설정 · 캐릭터 · 아이콘·스플래시 · 위젯)

시안은 아티팩트(고르기 + 안별 메모)로 먼저 보여주고, 모두 확정된 뒤 Storybook에 반영한다(2026-10-03 사용자 지시).
아티팩트는 사용자 본인만 열 수 있는 비공개 페이지라, 링크가 사라져도 이어 갈 수 있게 원본과 고른 안·메모를 여기 둔다.

| 시안 | 링크 | 원본 | 상태 |
| --- | --- | --- | --- |
| 앱 설정 | https://claude.ai/artifact/5N5m1HJhkjyj2pAAv4TDJA | `settings.template.html` | 3안(프레임 없는 목록) 유력. 구역 머리글 `PixelBadge`, 배지 크기 12·14·18 비교 중 |
| 캐릭터 | https://claude.ai/artifact/3qkb69GG9Ku7xJoaNRtqQb | `character.template.html` | 2차 3안 「이고지고」 확정 |
| 아이콘·스플래시·표정 | https://claude.ai/artifact/CtGPQfkXPo95cnDduSP5uH | `icon-splash.template.html` | 아이콘 1안 확정, 표정·팔·머리 위 물건 확정, 스플래시 미확정 |
| 홈 화면 위젯 모양 | https://claude.ai/artifact/K5qfAcqRA2vyLZVxY2oqD3 | `widget.template.html` | 2026-10-04 발행. 지금 미리보기 + 1안 판을 안쪽으로 · 2안 LCD 창 · 3안 캐릭터와 함께 · (2차, 중간에 목표 두 개) 4안 나란히 · 5안 목록 두 줄 · 6안 판 미니 두 개 · (3차, 위젯에서 바로 붙이기 — db `choice-tap`) A 칸 · B 스티커 단추(B-1~3 메모 반영) · C 카드 전체 · (5차, 사용자 실기기 위젯 참고 — 테두리 없이 꽉 채움, iPhone 16 Pro 170·364pt, db `choice-full`) 1 큰 숫자 · 2 링 · 3 판 크게 · (6차) 링 위젯 + 달력 위젯. **2026-10-04 확정: 6-링·6-달력 둘 다, 바탕 민트·아이보리 + 유리(iOS 투명·틴트 모드에 맡김), 진행 문구 `n% 채웠어요`** (PRD 4.10) |
| 아이콘·스플래시 확정 | https://claude.ai/artifact/4e7k1HAotEjKzYwg5k8XMV | `icon-splash-final.template.html` | 2026-10-04 발행. iOS 아이콘 1안(확정, 비교용) + Android 적응형 A1 안전 영역 안 · A2 조금 크게 · A3 아래에서 빼꼼 / 스플래시 S1 「2+」 그대로 · S2 빠르게 · S3 끝에 미소. db `choice-adaptive`·`choice-splash`. **Android A1·스플래시 S2-B 확정(2026-10-04).** |

고른 안과 메모 전문: [`review-notes.json`](review-notes.json). 확정된 캐릭터 데이터: [`../character/`](../character/README.md).

## 원본에서 페이지 다시 만들기

템플릿 안의 `__FONT__`·`__ASSETS__` 자리에 Neo둥근모와 스티커 경로를 넣으면 발행한 페이지와 같다. 저장소 루트에서:

```sh
node -e '
const fs=require("fs");
const font=fs.readFileSync("src/design-system/assets/neodgm-1.601.ttf").toString("base64");
const sprout=fs.readFileSync("src/stickers/pocket/assets/sprout.ts","utf8").match(/sproutPath = "([^"]+)"/)[1];
const A={sprout};
for (const id of ["shoe","book","flower","star","cat"]) A[id]=fs.readFileSync(`src/stickers/pocket/assets/${id}.ts`,"utf8").match(/"path": "([^"]+)"/)[1];
const mascot=JSON.stringify({faces:require("./docs/design/character/character-data.json").faces});
for (const n of ["settings","character","icon-splash","widget","icon-splash-final"]) {
  const t=fs.readFileSync(`docs/design/proposals-2026-10/${n}.template.html`,"utf8").replace("__FONT__",font).replace("__ASSETS__",JSON.stringify(n==="widget"?A:{sprout})).replace("__MASCOT__",n==="icon-splash-final"?JSON.stringify({faces:require("./docs/design/character/character-data.json").faces,splashLayers:require("./docs/design/character/character-data.json").splashLayers}):mascot);
  fs.writeFileSync(`/tmp/${n}.html`,"<!doctype html><meta charset=utf-8>"+t);
}'
```

아티팩트로 다시 발행할 때는 기존 링크를 `url`로 넘겨 같은 주소를 유지하고, `capabilities: {db: {}, user: {}}`로 고르기·메모 저장을 켠다.

## 시안에서 배운 것

- 브랜드 시안 전에 대표 이미지(캐릭터·심볼)를 먼저 묻는다. 새싹이는 메인 캐릭터가 아니다.
- 픽셀 그림은 렌더해서 큰 크기와 24px를 같이 본다. 4칸 z는 "고", 3칸 z는 I로 읽혔다.
- 몸 위쪽 모서리에 붙은 팔은 귀처럼 보인다. 이 캐릭터는 팔 없이, 필요하면 점 두 칸으로 충분했다.
