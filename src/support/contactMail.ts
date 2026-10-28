/**
 * 설정 「도움말과 정보」의 문의하기와 광고 신고하기 메일 (PRD 4.9, 2026-10-28 시안 2판).
 * 메일 앱의 새 메일 쓰기 화면을 받는 곳, 제목, 본문 틀을 채워 연다. 보내기는 사용자가 한다.
 * 광고 신고는 심사 지침 2.5.18, 앱 안 연락 방법은 1.5.
 */
export const SUPPORT_EMAIL = 'chagok.app.help@gmail.com';

export type ContactKind = 'question' | 'adReport';

/** 메일 끝에 붙이는 앱 정보. 버전이나 빌드 번호를 모르면 빼고 적는다. */
export type ContactAppInfo = { version: string | null; build: string | null; os: string; osVersion: string };

const SUBJECT: Record<ContactKind, string> = {
  question: '[문의] 차곡차곡',
  adReport: '[광고 신고] 차곡차곡',
};

const BODY: Record<ContactKind, string> = {
  question: '궁금한 점이나 불편한 점을 적어 주세요.\n\n\n',
  adReport: [
    '어떤 광고였나요? (광고 이름이나 내용)',
    '언제 봤나요?',
    '어디서 봤나요? (목표 화면 아래 / 광고 보고 하루 써 보기)',
    '가능하면 화면을 캡처해 붙여 주세요.',
  ].join('\n'),
};

export function appInfoLine({ version, build, os, osVersion }: ContactAppInfo): string {
  const app = version ? `앱 ${version}${build ? ` (${build})` : ''}` : '앱';
  return `${app}, ${os === 'ios' ? 'iOS' : 'Android'} ${osVersion}`;
}

export function contactMailBody(kind: ContactKind, info: ContactAppInfo): string {
  const tail = kind === 'question' ? '---\n아래 정보는 문제를 찾는 데 써요.\n' : '---\n';
  return `${BODY[kind]}\n${tail}${appInfoLine(info)}`;
}

/** mailto 주소. 제목과 본문은 퍼센트 인코딩한다(공백은 + 대신 %20, RFC 6068). */
export function contactMailUrl(kind: ContactKind, info: ContactAppInfo): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUBJECT[kind])}&body=${encodeURIComponent(contactMailBody(kind, info))}`;
}
