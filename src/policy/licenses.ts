import { NEODGM_OFL } from './ofl-neodgm';

export type LicenseEntry = { id: string; name: string; license: string; text?: string };

/** 앱 설정 → 약관과 라이선스 → 오픈소스 라이선스 (PRD 4.9). 앱에 넣어 오프라인에서도 본다. */
export const LICENSES: readonly LicenseEntry[] = [
  { id: 'neodgm', name: 'Neo둥근모', license: 'SIL Open Font License 1.1', text: NEODGM_OFL },
  { id: 'react-native', name: 'React Native', license: 'MIT' },
  { id: 'expo', name: 'Expo', license: 'MIT' },
  { id: 'react', name: 'React', license: 'MIT' },
];
