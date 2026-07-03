import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier/recommended';
// import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '.changeset',
      '.turbo',
      'node_modules',
      'templates',
      '**/.turbo/**',
      '**/dist/**',
      '**/node_modules/**',
      'eslint.config.mjs',
      'prettier.config.mjs',
      'syncpack.config.mjs',
      '**/src/components/ai-elements/**',
      '**/vitest.config.ts',
      '**/vite.config.ts',
      '**/__backup__/**',
      '**/.next/**',
      '**/build/**',
      '**/coverage/**',
      '**/.vite/**',
      '**/*.min.js',
    ],
  },

  // Base config for all files
  js.configs.recommended,
  prettier,

  // TypeScript config — non-type-checked base + targeted type-aware rules
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Disabled
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },

  // Backend (NestJS) - Node globals
  {
    files: ['packages/**/*.ts', 'registry/**/*.ts', 'sandbox/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      // Allow unused vars with underscore prefix
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // Node scripts (plain ESM, no TypeScript)
  {
    files: ['packages/*/scripts/**/*.mjs', 'sandbox/*/scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Boundary: @loopstack/client is a headless SDK — it must run in bare Node
  {
    files: ['packages/client/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*', '@tanstack/react-query'],
              message: '@loopstack/client must stay React-free — presentation adapters belong in @loopstack/react.',
            },
          ],
        },
      ],
    },
  },

  // Boundary: @loopstack/contracts is shared with browser clients
  {
    files: ['packages/contracts/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@nestjs/*', 'class-validator', 'class-transformer', 'typeorm', 'reflect-metadata'],
              message: '@loopstack/contracts must stay free of server-only dependencies.',
            },
          ],
        },
      ],
    },
  },

  // Test files (NestJS) - Relaxed rules for test flexibility
  {
    files: [
      'packages/**/*.spec.ts',
      'packages/**/*.test.ts',
      'packages/**/__tests__/**/*.ts',
      'registry/**/*.spec.ts',
      'registry/**/*.test.ts',
      'registry/**/__tests__/**/*.ts',
    ],
    rules: {
      // Allow non-null assertions in tests
      '@typescript-eslint/no-non-null-assertion': 'off',

      // Allow empty functions (useful for mock implementations)
      '@typescript-eslint/no-empty-function': 'off',

      // Allow require imports (sometimes needed for mocking)
      '@typescript-eslint/no-require-imports': 'off',

      // Relax promise handling for test assertions
      '@typescript-eslint/no-floating-promises': 'off',

      // Allow unused vars with underscore prefix (common for destructuring in tests)
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // Frontend (React/Vite) - Browser globals + React plugins
  {
    files: ['frontend/**/*.{ts,tsx}'],
    plugins: {
      // 'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',
    },
  },
);
