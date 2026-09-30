import type { PolicyKind } from './versions';

/** 정책 문서는 별도 공개 저장소 chagok-app-policy의 GitHub Pages에 있다 (약관 설계). */
export const POLICY_BASE_URL = 'https://eunjukkkkim.github.io/chagok-app-policy';

/** 오늘 시행 중인 판을 보여주는 주소. 판 선택은 사이트가 versions.json으로 한다. */
export const policyUrl = (kind: PolicyKind): string => `${POLICY_BASE_URL}/${kind}/`;

export const POLICY_MANIFEST_URL = `${POLICY_BASE_URL}/versions.json`;
