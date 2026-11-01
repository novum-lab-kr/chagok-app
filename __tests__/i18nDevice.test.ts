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

describe('출시 빌드 한국어 고정', () => {
  beforeEach(useEnglishDevice);

  it('출시 빌드(__DEV__ false)는 영어 기기에서도 한국어다', () => {
    globals.__DEV__ = false;
    setLanguage('en');
    applyDeviceLanguage();
    expect(getLanguage()).toBe('ko');
    setLanguage('en');
    expect(useDeviceLanguage()).toBe('ko');
    expect(getLanguage()).toBe('ko');
  });

  it('개발 빌드(__DEV__ true)는 영어 기기에서 영어다', () => {
    globals.__DEV__ = true;
    applyDeviceLanguage();
    expect(getLanguage()).toBe('en');
    setLanguage('ko');
    expect(useDeviceLanguage()).toBe('en');
    expect(getLanguage()).toBe('en');
  });
});
