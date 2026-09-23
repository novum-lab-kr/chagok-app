import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({
  plugins:[react()],
  resolve:{alias:[{find:/^react-native$/,replacement:'react-native-web'},{find:/^react-native-svg$/,replacement:path.resolve('node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js')}],extensions:['.web.tsx','.web.ts','.web.jsx','.web.js','.tsx','.ts','.jsx','.js','.json']},
  define:{__DEV__:true},
  test:{environment:'jsdom',include:['src/design-system/**/*.test.tsx'],globals:false,server:{deps:{inline:['react-native-svg']}}},
});
