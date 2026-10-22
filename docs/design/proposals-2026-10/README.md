# 시안 기록 (아직 열려 있는 것)

시안은 아티팩트(고르기 + 안별 메모)로 먼저 보여주고, 모두 확정된 뒤 Storybook에 반영한다(2026-10-03 사용자 지시).
아티팩트는 사용자 본인만 열 수 있는 비공개 페이지라, 링크가 사라져도 이어 갈 수 있게 원본과 고른 안, 메모를 여기 둔다.

여기에는 **앞으로 개발할 기획의 시안만** 둔다. 확정돼 PRD와 코드에 들어간 시안(앱 설정, 캐릭터, 아이콘과 스플래시, 위젯, 광고 위치, 스티커, 결제와 환불, 로그인 버튼, 탭 바, 기록 탭, 워치 등)은 2026-10-18 정리하며 지웠고, 발행했던 아티팩트도 지운다. 확정 내용은 [PRD](../../PRD.md)에, 시안 원본과 고른 과정은 git 기록(`402913e`)에 있다.

| 시안 | 링크 | 원본 | 상태 |
| --- | --- | --- | --- |
| 스티커 품질 점검 | https://claude.ai/artifact/NWuVMD9zg1GxyHaLgHjHcq | `sticker-quality.template.html` | 2026-10-07 발행. 「컬러로 모두 바꾸는 대신 품질부터, 처음 기획한 도트 느낌이 사라졌다」(사용자) → 66종을 처음 도트 규칙(PixelLab 하트 기준)에 비춰 판정: 그대로 37 · 손보기 19 · 다시 그리기 10. 잘 된 쪽은 Codex 변환 동물·감정·사물, 약한 쪽은 생성기로 그린 기본·운동·간식·날씨 일부(윤곽만 있는 선 그림, 1칸 선, 떠 있는 점, 흰 몸, 여백 없음). 자동 검사(떠 있는 칸·여백·밝은 면·얇은 선·잉크 윤곽). 다듬는 방법 M1 잘 된 경로로 통일(추천) · M2 제가 전부 · M3 출시분만. db `choice-method`·`note-<묶음|m1~m3>`. **2026-10-07 사용자: 스티커 품질은 결정하지 않은 채 우선순위를 낮추고 화면 설계부터 마무리.** 템플릿 자리 `__FONT__`·`__DATA__`(`{stickers, verdicts, lint}`) |
| 친구와 함께 쓰기 | https://claude.ai/artifact/QYT5fQYk2xeDnBgV63Yckb | `friends-ideas.template.html` | 2026-10-17 발행. **출시 뒤 검토 기능, 정한 것 없음.** 「셋로그처럼 친구와 같이 쓰려면」(사용자) → 아이디어 7개(친구 방, 함께 채우는 판, 같이 시작하기, 우리 판 돌아보기, 완성한 판 엽서, 응원 스티커, 위젯에 친구 소식)를 화면 그림으로(실제 컴포넌트 캡처 아님) + 넣지 않을 것 + 방향 A 보내기만(추천), B 작은 친구 방, C 함께 채우는 판. 기획 정리는 [`../../superpowers/specs/2026-10-17-friends-ideas.md`](../../superpowers/specs/2026-10-17-friends-ideas.md). 바로 열어 보기: `friends-ideas.html`(브라우저로 열기, 고른 것은 그 브라우저에만 저장) 또는 캡처 `friends-ideas.png`. 템플릿은 빈 자리(`__FONT__`, `/*__ART__*/`)가 있어 그대로 열면 그림이 안 나온다. 템플릿을 고쳤으면 `node docs/design/proposals-2026-10/friends-ideas.gen.mjs [출력 폴더]`로 미리보기를 다시 만들고, 출력 폴더를 주면 폰트까지 넣은 발행용도 만든다. db `review/choice-fr-<1~7|dir>`(yes, later, no / a, b, c), `review/note-fr-<1~7|dir|all>` |
| 로그인 첫 화면 배치 | https://claude.ai/artifact/Q2RHiFT3YKGitUagw322Yi | `login-layout.template.html`, `login-layout.gen.mjs` | 2026-10-22 3판. 2판은 「스티커판이 있으니 조잡하다」(사용자) → 머리글 없이 프레임 세로 가운데, 프레임 위 가운데에 차곡이, 프레임 안 여백 넉넉히, 로그인 없이 시작하기 아래 유지, 버튼 T3(40, 17), 문구 W1 어서 오세요, W2 반가워요(추천), W3 차곡차곡에 오신 걸 환영해요. 캡처 `stories/_proposal/LoginWelcome.stories.tsx`. db `review/choice-login-copy`. 2판: 1판(위치만 옮기기 A, B, C)은 「다 별론데」(사용자) → 빈 곳을 그림으로, 그림은 「차곡이와 스티커 판 함께」(사용자 선택). 2판: P1 판 위에 차곡이(추천), P2 나란히, P3 프레임 안에 그림 / 글자 T1, T2(추천), T3. 캡처는 `stories/_proposal/LoginArt.stories.tsx`. db `review/choice-login-<art\|size>`. 1판 기록: 「프레임이 제목 밑에 붙고 아래 공백이 많다」, 「세 버튼 글자 크기를 맞춰 달라」(사용자) → 프레임 위치 지금, A 가운데, B 조금 위(추천), C 묶어서 가운데 / 버튼 높이와 글자 S1 48과 21, S2 44와 19(추천), S3 40과 17(직접 만든 Apple 버튼은 글자 = 높이 43%, HIG). 캡처는 임시 스토리 `stories/_proposal/LoginLayout.stories.tsx`(커밋 안 함). db `review/choice-login-<layout\|size>`, `review/note-login-<layout\|size>-<안>` |

고른 안과 메모 전문: [`review-notes.json`](review-notes.json). 확정된 캐릭터 데이터: [`../character/`](../character/README.md).

## 시안에서 배운 것

- 브랜드 시안 전에 대표 이미지(캐릭터·심볼)를 먼저 묻는다. 새싹이는 메인 캐릭터가 아니다.
- 픽셀 그림은 렌더해서 큰 크기와 24px를 같이 본다. 4칸 z는 "고", 3칸 z는 I로 읽혔다.
- 몸 위쪽 모서리에 붙은 팔은 귀처럼 보인다. 이 캐릭터는 팔 없이, 필요하면 점 두 칸으로 충분했다.
