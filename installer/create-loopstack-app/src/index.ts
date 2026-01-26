#!/usr/bin/env node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Parse arguments
const args = process.argv.slice(2);
let appName: string | undefined;
let templateName: string = '@loopstack/app-template';
let tag: string = 'main';

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
  console.error('  --template=<name>    Template to use (default: @loopstack/app-template)');
  console.error('  --tag=<tag>          Git tag/branch to use (default: latest)');
  console.error('\nExamples:');
  console.error('  create-loopstack-app my-app');
  console.error('  create-loopstack-app my-app --template=@loopstack/custom-template');
  console.error('  create-loopstack-app my-app --tag=v1.0.0');
  process.exit(1);
}

console.log(`Creating Loopstack app: ${appName}`);
console.log(`Using template: ${templateName}`);
console.log(`Using tag: ${tag}`);

const templateSource = `github:loopstack-ai/loopstack/templates/${templateName}#${tag}`;
console.log(`Cloning from: ${templateSource}`);

try {
  execSync(`npx giget@latest ${templateSource} ${appName} --force`, { stdio: 'inherit' });
} catch {
  console.error(`❌ Error: Could not clone template "${templateName}" with tag "${tag}"`);
  console.error('Please verify that the template name and tag are correct.');
  process.exit(1);
}

process.chdir(appName);

// Update package json
const packageJsonPath: string = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as Record<string, unknown>;
packageJson.name = appName;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

// Copy .env.default to .env
const envDefaultPath: string = path.join(process.cwd(), '.env.default');
const envPath: string = path.join(process.cwd(), '.env');

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
