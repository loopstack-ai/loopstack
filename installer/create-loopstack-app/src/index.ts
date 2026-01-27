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
  let templateName = 'app-template';
  let tag: string | undefined;

  for (const arg of args) {
    if (arg.startsWith('--template=')) {
      templateName = arg.split('=')[1];
    } else if (arg.startsWith('--tag=')) {
      tag = arg.split('=')[1];
    } else if (!arg.startsWith('--')) {
      appName = arg;
    }
  }

  if (!appName) {
    console.error('❌ Please provide a project name.');
    console.error('\nUsage: create-loopstack-app <app-name> [options]');
    console.error('\nOptions:');
    console.error('  --template=<name>    Template to use (default: app-template)');
    console.error('  --tag=<tag>          Git tag/branch to use (default: latest release)');
    console.error('\nExamples:');
    console.error('  create-loopstack-app my-app');
    console.error('  create-loopstack-app my-app --template=custom-template');
    console.error('  create-loopstack-app my-app --tag=@loopstack/app-template@1.0.0');
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

  const templateSource = `github:loopstack-ai/loopstack/templates/${templateName}#${tag}`;
  console.log(`Cloning from: ${templateSource}`);

  try {
    execSync(`npx giget@latest ${templateSource} ${appName} --force`, {
      stdio: 'inherit',
    });
  } catch {
    console.error(`❌ Error: Could not clone template "${templateName}" with tag "${tag}"`);
    console.error('Please verify that the template name and tag are correct.');
    process.exit(1);
  }

  process.chdir(appName);

  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as Record<string, unknown>;
  packageJson.name = appName;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  const envDefaultPath = path.join(process.cwd(), '.env.default');
  const envPath = path.join(process.cwd(), '.env');

  if (fs.existsSync(envDefaultPath)) {
    console.log('Creating .env file from .env.default...');
    fs.copyFileSync(envDefaultPath, envPath);
  } else {
    console.warn('⚠️  Warning: .env.default not found, skipping .env creation');
  }

  console.log('Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  console.log('\nLoopstack project created successfully!\n');
  console.log('Next steps to get started:');
  console.log(`   1. cd ${appName}`);
  console.log('   2. docker compose up -d');
  console.log('   3. npm run start:dev');
  console.log('─'.repeat(50));
}

void main();
