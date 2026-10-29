import { Linking, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { createSingleFlight } from '../app-data/singleFlight';
import type { DialogChoice, DialogSpec } from '../app-data/useDialog';
import { contactDialogs } from '../design-system';
import { SUPPORT_EMAIL, contactMailUrl, type ContactKind } from './contactMail';

/**
 * expo-application, expo-clipboard의 네이티브 모듈. 라이브러리 JS는 불러오는 순간 모듈을 찾고 없으면 멈춘다 —
 * 모듈 없이 만든 예전 개발 빌드가 깨지지 않게 있을 때만 쓴다(admob.ts와 같은 이유).
 */
type AppModule = { nativeApplicationVersion?: string | null; nativeBuildVersion?: string | null };
type ClipboardModule = { setStringAsync?: (text: string, options: object) => Promise<boolean> };
const appModule = () => requireOptionalNativeModule<AppModule>('ExpoApplication');

/** 앱 버전(예 `1.0.0`). 모듈이 없으면 null. */
export const appVersion = (): string | null => appModule()?.nativeApplicationVersion || null;

/** 여는 중에 다시 누르면 무시한다 — 메일 쓰기 화면이 두 번 뜨지 않게. */
const once = createSingleFlight();

/**
 * 메일 앱의 새 메일 쓰기 화면을 연다. 메일 앱이 없거나 열지 못하면 주소를 보여 주고 복사하게 한다.
 * 호출부가 기다리지 않으므로(void) 실패해도 던지지 않는다.
 */
export function openContactMail(kind: ContactKind, ask: (spec: DialogSpec) => Promise<DialogChoice>): Promise<void> {
  return once(async () => {
    const url = contactMailUrl(kind, {
      version: appVersion(),
      build: appModule()?.nativeBuildVersion || null,
      os: Platform.OS,
      osVersion: String(Platform.Version),
    });
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // 메일 앱이 없거나 계정이 없다 — 아래에서 주소를 알린다
    }
    if ((await ask(contactDialogs.noMail(SUPPORT_EMAIL))) !== 'primary') return;
    try {
      await requireOptionalNativeModule<ClipboardModule>('ExpoClipboard')?.setStringAsync?.(SUPPORT_EMAIL, {});
    } catch {
      // 복사하지 못해도 주소는 다이얼로그에서 이미 보여 줬다
    }
  });
}
