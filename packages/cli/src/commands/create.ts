import type { Command } from 'commander';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';
import { CliError } from '../errors.js';
import { printData, printStatus } from '../output/format.js';

/** Ships at the package root, next to dist/ — see package.json "files". */
const FIXTURES_DIR = fileURLToPath(new URL('../../fixtures/app', import.meta.url));

const LOOPSTACK_DEPENDENCIES = ['@loopstack/loopstack-module', '@loopstack/common', 'zod'];

function run(label: string, command: string, args: string[], cwd: string): void {
  printStatus(pc.dim(`▸ ${label}`));
  // Child output goes to stderr — stdout stays reserved for data.
  const result = spawnSync(command, args, { cwd, stdio: ['ignore', 2, 2] });
  if (result.error) throw new CliError(`${label} failed: ${result.error.message}`);
  if (result.status !== 0) throw new CliError(`${label} failed (exit ${result.status ?? 'unknown'})`);
}

function overlayFixtures(targetDir: string): void {
  fs.cpSync(FIXTURES_DIR, targetDir, { recursive: true });
  // Shipped without the dot so npm packs it; the scaffold gets both the
  // example and a ready-to-edit copy.
  const example = path.join(targetDir, 'env.example');
  fs.copyFileSync(example, path.join(targetDir, '.env'));
  fs.renameSync(example, path.join(targetDir, '.env.example'));
}

function addDependencies(targetDir: string): void {
  const pkgPath = path.join(targetDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  pkg.dependencies ??= {};
  for (const name of LOOPSTACK_DEPENDENCIES) {
    pkg.dependencies[name] = 'latest';
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

export function registerCreateCommand(program: Command): void {
  program
    .command('create')
    .description('Scaffold a new Loopstack app (NestJS + LoopstackModule + a hello workflow)')
    .argument('<dir>', 'target directory — its basename becomes the project name')
    .option('--skip-install', 'skip npm install (dependencies are added to package.json)')
    .option('--no-git', 'skip git init')
    .action((dir: string, options: { skipInstall?: boolean; git?: boolean }) => {
      const targetDir = path.resolve(dir);
      const name = path.basename(targetDir);
      const parentDir = path.dirname(targetDir);

      if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
        throw new CliError(`Invalid project name "${name}" — use lowercase letters, digits, and hyphens.`);
      }
      if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
        throw new CliError(`Directory ${targetDir} already exists and is not empty.`);
      }
      fs.mkdirSync(parentDir, { recursive: true });

      run(
        'Scaffolding NestJS app',
        'npx',
        ['--yes', '@nestjs/cli@latest', 'new', name, '--skip-git', '--skip-install', '--package-manager', 'npm'],
        parentDir,
      );

      printStatus(pc.dim('▸ Applying Loopstack fixtures'));
      overlayFixtures(targetDir);
      addDependencies(targetDir);

      if (!options.skipInstall) {
        run('Installing dependencies', 'npm', ['install'], targetDir);
      }

      if (options.git !== false) {
        run('Initializing git repository', 'git', ['init', '-b', 'main'], targetDir);
        // A missing git identity must not fail the scaffold.
        spawnSync('git', ['add', '-A'], { cwd: targetDir, stdio: 'ignore' });
        spawnSync('git', ['commit', '-m', 'Initial commit'], { cwd: targetDir, stdio: 'ignore' });
      }

      printStatus(pc.green(`■ Created ${name}`));
      printData(
        [
          '',
          'Next steps:',
          `  cd ${path.relative(process.cwd(), targetDir) || '.'}`,
          ...(options.skipInstall ? ['  npm install'] : []),
          '  docker compose up -d      # Postgres, Redis, and Studio',
          '  npm run start:dev         # backend on http://localhost:3000',
          '',
          '  Studio: http://localhost:5173',
          '  Terminal: npx @loopstack/cli run hello --arg name=You',
          '',
          '  CLAUDE.md primes coding agents with the conventions and the CLI feedback loop.',
          '',
        ].join('\n'),
      );
    });
}
