import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: './src',
    include: ['**/*.spec.ts'],
    // Room for slow first tests (Nest or engine boot) while many packages test in parallel.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Live-LLM check-ups run on demand via `npm run test:live` — never in the default gate.
    exclude: ['**/*.live.spec.ts', '**/node_modules/**'],
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
