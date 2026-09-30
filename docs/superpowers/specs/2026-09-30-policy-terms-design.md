# 약관·정책 설계

2026-09-30 · 하위 프로젝트 1/3 · 관련: [PRD 4.8·4.9·8.1](../../PRD.md), [계정·백업 설계](2026-09-30-account-backup-design.md)

## 목표

이용약관·개인정보 처리방침·오픈소스 라이선스를 앱 안에서 볼 수 있게 하고, 계정을 연결할 때 동의와
만 14세 확인을 받는다. 약관은 판별로 게시하고, 개정되면 시행일에 맞춰 재동의를 받는다.
문구 수정에 앱 배포가 필요하지 않아야 하고, 나중의 패드 지원에서도 따로 손볼 것이 없어야 한다.

## 결정 (2026-09-30)

| 항목 | 결정 |
| --- | --- |
| 본문 위치 | 웹 URL 한 벌. 앱은 `expo-web-browser` 시트(iOS SFSafariViewController, Android Custom Tabs)로 연다 |
| 오픈소스 라이선스 | 앱 내장 화면 (오프라인 열람, 시안 `라이선스-상세`) |
| 호스팅 | 별도 저장소 **`chagok-app-policy`**(비공개) + **Netlify** `https://chagok-app-terms.netlify.app`. 앱 저장소는 공개하지 않는다. 2026-09-30 GitHub Pages에서 바꿨다 — 주소에 GitHub 아이디가 보여서. 게시 상태는 아래 「게시 상태」 |
| 문안 | 에이전트가 PRD 8.1 항목으로 초안 작성, 최종은 법률 검토 |
| 동의 화면 | 계정 연결 직전 한 화면: [필수] 만 14세 이상 · [필수] 이용약관 동의(보기) · 처리방침 안내(보기) |
| 처리방침 | 동의가 아니라 안내. 2023-09 개정 개인정보 보호법에서 계약 이행 필수 항목은 처리방침 고지로 처리한다 |
| 로그인 안 한 사용자 | 동의를 받지 않는다. 앱 설정에서 열람만 |
| 재동의 | 앱이 `versions.json`을 읽어, 시행 중인 판이 동의한 판보다 높고 `requiresConsent`이면 동의 화면 |

## 게시 상태 (2026-09-30)

- Netlify 프로젝트 `chagok-app-terms`(팀 `chagok-policy`)가 저장소의 **`publish` 브랜치**를 배포한다. 빌드 없음, 게시 폴더 `.`.
- `publish`에는 지금 "준비 중" 페이지(`noindex`) 하나만 있다. 약관 초안은 정책 저장소 로컬 `main`에만 있고 push하지 않았다. 빈칸: 문의 이메일, 클라우드 사업자, 판 날짜.
- 그래서 앱의 약관 링크(`/terms/`, `/privacy/`)와 `versions.json`은 게시 전까지 404다. 앱은 이미 이 주소를 본다(`src/policy/urls.ts`).
- Visitor access: Private + "Previews only" — 운영 주소만 공개, 미리보기는 잠금.
- 무료 요금제는 월 300크레딧 고정 한도다(배포 1회 15, 전송 1GB 20, 요청 1만 건 2). 앱이 실행마다 `versions.json`을 받으므로 사용자가 늘면 Team → Usage를 확인한다. 한도가 문제되면 Cloudflare Pages(조회 무제한)로 옮기고 주소 한 줄을 바꾼다.
- 게시할 때: 빈칸을 채우고 검토 → 초안을 `publish`에 반영(또는 Netlify 운영 브랜치를 `main`으로) → 주소 4개(`/`, `/terms/`, `/privacy/`, `/delete-account/`)와 `versions.json` 확인.

## 정책 저장소 `chagok-app-policy`

```
terms/
  v1/index.html      ← 판 원문. 상단에 게시일·시행일
  index.html         ← 오늘 시행 중인 판 (앱·스토어가 거는 URL)
  history.html       ← 판 목록: 게시일 · 시행일 · 바뀐 점 · 링크
privacy/             ← 같은 구조
delete-account/      ← Google Play용 웹 삭제 요청 안내 (계정·백업 설계 ③)
versions.json
```

```json
{
  "terms":   [{ "version": 1, "postedAt": "YYYY-MM-DD", "effectiveAt": "YYYY-MM-DD",
                "summary": "최초 제정", "requiresConsent": true }],
  "privacy": [{ "version": 1, "postedAt": "YYYY-MM-DD", "effectiveAt": "YYYY-MM-DD",
                "summary": "최초 제정", "requiresConsent": false }]
}
```

- **판별 게시.** 판마다 폴더가 따로 있어 이전 판도 계속 열람할 수 있다.
- **게시일과 시행일은 따로 둔다.** 새 판을 미리 올리고 시행일을 미래로 잡으면 그날까지 `index.html`은 이전 판을
  보여주고 상단에 "M월 D일부터 바뀌어요"를 알린다. `index.html`은 `versions.json`을 읽어 오늘 기준으로 고른다.
  사전 고지 기간(관행상 7일, 불리한 변경 30일)은 법률 검토에서 확인한다.
- **날짜는 `versions.json`만 고쳐 올리면 반영된다.** 앱 배포는 필요 없다.
- **시행된 판의 본문은 고치지 않는다.** 오탈자 수준만 고치고, 내용이 바뀌면 새 판을 만든다. git 이력이 감사 기록이다.
- `requiresConsent`는 문구만 다듬은 개정에서 전원 재동의를 피하기 위한 표시다.

## 앱

**앱 설정 → 약관과 라이선스** (시안 `약관과-라이선스-목록`)

- 이용약관 · 개인정보 처리방침 → `WebBrowser.openBrowserAsync(url)`. 오프라인이면 `PixelDialog basic single`로
  "인터넷에 연결되면 볼 수 있어요".
- 오픈소스 라이선스 → 내장 목록 → 상세. Neo둥근모 SIL OFL 1.1 포함.

**동의 화면** (신규, 계정 연결 흐름의 첫 화면)

- 체크 두 개가 모두 켜져야 Apple/Google 버튼이 활성화된다. Android는 Google만.
- "보기"는 위와 같은 웹 시트.
- "만 14세 미만이에요" 링크 → "이 기기에서 계속 쓸 수 있어요. 기기를 바꾸면 기록을 옮길 수 없어요" 안내 후 이전 화면으로.
  **미만이라는 사실은 저장하지 않는다.** 그 자체가 아동 정보이고, 생일이 지난 뒤 다시 시도할 수 있어야 한다.
- 로그인이 취소·실패하면 이 화면으로 돌아오고 체크 상태는 유지한다.
- 로그인 성공 뒤 서버 `record_consent(terms_version, privacy_version)`로 동의 이력을 남긴다 (계정·백업 설계 ③).

**재동의**

- 로그인한 사용자가 앱을 열 때 `versions.json`을 받는다. 시행 중인 판(`effectiveAt ≤ 오늘`의 최신)의
  `requiresConsent`가 참이고 동의한 판보다 높으면 동의 화면을 띄운다.
- 목록을 받지 못하면(오프라인·오류) 건너뛴다. 앱 사용을 막지 않는다.
- 앱에는 정책 URL의 기준 주소만 상수로 둔다.

## 만 14세 기준의 영향

앱 기능(목표·스티커·사진·메모·위젯·열람)은 모두 동일하다. 만 14세 미만은 **계정 연결(백업·복원)만** 막는다.
서버가 아무것도 받지 않으므로 개인정보 보호법 §22-2의 법정대리인 동의 의무가 생기지 않는다.
스토어에서는 App Store Kids 카테고리에 넣지 않고, Google Play 타깃 연령에 13세 미만을 넣지 않는다(Families 정책 회피).

## 의존성

`expo-web-browser` — `package.json`·`package-lock.json` 백업 후 설치, `npm ls react-dom --all`이 `19.2.3` 하나인지 확인.

## 테스트

- `versions.json`에서 시행 중인 판을 고르는 함수와 재동의 판단 함수: jest(시행일 전날·당일, `requiresConsent` 거짓, 목록 없음).
- 동의 화면·약관 목록: vitest + Storybook 스토리(체크 상태별, Android 버튼 구성, 오프라인 알림).
- 정책 사이트: `index.html`이 시행일 기준으로 판을 고르는지 브라우저에서 렌더해 확인.

## 범위 밖

- 법률 검토 자체, 사업자 정보·개인정보 보호책임자 등 운영자 정보 기입.
- 아동 법정대리인 동의 흐름.
