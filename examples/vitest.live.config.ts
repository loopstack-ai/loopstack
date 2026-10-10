import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * Live-LLM check-ups: real provider calls, structural assertions, run on demand
 * (`npm run test:live`) after prompt or model changes — never in the PR gate.
 * Requires provider credentials (e.g. ANTHROPIC_API_KEY) in the environment.
 */
export default defineConfig({
  test: {
    root: './src',
    include: ['**/*.live.spec.ts'],
    testTimeout: 120_000,
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
