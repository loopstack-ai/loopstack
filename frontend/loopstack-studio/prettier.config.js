export default {
  plugins: ['@trivago/prettier-plugin-sort-imports', 'prettier-plugin-tailwindcss'],
  importOrder: [
    '^react', // React first
    '<THIRD_PARTY_MODULES>', // Imports not matched by other special phrases
    '^@loopstack/(.*)$', // Internal packages
    '^@/(.*)$', // Path aliases
    '^[./]', // Relative imports
  ],
  importOrderSortSpecifiers: true,
  importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
  printWidth: 120,
  singleQuote: true,
  trailingComma: 'all',
  semi: true,
  tabWidth: 2,
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
};
