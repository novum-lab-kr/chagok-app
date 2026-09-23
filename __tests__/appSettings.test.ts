import { getFlag, setFlag } from '../src/repositories/appSettingsRepository';
import { useFreshDb } from './support/setup';

useFreshDb();

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
