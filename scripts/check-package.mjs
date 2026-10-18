import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Exercise the actual tarball in an isolated consumer, including NodeNext types.
const root = resolve('.');
const temp = mkdtempSync(join(tmpdir(), 'zenon-package-'));
try {
  execFileSync('npm', ['pack', '--ignore-scripts', '--cache', join(temp, 'cache'), '--pack-destination', temp], { cwd: root, stdio: 'pipe' });
  const archives = readdirSync(temp).filter(name => name.endsWith('.tgz'));
  assert.equal(archives.length, 1);
  const modules = join(temp, 'node_modules');
  const packageDir = join(modules, 'zenon');
  mkdirSync(packageDir, { recursive: true });
  execFileSync('tar', ['-xzf', join(temp, archives[0]), '-C', packageDir, '--strip-components=1']);
  symlinkSync(realpathSync(join(root, 'node_modules/vue')), join(modules, 'vue'), 'dir');
  const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
  assert.equal(manifest.name, 'zenon');
  for (const mode of ['mjs', 'cjs']) {
    const lines = Object.keys(manifest.exports).map((key, index) => {
      const specifier = key === '.' ? 'zenon' : `zenon/${key.slice(2)}`;
      return mode === 'mjs' ? `import * as module${index} from '${specifier}';` : `const module${index} = require('${specifier}');`;
    });
    lines.push(`const store = module0.createStore((set, get) => ({ count: 0, increment: () => set({ count: get().count + 1 }, 'increment') }));`,
      `store.increment(); if (store.count !== 1) throw new Error('Runtime smoke test failed');`,
      `const ssr = module0.createStore(module1.withPersist('ssr')(() => ({count: 2}))); if (ssr.count !== 2) throw new Error('SSR persistence failed');`,
      `if (typeof module1.withPersist !== 'function' || typeof module2.compose !== 'function') throw new Error('Missing subpath export');`);
    lines.push(
      `const data = new Map([['state', '{"oldCount":4,"__version":1}']]);`,
      `const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };`,
      `let controller;`,
      `const migrated = module0.createStore(module1.withPersist('state', { storage, version: 2, migrate: old => ({ count: old.oldCount }), onReady: value => { controller = value; } })(() => ({ count: 0 })));`,
      `if (migrated.count !== 4 || !data.has('state:zenon:backup') || controller.getStatus().status !== 'ready') throw new Error('Packed migration failed');`
    );
    const file = join(temp, `consumer.${mode}`);
    writeFileSync(file, lines.join('\n'));
    execFileSync(process.execPath, [file], { stdio: 'pipe' });
  }
  const source = `import { createStore, compose, type Store } from 'zenon';
import { withPersist, withErrorBoundary, type PersistController, type PersistStatus } from 'zenon/plugins';
import { compose as subpathCompose } from 'zenon/utils/compose';
type State = { count: number; increment: () => void };
const store: Store<State> = createStore(compose<State>(withPersist<State>('test'))((set, get, api) => ({ count: 0, increment: () => api.setSilent({count: get().count + 1}) })));
store.getState().count.toFixed();
// @ts-expect-error invalid patch must be rejected
store.setSilent({ count: 'bad' });
subpathCompose<State>();
withPersist<State>('migration', {
  version: 2,
  migrate: (old, version) => ({ count: Number(old.count) }),
  onReady(controller: PersistController) {
    const status: Readonly<PersistStatus> = controller.getStatus();
    const recovered: boolean = controller.rehydrate();
    const saved: boolean = controller.retryPersist();
  },
});
withPersist<State>('invalid', {
  // @ts-expect-error migrations must be synchronous
  migrate: async () => ({ count: 1 }),
});
type Results = { read: () => number; load: () => Promise<number> };
const handled = createStore(withErrorBoundary<Results>({ onError() {}, rethrow: false })(() => ({read: () => 1, load: async () => 1})));
const maybe: number | undefined = handled.read();
// @ts-expect-error handled failure may return undefined
const definite: number = handled.read();
// @ts-expect-error async failure may resolve undefined
const promised: Promise<number> = handled.load();
`;
  for (const extension of ['mts', 'cts']) writeFileSync(join(temp, `types.${extension}`), source);
  execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--skipLibCheck', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', join(temp, 'types.mts'), join(temp, 'types.cts')], { stdio: 'pipe' });
  console.log('Packed ESM/CJS entrypoints, subpaths, SSR runtime and NodeNext types passed.');
} catch (error) {
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  throw error;
} finally {
  rmSync(temp, { recursive: true, force: true });
}
