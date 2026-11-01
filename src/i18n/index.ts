import { en } from './en';
import { ko, type Messages } from './ko';

export type Language = 'ko' | 'en';

const dictionaries: Record<Language, Messages> = { ko, en };

/** 한국어가 아니면 모두 영어다 (출시 후 기획 D2). */
export function resolveLanguage(languageCode: string | null | undefined): Language {
  return languageCode === 'ko' ? 'ko' : 'en';
}

// 기기 언어는 앱 진입점에서 넣는다(device.ts). 기기 모듈이 없는 테스트와 Storybook은 이 기본값으로 돈다.
let current: Language = 'ko';

export function getLanguage(): Language {
  return current;
}

export function setLanguage(language: Language): void {
  current = language;
}

type MessageArgs<Key extends keyof Messages> = Messages[Key] extends (...args: infer Args) => string ? Args : [];

/**
 * 지금 언어의 문구. 부를 때의 언어를 쓰므로 모듈 맨 위 상수에 담지 말고 그릴 때 부른다.
 * 수가 들어가는 문구는 인자를 함께 넘긴다: t('trial.daysLeft', 3)
 */
export function t<Key extends keyof Messages>(key: Key, ...args: MessageArgs<Key>): string {
  const message = dictionaries[current][key] as string | ((...values: unknown[]) => string);
  return typeof message === 'function' ? message(...args) : message;
}
