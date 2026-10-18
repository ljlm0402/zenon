import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Exercise the actual tarball in an isolated consumer, including NodeNext types.
const root = resolve('.');
const temp = mkdtempSync(join(tmpdir(), 'zenon-package-'));
const vueVersion = process.env.ZENON_TEST_VUE_VERSION;
try {
  if (vueVersion) {
    assert.match(vueVersion, /^\d+\.\d+\.\d+$/, 'Use an exact stable Vue version for reproducible compatibility checks');
    writeFileSync(join(temp, 'package.json'), JSON.stringify({ private: true }));
    execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--cache', join(temp, 'cache'), `vue@${vueVersion}`, `@vue/server-renderer@${vueVersion}`], { cwd: temp, stdio: 'pipe' });
    assert.equal(JSON.parse(readFileSync(join(temp, 'node_modules/vue/package.json'), 'utf8')).version, vueVersion);
  }
  execFileSync('npm', ['pack', '--ignore-scripts', '--cache', join(temp, 'cache'), '--pack-destination', temp], { cwd: root, stdio: 'pipe' });
  const archives = readdirSync(temp).filter(name => name.endsWith('.tgz'));
  assert.equal(archives.length, 1);
  const modules = join(temp, 'node_modules');
  const packageDir = join(modules, 'zenon');
  mkdirSync(packageDir, { recursive: true });
  execFileSync('tar', ['-xzf', join(temp, archives[0]), '-C', packageDir, '--strip-components=1']);
  if (!vueVersion) {
    symlinkSync(realpathSync(join(root, 'node_modules/vue')), join(modules, 'vue'), 'dir');
    mkdirSync(join(modules, '@vue'), { recursive: true });
    symlinkSync(realpathSync(join(root, 'node_modules/@vue/server-renderer')), join(modules, '@vue/server-renderer'), 'dir');
  }
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
    lines.push(mode === 'mjs' ? `import * as vue from 'vue'; import { renderToString } from '@vue/server-renderer';` : `const vue = require('vue'); const { renderToString } = require('@vue/server-renderer');`);
    lines.push(
      `const context = module0.createStoreContext(count => module0.createStore(() => ({ count })), 'PackCounter');`,
      `const app = vue.createSSRApp({ setup() { const value = context.useStore(); return () => vue.h('span', String(value.count)); } });`,
      `context.provideTo(app, 42);`,
      `renderToString(app).then(html => { if (html !== '<span>42</span>') throw new Error('Packed SSR context failed'); }).catch(error => { console.error(error); process.exitCode = 1; });`
    );
    const file = join(temp, `consumer.${mode}`);
    writeFileSync(file, lines.join('\n'));
    execFileSync(process.execPath, [file], { stdio: 'pipe' });
  }
  const source = `import { createStore, createStoreContext, compose, type Store, type StoreContext } from 'zenon';
import { withPersist, withErrorBoundary, type PersistController, type PersistStatus } from 'zenon/plugins';
import { compose as subpathCompose } from 'zenon/utils/compose';
type State = { count: number; increment: () => void };
const store: Store<State> = createStore(compose<State>(withPersist<State>('test'))((set, get, api) => ({ count: 0, increment: () => api.setSilent({count: get().count + 1}) })));
store.getState().count.toFixed();
// @ts-expect-error invalid patch must be rejected
store.setSilent({ count: 'bad' });
subpathCompose<State>();
const context = createStoreContext((count: number) => createStore(() => ({ count })), 'Counter');
const count: number = context.useStore().count;
// @ts-expect-error provider arguments retain the factory types
context.provideStore('bad');
// @ts-expect-error state fields retain their declared types
context.useStore().count = 'bad';
createStoreContext(() => createStore(() => ({count: 0}))).provideStore();
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
  const testedVue = JSON.parse(readFileSync(join(modules, 'vue/package.json'), 'utf8')).version;
  console.log(`Packed ESM/CJS entrypoints, subpaths, SSR runtime and NodeNext types passed (Vue ${testedVue}, Node ${process.version}).`);
} catch (error) {
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  throw error;
} finally {
  rmSync(temp, { recursive: true, force: true });
}
