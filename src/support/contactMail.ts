import { t } from '../i18n';

/**
 * 설정 「도움말과 정보」의 문의하기와 광고 신고하기 메일 (PRD 4.9, 2026-10-28 시안 2판).
 * 메일 앱의 새 메일 쓰기 화면을 받는 곳, 제목, 본문 틀을 채워 연다. 보내기는 사용자가 한다.
 * 광고 신고는 심사 지침 2.5.18, 앱 안 연락 방법은 1.5.
 */
export const SUPPORT_EMAIL = 'chagok.app.help@gmail.com';

export type ContactKind = 'question' | 'adReport';

/** 메일 끝에 붙이는 앱 정보. 버전이나 빌드 번호를 모르면 빼고 적는다. */
export type ContactAppInfo = { version: string | null; build: string | null; os: string; osVersion: string };

const subject = (kind: ContactKind): string =>
  kind === 'question' ? t('contact.subjectQuestion') : t('contact.subjectAdReport');

/**
 * 본문 줄. 문의하기는 안내 한 줄, 구분선, 사용자가 쓸 빈 줄, 구분선, 앱 정보 순서다(2026-11-05 사용자).
 * 광고 신고는 질문마다 답을 쓸 빈 줄을 둔다.
 */
const bodyLines = (kind: ContactKind, info: ContactAppInfo): string[] =>
  kind === 'question'
    ? [t('contact.bodyQuestion'), '--', '', '', '', '--', t('contact.infoNote'), appInfoLine(info)]
    : [
        ...[t('contact.adWhat'), t('contact.adWhen'), t('contact.adWhere'), t('contact.adCapture')].flatMap((q) => [q, '', '']),
        '---',
        appInfoLine(info),
      ];

export function appInfoLine({ version, build, os, osVersion }: ContactAppInfo): string {
  const app = version ? `${t('contact.appVersion', version)}${build ? ` (${build})` : ''}` : t('contact.app');
  return `${app}, ${os === 'ios' ? 'iOS' : 'Android'} ${osVersion}`;
}

/** 줄은 CRLF로 잇는다(RFC 6068). LF만 쓰면 Gmail 앱이 줄바꿈을 버려 한 줄로 붙었다(2026-11-05 실기기). */
export function contactMailBody(kind: ContactKind, info: ContactAppInfo): string {
  return bodyLines(kind, info).join('\r\n');
}

/** mailto 주소. 제목과 본문은 퍼센트 인코딩한다(공백은 + 대신 %20, RFC 6068). */
export function contactMailUrl(kind: ContactKind, info: ContactAppInfo): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject(kind))}&body=${encodeURIComponent(contactMailBody(kind, info))}`;
}
