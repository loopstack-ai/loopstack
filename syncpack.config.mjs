/** @type {import("syncpack").RcFile} */
export default {
  formatRepository: false,

  // Local packages should use workspace protocol
  semverGroups: [
    {
      label: 'Local packages use workspace protocol',
      packages: ['**'],
      dependencies: ['@loopstack/**'],
      dependencyTypes: ['prod', 'dev', 'peer'],
      policy: 'workspace',
    },
  ],

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
  source: ['package.json', 'packages/*/package.json', 'frontend/*/package.json', 'templates/*/package.json'],

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
