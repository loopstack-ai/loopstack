import * as path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['setupTests.ts'],
    passWithNoTests: true,
    // Above the 5s async budget in setupTests, so a slow assertion reports what it was waiting for
    // instead of being cut off mid-wait by the test timeout.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
