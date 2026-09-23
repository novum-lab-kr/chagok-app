import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import path from 'node:path';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../stories/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs'],
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
