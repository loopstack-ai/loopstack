export default {
  // Formatting
  printWidth: 120,
  singleQuote: true,
  trailingComma: 'all',
  semi: true,
  tabWidth: 2,
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',

  // Import sorting
  plugins: ['@trivago/prettier-plugin-sort-imports'],
  importOrder: [
    '<THIRD_PARTY_MODULES>',
    '^@loopstack/(.*)$',
    '^@/(.*)$',
    '^[./]',
  ],
  importOrderSortSpecifiers: true,
  importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
};