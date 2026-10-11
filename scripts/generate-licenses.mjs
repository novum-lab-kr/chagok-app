#!/usr/bin/env node
/**
 * 앱 설정 → 오픈소스 라이선스 목록을 만든다 (PRD 4.9).
 *
 * 출시용 JS 번들(iOS·Android)을 소스맵과 함께 만들어, 실제로 번들에 들어간 npm 패키지만 모은다.
 * 빌드·테스트 도구는 번들에 없으니 자연히 빠진다. 각 패키지의 LICENSE 원문을 그대로 싣고,
 * 번들 밖 네이티브 라이브러리(Hermes, React Native가 함께 넣는 C++ 라이브러리)는 scripts/licenses/native.json에서 더한다.
 *
 * 의존성을 더하거나 바꾼 뒤, 그리고 출시 전에 다시 돌린다:
 *   npm run licenses
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'src/policy/oss-licenses.generated.ts');
const LICENSE_FILE = /^(licen[cs]e|copying)(\.(md|txt|markdown))?$/i;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chagok-licenses-'));
try {
  // 번들이 이 파일을 import하므로, 처음 만들 때는 빈 목록으로 먼저 둔다.
  if (!fs.existsSync(out)) write([]);

  execFileSync('npx', ['expo', 'export', '--platform', 'ios', '--platform', 'android', '--source-maps', '--output-dir', tmp], { cwd: root, stdio: 'inherit' });

  /** 번들 소스 경로 → 그 파일이 속한 패키지 폴더 (중첩된 node_modules는 가장 안쪽). */
  const dirs = new Set();
  for (const map of findMaps(tmp)) {
    for (const source of JSON.parse(fs.readFileSync(map, 'utf8')).sources) {
      // 소스 경로의 기준 폴더는 Metro 서버 루트라 실행 위치(worktree 등)에 따라 앞부분이 달라진다. 첫 node_modules부터 잘라 이 프로젝트 기준으로 찾는다.
      const m = source.match(/(node_modules\/.*node_modules\/(?:@[^/]+\/)?[^/]+|node_modules\/(?:@[^/]+\/)?[^/]+)/);
      if (m) dirs.add(path.resolve(root, m[1]));
    }
  }

  // JS를 import하지 않아도 네이티브 코드는 자동 연결로 앱에 들어간다(예: react-native-reanimated). 직접 설치한 것 중 네이티브 폴더가 있는 것을 더한다.
  for (const name of Object.keys(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).dependencies)) {
    const dir = path.join(root, 'node_modules', name);
    if (['ios', 'apple', 'android', 'expo-module.config.json'].some((f) => fs.existsSync(path.join(dir, f)))) dirs.add(dir);
  }

  const byName = new Map();
  const missing = [];
  for (const dir of dirs) {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    const key = `${pkg.name}@${pkg.version}`;
    if (byName.has(key)) continue;
    const file = fs.readdirSync(dir).find((f) => LICENSE_FILE.test(f));
    const fallback = fallbackFor(pkg.name);
    const text = file ? fs.readFileSync(path.join(dir, file), 'utf8').trim()
      : fallback ? fs.readFileSync(path.join(root, 'scripts/licenses/packages', fallback), 'utf8').trim()
      : undefined;
    if (!text) missing.push(key);
    byName.set(key, { name: pkg.name, version: pkg.version, license: licenseOf(pkg), text });
  }
  if (missing.length) {
    // 원문 파일이 없는 패키지는 조용히 넘기지 않는다. 원래 저장소의 LICENSE를 확인해 scripts/licenses/packages.json에 더한다.
    console.error(`LICENSE 파일이 없는 패키지: ${missing.join(', ')}`);
    process.exit(1);
  }

  const nativeDir = path.join(root, 'scripts/licenses/native');
  const native = JSON.parse(fs.readFileSync(path.join(root, 'scripts/licenses/native.json'), 'utf8')).map((n) => {
    const body = fs.readFileSync(path.join(nativeDir, n.file), 'utf8').trim();
    return { name: n.name, version: n.version, license: n.license, text: n.copyright ? `${n.copyright}\n\n${body}` : body };
  });

  const all = [...byName.values(), ...native].sort((a, b) => a.name.localeCompare(b.name, 'en'));
  const multi = new Set(all.filter((e, i) => all.findIndex((o) => o.name === e.name) !== i).map((e) => e.name));
  const entries = all.map((e) => ({
    id: `oss-${e.name}${multi.has(e.name) ? `-${e.version}` : ''}`.replace(/[^a-zA-Z0-9._-]/g, '_'),
    name: multi.has(e.name) ? `${e.name} ${e.version}` : e.name,
    license: e.license,
    text: e.text,
  }));

  write(entries);
  console.log(`${entries.length}개 (번들 ${byName.size} + 네이티브 ${native.length}) → ${path.relative(root, out)}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

function fallbackFor(name) {
  const map = JSON.parse(fs.readFileSync(path.join(root, 'scripts/licenses/packages.json'), 'utf8'));
  return map[name] ?? Object.entries(map).find(([k]) => k.endsWith('/*') && name.startsWith(k.slice(0, -1)))?.[1];
}

function write(entries) {
  fs.writeFileSync(out, `// 자동 생성 파일 — 손으로 고치지 않는다. npm run licenses로 다시 만든다.
import type { LicenseEntry } from './licenses';

export const OSS_LICENSES: readonly LicenseEntry[] = ${JSON.stringify(entries, null, 2)};
`);
}

function findMaps(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? findMaps(p) : p.endsWith('.map') ? [p] : [];
  });
}

function licenseOf(pkg) {
  const l = pkg.license ?? pkg.licenses;
  if (typeof l === 'string') return l;
  if (Array.isArray(l)) return l.map((x) => x.type ?? x).join(' OR ');
  return l?.type ?? 'UNKNOWN';
}
