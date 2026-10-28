import { SUPPORT_EMAIL, appInfoLine, contactMailBody, contactMailUrl } from '../src/support/contactMail';

const info = { version: '1.0.0', build: '5', os: 'ios', osVersion: '26.6' };

describe('문의 메일', () => {
  test('앱 정보 줄: 버전, 빌드, OS', () => {
    expect(appInfoLine(info)).toBe('앱 1.0.0 (5), iOS 26.6');
    expect(appInfoLine({ ...info, build: null })).toBe('앱 1.0.0, iOS 26.6');
    expect(appInfoLine({ version: null, build: null, os: 'android', osVersion: '36' })).toBe('앱, Android 36');
  });

  test('문의하기 본문은 안내 뒤 앱 정보, 「지워도 괜찮아요」는 쓰지 않는다', () => {
    const body = contactMailBody('question', info);
    expect(body.startsWith('궁금한 점이나 불편한 점을 적어 주세요.')).toBe(true);
    expect(body.endsWith('---\n아래 정보는 문제를 찾는 데 써요.\n앱 1.0.0 (5), iOS 26.6')).toBe(true);
    expect(body).not.toContain('지워도');
  });

  test('광고 신고 본문은 네 가지를 묻고 앱 정보로 끝난다', () => {
    const body = contactMailBody('adReport', info);
    expect(body.split('\n').slice(0, 4)).toEqual([
      '어떤 광고였나요? (광고 이름이나 내용)',
      '언제 봤나요?',
      '어디서 봤나요? (목표 화면 아래 / 광고 보고 하루 써 보기)',
      '가능하면 화면을 캡처해 붙여 주세요.',
    ]);
    expect(body.endsWith('---\n앱 1.0.0 (5), iOS 26.6')).toBe(true);
  });

  test('mailto 주소: 받는 곳, 인코딩한 제목과 본문', () => {
    const url = contactMailUrl('adReport', info);
    expect(url.startsWith(`mailto:${SUPPORT_EMAIL}?subject=`)).toBe(true);
    const params = new URLSearchParams(url.slice(url.indexOf('?') + 1));
    expect(params.get('subject')).toBe('[광고 신고] 차곡차곡');
    expect(params.get('body')).toBe(contactMailBody('adReport', info));
    expect(url).not.toContain('+');
    expect(url).not.toContain(' ');
  });
});
