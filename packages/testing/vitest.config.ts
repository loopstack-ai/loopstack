import swc from 'unplugin-swc';
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
    passWithNoTests: true,
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: 'es2023',
      },
    }),
  ],
});
