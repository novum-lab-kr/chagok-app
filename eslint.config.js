// Expo SDK 57 기준 flat config. react-hooks 규칙이 목적이다.
// `app/index.tsx`에서 훅이 조건부 return 아래에 있어 실기기에서만 터진 적이 있다
// (docs/HANDOFF.md 7-1 참고). 그 부류를 저장 시점에 잡는다.
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    // 빌드 스크립트는 CommonJS다. Node 전역을 모르면 __dirname이 no-undef로 잡힌다.
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { __dirname: 'readonly', __filename: 'readonly', require: 'readonly', module: 'writable', process: 'readonly' },
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'storybook-static/**',
      '.expo/**',
      '.omc/**',
    ],
  },
];
