#!/usr/bin/env node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function getLatestReleaseTag(packageName: string): Promise<string> {
  const prefix = `@loopstack/${packageName}@`;

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
  let templateName = 'app-bundle-template';
  let tag: string | undefined;
  let skipStudio = false;

  for (const arg of args) {
    if (arg.startsWith('--template=')) {
      templateName = arg.split('=')[1];
    } else if (arg.startsWith('--tag=')) {
      tag = arg.split('=')[1];
    } else if (arg === '--skip-studio') {
      skipStudio = true;
    } else if (!arg.startsWith('--')) {
      appName = arg;
    }
  }

  if (!appName) {
    console.error('❌ Please provide a project name.');
    console.error('\nUsage: create-loopstack-app <app-name> [options]');
    console.error('\nOptions:');
    console.error('  --template=<name>    Template to use (default: app-bundle-template)');
    console.error('  --tag=<tag>          Git tag/branch to use (default: latest release)');
    console.error('  --skip-studio        Skip Loopstack Studio installation');
    console.error('\nExamples:');
    console.error('  create-loopstack-app my-app');
    console.error('  create-loopstack-app my-app --skip-studio');
    console.error('  create-loopstack-app my-app --tag=@loopstack/app-bundle-template@1.0.0');
    process.exit(1);
  }

  console.log(`Creating Loopstack app: ${appName}`);
  console.log(`Using template: ${templateName}`);

  if (!tag) {
    try {
      console.log('Fetching latest release...');
      tag = await getLatestReleaseTag(templateName);
      console.log(`Found latest release: ${tag}`);
    } catch {
      console.error('⚠️  Could not fetch latest release, falling back to main branch');
      tag = 'main';
    }
  }

  // Clone the bundle template (includes backend, package.json, README, docker-compose)
  const templateSource = `github:loopstack-ai/loopstack/templates/${templateName}#${tag}`;
  console.log(`\nCloning template from: ${templateSource}`);

  try {
    execSync(`npx giget@latest ${templateSource} ${appName} --force`, {
      stdio: 'inherit',
    });
  } catch {
    console.error(`❌ Error: Could not clone template "${templateName}" with tag "${tag}"`);
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

  // Handle .env file for backend
  const envDefaultPath = path.join(projectRoot, 'backend', '.env.default');
  const envPath = path.join(projectRoot, 'backend', '.env');

  if (fs.existsSync(envDefaultPath)) {
    console.log('Creating backend .env file from .env.default...');
    fs.copyFileSync(envDefaultPath, envPath);
  }

  if (!skipStudio) {
    const studioPath = path.join(projectRoot, 'studio');
    const studioSource = `github:loopstack-ai/loopstack/frontend/loopstack-studio#${tag}`;
    console.log(`\nCloning Loopstack Studio from: ${studioSource}`);

    try {
      execSync(`npx giget@latest ${studioSource} ${studioPath} --force`, {
        stdio: 'inherit',
      });

      console.log('✓ Loopstack Studio added successfully');
    } catch {
      console.error('⚠️  Warning: Could not clone Loopstack Studio, continuing with backend only');
    }
  } else {
    console.log('\n⊘ Skipping Loopstack Studio installation');
  }

  // Install root dependencies
  console.log('\nInstalling dependencies...');
  execSync('npm run install:all', { stdio: 'inherit' });

  // Return to project root
  process.chdir(projectRoot);

  console.log('\n✅ Loopstack project created successfully!\n');
  console.log('─'.repeat(50));

  console.log('\nLoopstack Studio: http://localhost:5173');
  console.log('Backend API:      http://localhost:8000');

  console.log('\nStart:');
  console.log(`   cd ${appName} && npm run start`);
  console.log('─'.repeat(50));
}

void main();
