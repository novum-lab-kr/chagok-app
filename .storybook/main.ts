import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import path from 'node:path';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.tsx'],
  addons: [
    '@storybook/addon-docs',
    // 화면 흐름도(stories/flows/AppFlow.mdx가 StoryFlowMap을 직접 쓴다). 자동 배치 문서는 간격이 고정이라
    // 쓰지 않으므로 흐름 데이터는 *.flow.json이 아닌 이름으로 둔다. 기본 글롭은 node_modules까지 훑어서 좁혀 둔다.
    {name: '@zigbang/storybook-addon-story-flow', options: {flowGlob: '../stories/**/*.flow.json'}},
  ],
  staticDirs: [
    { from: '../src/design-system/assets', to: '/fonts' },
    { from: '../docs/design/retro-pocket-v1/revisions/v6/screens', to: '/reference' },
  ],
  async viteFinal(config) {
    return mergeConfig(config, {
      resolve: {
        alias: [
          { find: /^react-native$/, replacement: 'react-native-web' },
          { find: /^react-native-svg$/, replacement: path.resolve('node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js') },
          // 기본 진입점(lib/module)을 타면 네이티브 변형이 잡혀 RN 원본의 Flow 문법에서 죽는다.
          // src를 가리켜야 위 extensions 순서대로 .web.tsx 변형이 선택된다.
          { find: /^react-native-safe-area-context$/, replacement: path.resolve('node_modules/react-native-safe-area-context/src/index.tsx') },
        ],
        extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
      },
      define: { __DEV__: true, 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development') },
      server: { watch: { usePolling: true, interval: 1000, ignored: ['**/storybook-static/**'] } },
      // SVG contains CommonJS modules even in its module build. Prebundle the
      // web entry so the browser receives valid ESM and never native bindings.
      optimizeDeps: {
        include: ['react-native-web', 'react-native-svg'],
        esbuildOptions: { resolveExtensions: ['.web.js', '.web.ts', '.web.tsx', '.js', '.ts', '.tsx', '.json'] },
      },
    });
  },
};
export default config;
