import { getDeviceId, getFlag, getSetting, setFlag, setSetting } from '../src/repositories/appSettingsRepository';
import { withFreshDb } from './support/setup';

withFreshDb();

describe('appSettings', () => {
  it('정해둔 적 없는 값은 false다', async () => {
    expect(await getFlag('tutorialDone')).toBe(false);
  });
  it('켠 값이 유지된다', async () => {
    await setFlag('tutorialDone', true);
    expect(await getFlag('tutorialDone')).toBe(true);
  });
  it('다시 끌 수 있다', async () => {
    await setFlag('tutorialDone', true);
    await setFlag('tutorialDone', false);
    expect(await getFlag('tutorialDone')).toBe(false);
  });
});

describe('문자열 설정', () => {
  it('저장·지우기', async () => {
    expect(await getSetting('accountUserId')).toBeNull();
    await setSetting('accountUserId', 'u1');
    expect(await getSetting('accountUserId')).toBe('u1');
    await setSetting('accountUserId', null);
    expect(await getSetting('accountUserId')).toBeNull();
  });
  it('기기 ID는 한 번 만들고 유지한다', async () => {
    const a = await getDeviceId();
    expect(a).toMatch(/.+/);
    expect(await getDeviceId()).toBe(a);
  });
});
