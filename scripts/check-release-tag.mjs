import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { getDistTag } from './release-tag.mjs';

test('stable versions publish to latest and prereleases only to next', () => {
  assert.equal(getDistTag('2.0.0', 'v2.0.0'), 'latest');
  for (const version of ['2.0.0-rc.1', '2.0.0-beta.2', '2.0.0-alpha']) {
    assert.equal(getDistTag(version, `v${version}`), 'next');
  }
});
test('mismatched tags cannot publish stale package versions', () => {
  assert.throws(() => getDistTag('1.2.0', 'v2.0.0-rc.1'), /exactly match/);
  assert.throws(() => getDistTag('2.0.0-rc.1', 'v2.0.0'), /exactly match/);
  assert.throws(() => getDistTag('2.0.0', 'development'), /exactly match/);
});
test('invalid and ambiguous versions fail closed', () => {
  for (const version of ['02.0.0', '2.0', '2.0.0-', '2.0.0-rc..1', '2.0.0-01', '2.0.0+build.1', '2.0.0\n']) {
    assert.throws(() => getDistTag(version, `v${version}`));
  }
});
test('the workflow CLI writes the computed distribution tag', () => {
  const temp = mkdtempSync(join(tmpdir(), 'zenon-release-'));
  try {
    writeFileSync(join(temp, 'package.json'), JSON.stringify({ version: '2.0.0-rc.1' }));
    const output = join(temp, 'output');
    execFileSync(process.execPath, [resolve('scripts/release-tag.mjs')], {
      cwd: temp, env: { ...process.env, GITHUB_REF_NAME: 'v2.0.0-rc.1', GITHUB_OUTPUT: output },
    });
    assert.equal(readFileSync(output, 'utf8'), 'dist_tag=next\n');
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
