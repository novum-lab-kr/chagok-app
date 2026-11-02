import { getLocales, useLocales } from 'expo-localization';
import { getLanguage, setLanguage } from '../src/i18n';
import { applyDeviceLanguage, useDeviceLanguage } from '../src/i18n/device';

jest.mock('expo-localization', () => ({ getLocales: jest.fn(), useLocales: jest.fn() }), { virtual: true });

const globals = globalThis as unknown as { __DEV__: boolean };
const originalDev = globals.__DEV__;

function useEnglishDevice() {
  (getLocales as jest.Mock).mockReturnValue([{ languageCode: 'en' }]);
  (useLocales as jest.Mock).mockReturnValue([{ languageCode: 'en' }]);
}

afterEach(() => {
  globals.__DEV__ = originalDev;
  setLanguage('ko');
});

describe('기기 언어를 따른다', () => {
  beforeEach(useEnglishDevice);

  it.each([true, false])('__DEV__ %s에서 영어 기기는 영어다', (dev) => {
    globals.__DEV__ = dev;
    applyDeviceLanguage();
    expect(getLanguage()).toBe('en');
    setLanguage('ko');
    expect(useDeviceLanguage()).toBe('en');
    expect(getLanguage()).toBe('en');
  });
});
