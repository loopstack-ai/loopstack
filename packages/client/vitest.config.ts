import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: './src',
    include: ['**/*.spec.ts'],
    // Room for slow first tests (Nest or engine boot) while many packages test in parallel.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
