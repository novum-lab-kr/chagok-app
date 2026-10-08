# 2026-10 시안 기록 (앱 설정 · 캐릭터 · 아이콘·스플래시 · 위젯)

시안은 아티팩트(고르기 + 안별 메모)로 먼저 보여주고, 모두 확정된 뒤 Storybook에 반영한다(2026-10-03 사용자 지시).
아티팩트는 사용자 본인만 열 수 있는 비공개 페이지라, 링크가 사라져도 이어 갈 수 있게 원본과 고른 안·메모를 여기 둔다.

| 시안 | 링크 | 원본 | 상태 |
| --- | --- | --- | --- |
| 앱 설정 | https://claude.ai/artifact/5N5m1HJhkjyj2pAAv4TDJA | `settings.template.html` | 3안(프레임 없는 목록) 유력. 구역 머리글 `PixelBadge`, 배지 크기 12·14·18 비교 중 |
| 캐릭터 | https://claude.ai/artifact/3qkb69GG9Ku7xJoaNRtqQb | `character.template.html` | 2차 3안 확정(가칭 「이고지고」 → 이름 「차곡이」 2026-10-04) |
| 아이콘·스플래시·표정 | https://claude.ai/artifact/CtGPQfkXPo95cnDduSP5uH | `icon-splash.template.html` | 아이콘 1안 확정, 표정·팔·머리 위 물건 확정, 스플래시 미확정 |
| 홈 화면 위젯 모양 | https://claude.ai/artifact/K5qfAcqRA2vyLZVxY2oqD3 | `widget.template.html` | 2026-10-04 발행. 지금 미리보기 + 1안 판을 안쪽으로 · 2안 LCD 창 · 3안 캐릭터와 함께 · (2차, 중간에 목표 두 개) 4안 나란히 · 5안 목록 두 줄 · 6안 판 미니 두 개 · (3차, 위젯에서 바로 붙이기 — db `choice-tap`) A 칸 · B 스티커 단추(B-1~3 메모 반영) · C 카드 전체 · (5차, 사용자 실기기 위젯 참고 — 테두리 없이 꽉 채움, iPhone 16 Pro 170·364pt, db `choice-full`) 1 큰 숫자 · 2 링 · 3 판 크게 · (6차) 링 위젯 + 달력 위젯. **2026-10-04 확정: 6-링·6-달력 둘 다, 바탕 민트·아이보리 + 유리(iOS 투명·틴트 모드에 맡김), 진행 문구 `n% 채웠어요`** (PRD 4.10) |
| 홈 화면 위젯 스타일 | https://claude.ai/artifact/47ZmtU8SZbzWQSNb8sDkXM | `widget-style.template.html` | 2026-10-05 발행, 11차까지. spike 위젯을 실기기 크기로 보고 다시 그림: 1차 링 다듬기 3안 → 2차 레퍼런스(습관 앱) 반영 큰 숫자·컬러 스티커·차곡이 → 3~6차 목표 하나 뼈대·문구·적립판 칸 → 7차 경우의 수(색 6쌍·문구·상태 11~16가지·투명/틴트) → 8~11차 차곡이 말풍선. **고른 것(db `choices/widget-style-7`)**: 위젯 3종 모두, 말풍선 마3 `Ready?`/`Nice!`, 색 P2·P3 둘 다(위젯 설정), 긴 이름은 두 줄 말줄임. 확정 내용은 PRD 4.10. 만들기: 아래 「위젯 스타일 만들기」 |
| 아이콘·스플래시 확정 | https://claude.ai/artifact/4e7k1HAotEjKzYwg5k8XMV | `icon-splash-final.template.html` | 2026-10-04 발행. iOS 아이콘 1안(확정, 비교용) + Android 적응형 A1 안전 영역 안 · A2 조금 크게 · A3 아래에서 빼꼼 / 스플래시 S1 「2+」 그대로 · S2 빠르게 · S3 끝에 미소. db `choice-adaptive`·`choice-splash`. **Android A1·스플래시 S2-B 확정(2026-10-04).** |
| 광고 위치 | https://claude.ai/artifact/AuLzpnK3wXze14Qk9XBFb4 | `ad-placement.template.html` | 2026-10-05 발행. 비맞춤 배너 첫 출시(PRD 11절). 지금 앱(비교용) · 1안 홈 아래 고정 · 2안 목록 끝 한 칸 · 3안 앱 설정·완성한 판에만. db `choice-ads`. **2026-10-05 1안 확정(홈 아래 고정 배너).** 다시 만들 때 `__ASSETS__`는 shoe·book·flower·star |
| 스티커 팩 후보 | https://claude.ai/artifact/Mx87SQVMUvXTuxV3sArADk | `sticker-packs.template.html` | 2026-10-05 발행. 출시 팩 3개 주제 고르기(3개까지). 후보 5주제 26종(운동·건강 / 공부·일 / 생활·마음 / 계절·날씨 / 동물 친구) + 지금 무료 6종(비교용). 그림은 `sticker-candidates.gen.js`(도형을 56 격자에 찍는 초안 생성기, `node sticker-candidates.gen.js <dir>`)로 만든 `sticker-candidates.json`. 템플릿 자리: `__FONT__`·`__STICKERS__`(json)·`__ASSETS__`(무료 6종, 새싹은 `sproutPath`). db `choice-themes`(배열)·`note-<주제>`. 메모(2026-10-05): 계절·날씨에 구름·비구름·해·눈송이·눈구름 추가. 그림 화풍은 다음 줄 시안에서 다시 고름. **2차(2026-10-05)**: 화풍 결정(24칸 · SVG로 그림 · PixelLab PNG는 변환해서 사용) 뒤 새 화풍으로 무료 6종 + 다섯 주제 33종 다시 그림(`sticker-packs-v2.gen.js` → `sticker-packs-v2.json`, 색별 path 층). 주제마다 적립판·달력판 미리보기. 침대 → 잠(초승달), 생활·마음의 해 → 계절·날씨로, 그 자리에 편지. 계절·날씨 9종(구름·비구름·해·눈송이·눈구름 추가), 동물 친구 6종(햄스터·곰 추가). 템플릿 자리 `__FONT__`·`__STICKERS__`(json) |
| 스티커 화풍 | https://claude.ai/artifact/SJbHVi67dmA9CZit4wkDDY | `sticker-style.template.html` | 2026-10-05 발행. 1차 팩 후보에 "도트가 아니라 선이 깨진 느낌, 돈 주고 살 느낌이 아니다" 메모(사용자) → 24칸 격자·한 칸 윤곽으로 다시. 1차 초안(비교용) · 1 색 도트 · 2 스티커(흰 테두리) · 3 선 도트, 같은 4종(사과·커피·구름·토끼). 생성기 `sticker-dots.gen.js`. 2판: 화풍마다 적립판(3열)·달력판(두 주)에 붙인 모습 추가(지금 무료 새싹과 섞어서). 3판(사용자 요청): 무료 6종 지금 · 색 도트 · 스티커 세 줄 추가(비교용, 생성기 `sticker-dots-free.gen.js`), 유료 색 도트·스티커 판에는 같은 화풍의 새싹을 섞음. 4판: 색 도트도 "퀄리티가 떨어진 스티커 느낌"(사용자) → 사용자가 PixelLab으로 만든 하트(`~/Desktop/south.png`, 48px = 24칸×2)를 기준으로 삼아, 24칸으로 풀어 본 규칙(면 한 색 · 아래쪽 그림자 한 칸 · 왼쪽 위 빗금 하이라이트 · 2×2 눈 · 두 칸 입 · 남색 검정 윤곽)으로 다시 그림(`sticker-shaded.gen.js`). 참고 · 새 도트 · 이전 색 도트(비교용). PixelLab 무료는 생성 횟수가 적어 우선 이 규칙으로 직접 그린다. 템플릿 자리 `__FONT__`·`__STYLES__`(`{groups, sprout}`). db `choice-style` |
| 24px 스티커 팩 | https://claude.ai/artifact/Mgm5ydDk2sqBgRuHNTJzpj | `sticker-packs-24.template.html` | 2026-10-05 발행. 사용자가 Codex로 만든 24×24 PNG 40종(사물·동물·감정·날씨 각 10, 원본 `~/Documents/Codex/2026-10-05/pix/outputs/pixel-sticker-pack-24 2/`)을 고치지 않고 색별 path 층으로 변환(알파 0/255만, 3~8색 — 규격 일치). 맨 위 비교용으로 제가 그린 기본 스티커 줄. 데이터 `sticker-packs-24.json`. db `choice-themes`(3개까지)·`note-<주제>`. 2판(사용자 메모): 날씨는 제가 그린 날씨·계절 9종으로 교체("니가 그린 게 더 낫다"), 감정 하트 10종의 머리 양쪽 돌기(3행 3칸) 제거, 시계는 벽걸이(주황 테·하늘 판)로, 기본 별은 한 칸씩 직접 찍어 위 뿔과 아래 다리 굵기를 맞춤(`sticker-star.gen.js`), 색/흑백 전환(흑백은 잉크 한 색 · 바깥 윤곽 두 칸, 주소 `#mono`). 흑백에서 사물은 안쪽 무늬가 빠져 빈 네모가 됨 — 흑백으로 가면 다시 그려야 함 2026-10-05 Storybook 반영 뒤 **원본은 `src/stickers/color/source/sticker-packs-24.json`**이고 `sticker-packs-24.json`은 그 사본이다(기본 꽃·사물 꽃·축구공·머그컵 수정 반영). 그림을 고칠 때는 원본을 고친다. |
| 위젯 목표 고르기 | https://claude.ai/artifact/LnSzZfVvD5MV1Kpvh47VjL | `widget-goal.template.html` | 2026-10-06 발행. iOS 위젯마다 보일 목표를 어디서 고를지(spike 결과 I5): 가 위젯 편집에서(Swift AppEntity 필요) · 나 앱 설정 + 위젯 자리 번호(추천, Swift 없음) · 다 고르지 않기(마지막으로 붙인 목표). **2026-10-06 가안 확정**(사용자: 다 제외, Swift 이유 확인 후 가). db `choice-widget-goal`·`note-<ga·na·da>`. 템플릿 자리 `__FONT__`·`__IMG__`(spike 브랜치 `assets/widget-art/` PNG data URI: star·shoe·book·curious·excited·sleepy·bubble) |
| 달력판 지난 날짜 붙이기 | https://claude.ai/artifact/WHZumUL5EJwBUEhKgyUPUJ | `calendar-backfill.template.html` | 2026-10-08 발행. 규칙 "오늘만" → "시작일(만든 날)부터 오늘까지 지난 날짜도"(미래만 막음, 지난 날짜도 기록 없으면 확인 없이 떼기). 1판에 있던 A 시작일 이전 범위 · B 진행률 세기는 사용자가 "시작일은 목표 만든 날부터, 제한 없애니 손이 많이 간다"로 빼고 2판은 C 종료일 뒤만: C1 지금처럼 다음 날 완성 · C2 7일 동안 채우고 완성(추천, 새 안내 요소) · C3 직접 [완성하기](새 요소). 화면은 임시 스토리 `stories/_proposal/CalendarBackfill.stories.tsx`(커밋 안 함) 390×844 2배 캡처. 템플릿 자리 `__FONT__`·`__IMG__`(캡처 data URI 맵: c-1·c-2·c-3). db `review/choice-backfill-c`·`review/note-<c1·c2·c3>` |

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

**위젯 스타일 만들기** — `__FONT__`(Neo둥근모 base64)와 `__DATA__`(흑백·컬러 스티커 path, 차곡이 얼굴)를 채운다.

```sh
node -e '
const fs=require("fs");
const font=fs.readFileSync("src/design-system/assets/neodgm-1.601.ttf").toString("base64");
const mono={};for(const id of ["star","shoe","book","flower","cat"])mono[id]=fs.readFileSync(`src/stickers/pocket/assets/${id}.ts`,"utf8").match(/"path": "([^"]+)"/)[1];
mono.sprout=fs.readFileSync("src/stickers/pocket/assets/sprout.ts","utf8").match(/sproutPath = "([^"]+)"/)[1];
const src=require("./src/stickers/color/source/sticker-packs-24.json"),P={free:"basic"},color={};
for(const k of ["sports.bottle","basic.book","basic.shoe","sports.yoga","objects.notebook","emotions.love","snack.milk"]){const [p,i]=k.split(".");color[k]=src.stickers.find(s=>(P[s.theme]||s.theme)===p&&s.id===i).layers;}
const f=require("./docs/design/character/character-data.json").faces;
const t=fs.readFileSync("docs/design/proposals-2026-10/widget-style.template.html","utf8").replace("__FONT__",font).replace("__DATA__",JSON.stringify({mono,color,faces:{curious:f.curious,excited:f.excited,sleepy:f.sleepy}}));
fs.writeFileSync("/tmp/widget-style.html",t);'
```

아티팩트로 다시 발행할 때는 기존 링크를 `url`로 넘겨 같은 주소를 유지하고, `capabilities: {db: {}, user: {}}`로 고르기·메모 저장을 켠다.

## 시안에서 배운 것

- 브랜드 시안 전에 대표 이미지(캐릭터·심볼)를 먼저 묻는다. 새싹이는 메인 캐릭터가 아니다.
- 픽셀 그림은 렌더해서 큰 크기와 24px를 같이 본다. 4칸 z는 "고", 3칸 z는 I로 읽혔다.
- 몸 위쪽 모서리에 붙은 팔은 귀처럼 보인다. 이 캐릭터는 팔 없이, 필요하면 점 두 칸으로 충분했다.
