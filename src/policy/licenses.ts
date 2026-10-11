import { NEODGM_OFL } from './ofl-neodgm';
import { OSS_LICENSES } from './oss-licenses.generated';

export type LicenseEntry = { id: string; name: string; license: string; text?: string };

/** 앱 설정 → 약관과 라이선스 → 오픈소스 라이선스 (PRD 4.9). 앱에 넣어 오프라인에서도 본다. */
export const LICENSES: readonly LicenseEntry[] = [
  { id: 'neodgm', name: 'Neo둥근모', license: 'SIL Open Font License 1.1', text: NEODGM_OFL },
  // 앱에 실제로 들어가는 라이브러리 전부. 의존성을 바꾸면 `npm run licenses`로 다시 만든다.
  ...OSS_LICENSES,
];
