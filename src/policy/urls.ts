import type { PolicyKind } from './versions';

/**
 * 정책 문서는 별도 저장소 chagok-app-policy를 운영 VPS(chagok.novum-lab.com)에 게시한다 (2026-10-29 Netlify에서 옮김. 약관 설계, 2026-09-30 GitHub Pages에서 변경).
 * 약관을 공개하기 전까지는 사이트 첫 화면만 "준비 중"이고 /terms/·/privacy/·versions.json은 404다.
 */
export const POLICY_BASE_URL = 'https://chagok.novum-lab.com';

/** 오늘 시행 중인 판을 보여주는 주소. 판 선택은 사이트가 versions.json으로 한다. */
export const policyUrl = (kind: PolicyKind): string => `${POLICY_BASE_URL}/${kind}/`;

export const POLICY_MANIFEST_URL = `${POLICY_BASE_URL}/versions.json`;
