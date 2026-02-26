#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findPackageJson() {
  let dir = process.cwd();
  const root = path.parse(dir).root;

  while (dir !== root) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }

  return null;
}

const projectRoot = findPackageJson();

if (!projectRoot) {
  console.error('ERROR: No package.json found');
  process.exit(1);
}

const result = spawnSync('npm', ['run', 'loopstack', '--', ...process.argv.slice(2)], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
});

process.exit(result.status || 0);
