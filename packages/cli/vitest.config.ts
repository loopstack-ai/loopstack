import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: './src',
    include: ['**/*.spec.ts'],
    // Workspace packages are symlinked, so their dist resolves outside node_modules and vitest would
    // transform it again in every worker. Load it natively, like any other dependency.
    server: { deps: { external: [/\/(packages|registry)\/[^/]+\/dist\//] } },
    // Room for slow first tests (Nest or engine boot) while many packages test in parallel.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Keep rendering output deterministic: picocolors enables ANSI whenever
    // CI is set, so pin colors off regardless of environment.
    env: { NO_COLOR: '1' },
  },
});
