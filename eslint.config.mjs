import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier/recommended';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'eslint.config.mjs',
      'prettier.config.mjs',
      '**/src/components/ai-elements/**',
      '**/vitest.config.ts',
      '**/vite.config.ts',
      'apps/**',
      'registry/**',
      'workspace/**',
    ],
  },

  // Base config for all files
  js.configs.recommended,
  prettier,

  // TypeScript config with type-checked rules (scoped to TS files only)
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Disabled
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // Type-aware rules
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  },

  // Backend (NestJS) - Node globals
  {
    files: ['packages/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },

  // Frontend (React/Vite) - Browser globals + React plugins
  {
    files: ['frontend/**/*.{ts,tsx}'],
    extends: [reactHooks.configs['recommended-latest'], reactRefresh.configs.vite],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  {
    files: ['cli/**/*.js'],
    languageOptions: {
      globals: globals.node,
      sourceType: 'commonjs',
    },
    rules: {
      // Disable TS-specific rules for plain JS
    },
  },
);
