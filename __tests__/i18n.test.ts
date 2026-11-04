import { goalNameError, parseSlotCount } from '../src/domain/board';
import { getLanguage, resolveLanguage, setLanguage, t } from '../src/i18n';
import { packName, stickerName } from '../src/i18n/stickerNames';
import { AD_TRIAL_MS, trialLabel } from '../src/domain/packs';
import { dayLabel } from '../src/app-data/recordTimeline';
import { monthDayLabel } from '../src/policy/versions';
import { formatBackedUpAt } from '../src/sync/accountStatus';

afterEach(() => setLanguage('ko'));

describe('resolveLanguage', () => {
  it('한국어만 한국어이고 나머지는 영어다', () => {
    expect(resolveLanguage('ko')).toBe('ko');
    expect(resolveLanguage('en')).toBe('en');
    expect(resolveLanguage('ja')).toBe('en');
    expect(resolveLanguage('zh')).toBe('en');
    expect(resolveLanguage(null)).toBe('en');
    expect(resolveLanguage(undefined)).toBe('en');
  });
});

describe('t', () => {
  it('기본 언어는 한국어다', () => {
    expect(getLanguage()).toBe('ko');
    expect(t('common.retry')).toBe('다시 시도');
  });

  it('언어를 바꾸면 그 언어 문구를 돌려준다', () => {
    setLanguage('en');
    expect(t('common.retry')).toBe('Try again');
  });

  it('영어 복수형을 1과 나머지로 나눈다', () => {
    setLanguage('en');
    expect(t('trial.daysLeft', 1)).toBe('1 day left');
    expect(t('trial.daysLeft', 3)).toBe('3 days left');
    expect(t('trial.hoursLeft', 1)).toBe('1 hour left');
    expect(t('trial.hoursLeft', 24)).toBe('24 hours left');
  });

  it('한국어는 수에 상관없이 같은 꼴이다', () => {
    expect(t('trial.daysLeft', 1)).toBe('1일 남음');
    expect(t('trial.daysLeft', 3)).toBe('3일 남음');
  });
});

describe('trialLabel', () => {
  it('지금 언어로 남은 시간을 말한다', () => {
    const now = 1_000_000;
    setLanguage('en');
    expect(trialLabel(now + AD_TRIAL_MS * 3, now)).toBe('3 days left');
    expect(trialLabel(now + AD_TRIAL_MS, now)).toBe('24 hours left');
  });
});

describe('날짜 문구', () => {
  it('한국어 표기는 지금과 같다', () => {
    expect(t('date.monthDay', 9, 3)).toBe('9월 3일');
    expect(t('date.monthDayNumeric', 9, 29)).toBe('9/29');
    expect(t('date.yearMonth', 2026, 10)).toBe('2026년 10월');
    expect(t('date.yearMonthDay', 2026, 10, 8)).toBe('2026년 10월 8일');
    expect(t('date.monthDayWeekday', 10, 12, 1)).toBe('10월 12일 월요일');
    expect(t('date.todayAt', '9:20')).toBe('오늘 9:20');
  });

  it('영어는 달 이름으로 쓴다', () => {
    setLanguage('en');
    expect(t('date.monthDay', 9, 3)).toBe('Sep 3');
    expect(t('date.monthDayNumeric', 12, 29)).toBe('Dec 29');
    expect(t('date.yearMonth', 2026, 1)).toBe('Jan 2026');
    expect(t('date.yearMonthDay', 2026, 10, 8)).toBe('Oct 8, 2026');
    expect(t('date.monthDayWeekday', 10, 12, 1)).toBe('Oct 12 Monday');
    expect(t('date.weekdayNarrow', 0)).toBe('S');
  });

  it('날짜 함수가 지금 언어를 따른다', () => {
    expect(monthDayLabel('2026-10-15')).toBe('10월 15일');
    expect(dayLabel('2026-10-12')).toBe('10월 12일 월요일');
    setLanguage('en');
    expect(monthDayLabel('2026-10-15')).toBe('Oct 15');
    expect(dayLabel('2026-10-12')).toBe('Oct 12 Monday');
    const now = new Date(2026, 9, 12, 12);
    expect(formatBackedUpAt(new Date(2026, 9, 12, 9, 20).getTime(), now)).toBe('Today 9:20');
    expect(formatBackedUpAt(new Date(2026, 9, 1).getTime(), now)).toBe('Oct 1');
  });
});

describe('목표와 판 문구', () => {
  it('영어는 정한 이름을 쓴다', () => {
    expect(t('app.name')).toBe('차곡차곡');
    setLanguage('en');
    expect(t('app.name')).toBe('Chagok');
    expect(t('character.sprout')).toBe('Sprout');
    expect(t('dialog.photoDeniedDescription')).toContain('Chagok');
  });

  it('앱 이름 뜻은 영어 첫 실행에만 있다', () => {
    expect(t('tutorial.firstRunAddDescription')).toBe(t('tutorial.addDescription'));
    setLanguage('en');
    expect(t('tutorial.firstRunAddDescription')).toContain('chagok-chagok');
    expect(t('tutorial.addDescription')).not.toContain('chagok-chagok');
  });

  it('영어 칸 수와 삭제 문구는 단수와 복수를 나눈다', () => {
    setLanguage('en');
    expect(t('board.tallyWithSlots', 1)).toBe('Tally board, 1 slot');
    expect(t('board.tallyWithSlots', 20)).toBe('Tally board, 20 slots');
    expect(t('goalDelete.description', 1, 2)).toBe("1 sticker and 2 records will go with it. You can't undo this.");
    expect(t('goalDelete.description', 0, 0)).toBe("This goal will be gone. You can't undo this.");
  });

  it('한국어 삭제 문구는 그대로다', () => {
    expect(t('goalDelete.description', 3, 1)).toBe('붙인 스티커 3개와 기록 1개가 함께 지워지고, 되돌릴 수 없어요.');
  });

  it('입력 검사 문구는 부르는 순간의 언어다', () => {
    setLanguage('en');
    expect(goalNameError('')).toBe('Give your goal a name.');
    expect(parseSlotCount('3', 5)).toEqual({ ok: false, reason: "You can't go below 5 slots." });
  });
});

describe('기록 문구', () => {
  it('영어 모은 날 수는 단수와 복수를 나눈다', () => {
    expect(t('nudge.stickerDays', 3)).toBe('스티커 붙인 날 3일을 모았어요');
    setLanguage('en');
    expect(t('nudge.stickerDays', 1)).toBe('1 sticker day collected');
    expect(t('nudge.stickerDays', 3)).toBe('3 sticker days collected');
  });
});

describe('설정, 계정, 약관 문구', () => {
  afterEach(() => setLanguage('ko'));

  test('한국어 글자는 그대로다', () => {
    expect(t('restore.counts', 2, 5)).toBe('목표 2개 · 스티커 5개');
    expect(t('restore.namesMore', '물 마시기, 운동', 3)).toBe('물 마시기, 운동 외 3개');
    expect(t('account.logoutHeldTitle', 2)).toBe('기록 2개가 사라져요');
    expect(t('account.continueKakao')).toBe('카카오로 계속하기');
  });

  test('영어는 복수형을 맞추고 가운뎃점을 쓰지 않는다', () => {
    setLanguage('en');
    expect(t('restore.counts', 1, 1)).toBe('1 goal, 1 sticker');
    expect(t('restore.counts', 2, 5)).toBe('2 goals, 5 stickers');
    expect(t('account.logoutHeldTitle', 1)).toBe('1 record will be lost');
    expect(t('account.logoutHeldTitle', 3)).toBe('3 records will be lost');
    expect(t('account.logoutHeldDescription', 1)).toBe("This record can't be backed up. Logging out removes it from this device too. Log out anyway?");
    expect(t('account.logoutHeldDescription', 3)).toBe("These records can't be backed up. Logging out removes them from this device too. Log out anyway?");
  });

  test('영어 로그인 라벨은 회사 가이드의 글자다', () => {
    setLanguage('en');
    expect(t('account.continueApple')).toBe('Continue with Apple');
    expect(t('account.continueGoogle')).toBe('Continue with Google');
    expect(t('account.continueKakao')).toBe('Login with Kakao');
  });
});

describe('스티커와 구매 문구', () => {
  it('언어에 따라 묶음과 스티커 이름, 끝나는 때가 바뀐다', () => {
    expect(packName('weather_normal')).toBe('날씨와 계절');
    expect(stickerName('basic.sprout', '새싹')).toBe('새싹');
    expect(t('shop.trialEnd', false, 23, 0)).toBe('내일 밤 11:00');
    setLanguage('en');
    expect(packName('weather_normal')).toBe('Weather and seasons');
    expect(stickerName('basic.sprout', '새싹')).toBe('Sprout');
    expect(t('shop.trialEnd', false, 23, 0)).toBe('tomorrow at 11:00 PM');
    expect(t('shop.trialEnd', true, 0, 5)).toBe('today at 12:05 AM');
  });
  it('원화 가격', () => {
    expect(t('shop.priceWon', '2,200')).toBe('2,200원');
    setLanguage('en');
    expect(t('shop.priceWon', '2,200')).toBe('₩2,200');
  });
  it('법 근거 문구는 한국어를 그대로 두고 영어는 스토어별 문구를 쓴다', () => {
    expect(t('legal.minorCancel')).toBe('미성년자가 법정대리인 동의 없이\n샀다면 취소할 수 있어요.');
    setLanguage('en');
    const rights = 'a change of mind alone does not entitle you to a refund. This does not affect your rights under local law, including if something is faulty.';
    const contact = 'For problems with the app, you can also contact us at help@example.com.';
    const apple = 'Refund requests go through Apple: reportaproblem.apple.com.';
    const google = 'Refund requests go through Google Play (Budget & order history > Report a problem).';
    expect(t('legal.minorCancel')).toBe('Under 18? Ask a parent or guardian before buying. This does not limit any rights you have under local law.');
    expect(t('legal.packNoRefund', 'apple', 'help@example.com')).toBe(`Once you pick or place a sticker from this pack, ${rights} ${apple} ${contact}`);
    expect(t('legal.adFreeNoRefund', 'apple', 'help@example.com')).toBe(`Ads go away as soon as you buy, so ${rights} ${apple} ${contact}`);
    expect(t('legal.packNoRefund', 'google', 'help@example.com')).toBe(`Once you pick or place a sticker from this pack, ${rights} ${google} ${contact}`);
    expect(t('legal.adFreeNoRefund', 'google', 'help@example.com')).toBe(`Ads go away as soon as you buy, so ${rights} ${google} ${contact}`);
  });
});
