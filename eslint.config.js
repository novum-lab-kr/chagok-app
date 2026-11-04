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
    // 디자인 시스템은 Storybook에서 혼자 그린다. 앱 데이터 층을 가져다 쓰지 않는다 (AGENTS.md 「코드를 쓰기 전에 찾는 곳」, 2026-11-02)
    files: ['src/design-system/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/domain', '**/domain/*', '**/repositories', '**/repositories/*', '**/app-data', '**/app-data/*', '**/db', '**/db/*', '**/purchases', '**/purchases/*'],
          message: 'src/design-system은 앱 데이터 층을 가져다 쓰지 않는다. 화면(app/)에서 값으로 넘긴다.',
        }],
      }],
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'storybook-static/**',
      '.expo/**',
      '.omc/**',
      // Supabase Edge Function은 Deno에서 돈다. 앱 규칙으로 보지 않는다.
      'supabase/functions/**',
    ],
  },
];
