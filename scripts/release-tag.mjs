import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function getDistTag(version, ref) {
  if (typeof version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?$/.test(version)) {
    throw new Error('Expected a semantic release version without build metadata');
  }
  if (ref !== `v${version}`) throw new Error('Git tag must exactly match package.json version');
  return version.includes('-') ? 'next' : 'latest';
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
  const tag = getDistTag(version, process.env.GITHUB_REF_NAME);
  if (!process.env.GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT is required');
  appendFileSync(process.env.GITHUB_OUTPUT, `dist_tag=${tag}\n`);
}
