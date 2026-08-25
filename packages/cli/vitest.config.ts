import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: './src',
    include: ['**/*.spec.ts'],
    // Keep rendering output deterministic: picocolors enables ANSI whenever
    // CI is set, so pin colors off regardless of environment.
    env: { NO_COLOR: '1' },
  },
});
