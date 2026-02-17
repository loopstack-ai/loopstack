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
      '**/dist/**',
      '**/node_modules/**',
      'eslint.config.mjs',
      'prettier.config.mjs',
      'syncpack.config.mjs',
      '**/src/components/ai-elements/**',
      '**/vitest.config.ts',
      '**/vite.config.ts',
      '**/__backup__/**',
      'scripts/**',
      'apps/**',
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
    files: ['packages/**/*.ts', 'registry/**/*.ts'],
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
      // Allow any types in tests for mocking flexibility
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',

      // Allow unbound methods (common in Jest spies/mocks)
      '@typescript-eslint/unbound-method': 'off',

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
