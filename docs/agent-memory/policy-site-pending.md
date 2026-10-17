---
name: policy-site-pending
description: "chagok-app-policy hosted on Netlify from a `publish` placeholder branch; draft main stays local until contact email and cloud provider are decided"
metadata:
  node_type: memory
  type: project
  originSessionId: 0f07339a-94c2-4372-aeaa-17ac8036a01b
  modified: 2026-09-30T10:54:25.109Z
---

약관·처리방침 사이트는 `~/Desktop/workspace/chagok-app-policy`(origin: github.com/novum-lab-kr/chagok-app-policy, 2026-10-04 개인 계정에서 Org `nol-meok`으로, 2026-10-17 `novum-lab-kr`로 이전)에 있다.

- 호스팅은 GitHub Pages가 아니라 **Netlify**로 바꿨다(2026-09-30 사용자 결정). GitHub Pages는 주소에 GitHub 아이디가 보인다. Cloudflare Pages(조회 무제한)를 추천했지만 사용자가 `.pages.dev` 대신 `.netlify.app`을 골랐다. 무료 요금제는 월 300크레딧 고정 한도라 사용량을 지켜봐야 한다.
- 저장소는 **공개**다(2026-10-04 Org `nol-meok`으로 옮기자 Netlify 무료 플랜이 Org 비공개 레포 배포를 막아(Pro $20/월 요구) 사용자가 공개로 전환). 비밀값을 이 레포에 넣지 않는다.
- 주소: **https://chagok-app-terms.netlify.app** (Netlify 팀 `chagok-policy`, 2026-09-30 연결 확인 200). Visitor access는 Private + "Previews only"라 운영 주소만 공개된다. `publish` 브랜치만 push했다.
- Netlify 운영 브랜치는 `publish`. 2026-09-30 사용자 결정으로 **초안을 공개**했다(main과 같은 내용, `_headers`로 모든 페이지 `X-Robots-Tag: noindex`). 판 날짜는 초안이 열리도록 2026-09-30. 운영자 "노붐(NOVUM) · 대표 성민창 · 사업자등록번호 506-27-54296"(주소는 무료 앱이라 넣지 않음), 개인정보 보호책임자 "김은주", 문의 chagok.app.help@gmail.com. 남은 빈칸은 `[클라우드 사업자]`(처리방침 5항). 정책 저장소 main·publish 모두 push됨. Netlify GitHub 앱에 저장소 권한을 줘야 배포된다(첫 시도 "Repository not found").
- 개발자 계정은 남편 명의: Apple은 개인사업자라 개인 계정(판매자 = 성민창 실명, 상호 불가), Google Play도 개인 계정 추천(개인사업자 조직 계정은 판매 대금 결제 프로필 불가로 알려짐, 광고·인앱 결제가 나중에 들어갈 수 있음).

**Why:** 사용자가 지금 주소와 연결은 잡아 두되, 빈칸 있는 약관과 운영자 이름이 미리 공개되지 않기를 원했다. 문의 이메일은 개발자 계정 이메일과 달라도 된다. 운영자 표기만 개발자 계정 명의와 맞춘다.

**How to apply:** 앱은 이미 Netlify 주소를 본다(main c2e63d4). 공식 게시 때: 클라우드 사업자 채우기, 판 날짜를 게시일로, `_headers` 삭제 → 검토 → 커밋 → main을 publish에 합쳐 push. 스토어 제출 전에 끝내야 한다. 커밋 전 승인 규칙은 [[no-commit-before-approval]].
