// Runs every package's tests through turbo with a bounded process count. turbo runs one task per core,
// and each vitest run gets a small worker pool instead of one worker per core, so the total stays near
// the core count. Set VITEST_MAX_WORKERS to override the per-package pool.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const turbo = createRequire(import.meta.url).resolve('turbo/bin/turbo');

const result = spawnSync(
  process.execPath,
  [turbo, 'run', 'test', '--continue', '--concurrency=100%', '--filter=!./sandbox/*', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: { ...process.env, VITEST_MAX_WORKERS: process.env.VITEST_MAX_WORKERS ?? '2' },
  },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
