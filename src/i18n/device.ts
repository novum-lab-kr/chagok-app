import { getLocales, useLocales } from 'expo-localization';
import { resolveLanguage, setLanguage, type Language } from './index';

/**
 * 기기 언어 목록의 첫 번째를 앱 언어로 정한다.
 */
function languageOf(languageCode: string | null | undefined): Language {
  return resolveLanguage(languageCode);
}

/** 앱 진입점이 다른 화면 코드가 문구를 읽기 전에 한 번 부른다. */
export function applyDeviceLanguage(): void {
  setLanguage(languageOf(getLocales()[0]?.languageCode));
}

/** 앱이 도는 중 기기 언어가 바뀌면(Android) 새 언어를 돌려준다. 값이 바뀌면 화면을 다시 만들어 새 문구로 그린다. */
export function useDeviceLanguage(): Language {
  const language = languageOf(useLocales()[0]?.languageCode);
  // 자식이 그려지기 전에 맞춘다. 같은 값을 다시 넣어도 해가 없다.
  setLanguage(language);
  return language;
}
