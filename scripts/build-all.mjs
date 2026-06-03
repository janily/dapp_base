import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const apps = ['ethers', 'viem', 'wagmi'];
const rootDist = 'dist';

async function loadRootEnv() {
  const envPath = '.env';
  if (!existsSync(envPath)) return;

  const content = await readFile(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^(['"])(.*)\1$/, '$2');
    process.env[key] ??= value;
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

await loadRootEnv();
await rm(rootDist, { recursive: true, force: true });
await mkdir(rootDist, { recursive: true });
await cp('homepage', rootDist, { recursive: true });

for (const app of apps) {
  run('npm', ['run', 'build', '--workspace', `dapp-base-${app}`]);
  await rm(join(rootDist, app), { recursive: true, force: true });
  await cp(join(app, 'dist'), join(rootDist, app), { recursive: true });
}
