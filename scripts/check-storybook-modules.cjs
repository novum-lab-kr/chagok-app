// Check the actual dev-server ESM graph: a static build can pass while Vite
// serves an unconverted CommonJS dependency that prevents the preview loading.
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const base = process.argv[2] || 'http://127.0.0.1:6006';
const modules = new Map();
function getModule(url) {
  if (!modules.has(url)) {
    modules.set(url, (async () => {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`${response.status}: ${url}`);
      return new vm.SourceTextModule(await response.text(), { identifier: url });
    })());
  }
  return modules.get(url);
}

async function check() {
  const stories = fs.readdirSync(path.resolve(__dirname, '../stories'))
    .filter(name => name.endsWith('.stories.tsx'));
  const roots = [
    '/@id/__x00__virtual:/@storybook/builder-vite/vite-app.js',
    ...stories.map(name => `/stories/${name}`),
  ];
  for (const root of roots) {
    const module = await getModule(new URL(root, base).href);
    if (module.status === 'unlinked') {
      await module.link((specifier, parent) => getModule(new URL(specifier, parent.identifier).href));
    }
    console.log(`LINK OK ${root}`);
  }
  console.log(`${modules.size} modules linked. This checks imports, not browser rendering.`);
}

check().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
