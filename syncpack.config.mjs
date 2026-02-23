/** @type {import("syncpack").RcFile} */
export default {
  formatRepository: false,

  // Version groups to enforce consistency
  versionGroups: [
    {
      label: 'Ignore local packages for version matching',
      packages: ['**'],
      dependencies: ['@loopstack/**'],
      isIgnored: true,
    },
  ],

  // Where to find package.json files
  source: [
    'package.json',
    'packages/*/package.json',
    'frontend/*/package.json',
    'templates/*/package.json',
    'platform/*/package.json',
    'registry/*/*/package.json',
  ],

  // Sort package.json keys
  sortFirst: [
    'name',
    'displayName',
    'description',
    'keywords',
    'version',
    'repository',
    'private',
    'license',
    'author',
    'main',
    'module',
    'types',
    'exports',
    'scripts',
    'dependencies',
    'devDependencies',
    'peerDependencies',
  ],
};
