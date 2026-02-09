#!/usr/bin/env node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function getLatestReleaseTag(packageName: string): Promise<string> {
  const prefix = `${packageName}@`;

  const response = await fetch('https://api.github.com/repos/loopstack-ai/loopstack/releases');

  if (!response.ok) {
    throw new Error('Failed to fetch releases');
  }

  const releases = (await response.json()) as Array<{
    tag_name: string;
    prerelease: boolean;
    draft: boolean;
  }>;

  const latest = releases.find((r) => !r.prerelease && !r.draft && r.tag_name.startsWith(prefix));

  if (!latest) {
    throw new Error(`No release found for ${packageName}`);
  }

  return latest.tag_name;
}

async function main() {
  const args = process.argv.slice(2);
  let appName: string | undefined;
  const bundleTemplateName = '@loopstack/app-bundle-template';
  let tag: string | undefined;

  for (const arg of args) {
    if (arg.startsWith('--tag=')) {
      tag = arg.split('=')[1];
    } else if (!arg.startsWith('--')) {
      appName = arg;
    }
  }

  if (!appName) {
    console.error('❌ Please provide a project name.');
    console.error('\nUsage: create-loopstack-app <app-name> [options]');
    console.error('\nOptions:');
    console.error('  --tag=<tag>          Git tag/branch to use (default: latest release)');
    console.error('\nExamples:');
    console.error('  create-loopstack-app my-app');
    console.error('  create-loopstack-app my-app --tag=@loopstack/app-bundle-template@1.0.0');
    process.exit(1);
  }

  console.log(`Creating Loopstack app: ${appName}`);

  if (!tag) {
    try {
      console.log('Fetching latest release...');
      tag = await getLatestReleaseTag(bundleTemplateName);
      console.log(`Found latest release: ${tag}`);
    } catch {
      console.error('⚠️  Could not fetch latest release, falling back to main branch');
      tag = 'main';
    }
  }

  const bundleSource = `github:loopstack-ai/loopstack/templates/app-bundle-template#${tag}`;
  console.log(`\nCloning bundle template from: ${bundleSource}`);

  try {
    execSync(`npx giget@latest ${bundleSource} ${appName} --force`, {
      stdio: 'inherit',
    });
  } catch {
    console.error(`❌ Error: Could not clone bundle template "${bundleTemplateName}" with tag "${tag}"`);
    console.error('Please verify that the template name and tag are correct.');
    process.exit(1);
  }

  const projectRoot = path.resolve(appName);
  process.chdir(projectRoot);

  // Update root package.json with project name
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as Record<string, unknown>;
  packageJson.name = appName;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  console.log('\nSetting up project...');
  execSync('npm run setup', { stdio: 'inherit' });

  // Install root dependencies
  console.log('\nInstalling dependencies...');
  execSync('npm run install:all', { stdio: 'inherit' });

  // Return to project root
  process.chdir(projectRoot);

  console.log('\n✅ Loopstack project created successfully!\n');
  console.log('─'.repeat(50));

  console.log(`\nStart:            👉 cd ${appName} && npm run start`);
  console.log('\nLoopstack Studio: http://localhost:5173');
  console.log('Backend API:      http://localhost:8000');

  console.log('─'.repeat(50));
}

void main();
