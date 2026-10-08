import js from '@eslint/js';
import importX, { createNodeResolver } from 'eslint-plugin-import-x';
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
      'packages/cli/fixtures/**',
      'website/**',
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

  // Node scripts (plain ESM, no TypeScript). Every .mjs in this repo is a Node script; the config
  // files at the root are excluded by the global ignores above.
  {
    files: ['**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Node scripts written as CommonJS — `require`, `__dirname` and `module` are globals here
  {
    files: ['**/*.cjs', 'scripts/**/*.js', 'packages/*/scripts/**/*.js', 'sandbox/*/scripts/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
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

  // Boundary: @loopstack/cli talks HTTP via @loopstack/client only
  {
    files: ['packages/cli/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@nestjs/*', 'typeorm', 'reflect-metadata', 'axios', 'react', 'react-dom'],
              message: '@loopstack/cli must stay a thin terminal layer over @loopstack/client.',
            },
          ],
        },
      ],
    },
  },

  // Boundary: @loopstack/react is a browser-side adapter — no server-only dependencies
  {
    files: ['packages/react/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@nestjs/*', 'class-validator', 'class-transformer', 'typeorm', 'reflect-metadata'],
              message: '@loopstack/react must stay free of server-only dependencies.',
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

  // Every import must be declared in the importing package's own package.json — the workspace
  // hoists everything to the root node_modules, so an undeclared import resolves here but breaks consumers
  // whose installs don't hoist. Type-only imports count too: they end up in the published .d.ts files.
  // devDependencies are allowed only in test code.
  {
    files: ['packages/*/src/**/*.{ts,tsx}', 'registry/*/*/src/**/*.ts', 'frontend/*/src/**/*.{ts,tsx}'],
    plugins: { 'import-x': importX },
    settings: {
      // Resolve as Node does at runtime: packages such as typeorm export only under the `node` condition,
      // and the rule skips an import it cannot resolve instead of reporting it.
      'import-x/resolver-next': [createNodeResolver({ conditionNames: ['node', 'import', 'require', 'default'] })],
    },
    rules: {
      'import-x/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/*.spec.{ts,tsx}',
            '**/*.test.{ts,tsx}',
            '**/__tests__/**',
            '**/test-utils/**',
            '**/setupTests.ts',
            'packages/react/src/testing/**',
          ],
          includeInternal: true,
          includeTypes: true,
        },
      ],
    },
  },

  // Studio's library build bundles every import its vite config doesn't mark external into dist, so a
  // bundled package is rightly a devDependency.
  {
    files: ['frontend/studio/src/**/*.{ts,tsx}'],
    rules: {
      'import-x/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: ['**/*.spec.{ts,tsx}', '**/*.test.{ts,tsx}', '**/__tests__/**', '**/test-utils/**'],
          includeInternal: true,
          includeTypes: true,
          whitelist: ['@dagrejs/dagre'],
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
