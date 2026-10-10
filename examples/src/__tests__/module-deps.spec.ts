import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every module directory is meant to be copied into another app, so its README has to name the
 * `@loopstack/*` packages that copy needs. The list is derived from the module's imports, and this
 * check fails when a module gains or loses an import without its README following.
 */
describe('module READMEs', () => {
  it('declare the dependencies their module imports', () => {
    const script = join(__dirname, '..', '..', 'scripts', 'sync-module-deps.mjs');
    const result = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf-8' });

    expect(result.stderr.trim()).toBe('');
    expect(result.status).toBe(0);
  });
});
