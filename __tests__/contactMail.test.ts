import { SUPPORT_EMAIL, appInfoLine, contactMailBody, contactMailUrl } from '../src/support/contactMail';

const info = { version: '1.0.0', build: '5', os: 'ios', osVersion: '26.6' };

describe('문의 메일', () => {
  test('앱 정보 줄: 버전, 빌드, OS', () => {
    expect(appInfoLine(info)).toBe('앱 1.0.0 (5), iOS 26.6');
    expect(appInfoLine({ ...info, build: null })).toBe('앱 1.0.0, iOS 26.6');
    expect(appInfoLine({ version: null, build: null, os: 'android', osVersion: '36' })).toBe('앱, Android 36');
  });

  test('문의하기 본문은 안내, 구분선, 쓸 자리(빈 줄 셋), 구분선, 앱 정보 (2026-11-05 사용자)', () => {
    expect(contactMailBody('question', info).split('\r\n')).toEqual([
      '불편한 점이나 궁금한 점을 적어 주세요.',
      '--',
      '',
      '',
      '',
      '--',
      '아래 정보는 문제를 찾는 데 써요.',
      '앱 1.0.0 (5), iOS 26.6',
    ]);
    expect(contactMailBody('question', info)).not.toContain('지워도');
  });

  test('광고 신고 본문은 네 질문마다 답을 쓸 빈 줄을 두고 앱 정보로 끝난다', () => {
    expect(contactMailBody('adReport', info).split('\r\n')).toEqual([
      '어떤 광고였나요? (광고 이름이나 내용)',
      '',
      '',
      '언제 봤나요?',
      '',
      '',
      '어디서 봤나요? (목표 화면 아래 / 광고 보고 하루 써 보기)',
      '',
      '',
      '가능하면 화면을 캡처해 붙여 주세요.',
      '',
      '',
      '---',
      '앱 1.0.0 (5), iOS 26.6',
    ]);
  });

  test('줄바꿈은 모두 CRLF다 — LF만 쓰면 Gmail 앱이 한 줄로 붙인다', () => {
    for (const kind of ['question', 'adReport'] as const) {
      expect(contactMailBody(kind, info).replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    }
  });

  test('mailto 주소를 고정한다: 받는 곳, 인코딩한 제목, %0D%0A 줄바꿈', () => {
    expect(contactMailUrl('question', info)).toBe(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('[문의] 차곡차곡')}&body=` +
        encodeURIComponent('불편한 점이나 궁금한 점을 적어 주세요.') + '%0D%0A--%0D%0A%0D%0A%0D%0A%0D%0A--%0D%0A' +
        encodeURIComponent('아래 정보는 문제를 찾는 데 써요.') + '%0D%0A' +
        encodeURIComponent('앱 1.0.0 (5), iOS 26.6'),
    );
    const url = contactMailUrl('adReport', info);
    expect(url.startsWith(`mailto:${SUPPORT_EMAIL}?subject=`)).toBe(true);
    const params = new URLSearchParams(url.slice(url.indexOf('?') + 1));
    expect(params.get('subject')).toBe('[광고 신고] 차곡차곡');
    expect(params.get('body')).toBe(contactMailBody('adReport', info));
    expect(url).toContain(encodeURIComponent('언제 봤나요?') + '%0D%0A%0D%0A%0D%0A');
    expect(url).not.toMatch(/%0A(?<!%0D%0A)/);
    expect(url).not.toContain('+');
    expect(url).not.toContain(' ');
  });
});
