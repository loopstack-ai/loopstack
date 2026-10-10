#!/usr/bin/env node
/**
 * Keeps the "Use in Your App" section of every example module README in sync with what the module
 * actually imports.
 *
 * Each module directory under `src/` is meant to be copied into another app, so its README has to
 * state which `@loopstack/*` packages that copy needs. The list is derived from the module's own
 * imports instead of being maintained by hand, which is why it cannot drift in either direction.
 *
 * `node scripts/sync-module-deps.mjs` rewrites the section; `--check` leaves the files alone and
 * exits non-zero if any README is out of date. `module-deps.spec.ts` runs the check.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const HEADING = '## Use in Your App';
/** Test-only, and never part of what a copied module needs at runtime. */
const EXCLUDED = new Set(['@loopstack/testing']);
/** Directories under `src/` that are not example modules (`node_modules` holds vitest's cache). */
const NOT_MODULES = new Set(['__tests__', 'node_modules', 'dist']);

/** Every example module: its directory name, module file and exported module class. */
function modules() {
  return readdirSync(SRC, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !NOT_MODULES.has(entry.name))
    .map((entry) => {
      const dir = join(SRC, entry.name);
      const moduleFile = readdirSync(dir).find((file) => file.endsWith('.module.ts'));
      if (!moduleFile) throw new Error(`${entry.name}: no *.module.ts`);
      const className = readFileSync(join(dir, moduleFile), 'utf-8').match(/export class (\w+)/)?.[1];
      if (!className) throw new Error(`${entry.name}/${moduleFile}: no exported class`);
      return { name: entry.name, dir, moduleFile, className };
    });
}

/** Every `.ts` file in a module directory except its tests. */
function sourceFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') found.push(...sourceFiles(path));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
      found.push(path);
    }
  }
  return found;
}

function declaredDependencies(dir) {
  const found = new Set();
  for (const file of sourceFiles(dir)) {
    const source = readFileSync(file, 'utf-8');
    for (const [, pkg] of source.matchAll(/from\s+['"](@loopstack\/[a-z0-9-]+)['"]/g)) {
      if (!EXCLUDED.has(pkg)) found.add(pkg);
    }
  }
  return [...found].sort();
}

function section({ name, moduleFile, className, dir }) {
  const dependencies = declaredDependencies(dir);
  return [
    HEADING,
    '',
    'Copy this directory into your app, then install what it imports:',
    '',
    '```bash',
    `npm install ${dependencies.join(' ')}`,
    '```',
    '',
    'Register the module:',
    '',
    '```typescript',
    "import { Module } from '@nestjs/common';",
    "import { LoopstackModule } from '@loopstack/loopstack-module';",
    `import { ${className} } from './${name}/${moduleFile.replace(/\.ts$/, '')}';`,
    '',
    '@Module({',
    `  imports: [LoopstackModule.forRoot(), ${className}],`,
    '})',
    'export class AppModule {}',
    '```',
  ].join('\n');
}

/**
 * Replace the generated section, or insert it before the first `##` heading when the README has
 * none yet. Everything outside the section is left exactly as it is.
 */
function withSection(markdown, generated) {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => line.trim() === HEADING);

  if (start === -1) {
    const firstHeading = lines.findIndex((line) => line.startsWith('## '));
    const at = firstHeading === -1 ? lines.length : firstHeading;
    return [...lines.slice(0, at), ...generated.split('\n'), '', ...lines.slice(at)].join('\n');
  }

  let end = start + 1;
  while (end < lines.length && !lines[end].startsWith('## ')) end += 1;
  const trailing = end < lines.length ? ['', ...lines.slice(end)] : lines.slice(end);
  return [...lines.slice(0, start), ...generated.split('\n'), ...trailing].join('\n');
}

const check = process.argv.includes('--check');
const stale = [];

for (const module of modules()) {
  const readme = join(module.dir, 'README.md');
  const current = readFileSync(readme, 'utf-8');
  const updated = withSection(current, section(module));
  if (current === updated) continue;
  if (check) stale.push(module.name);
  else writeFileSync(readme, updated);
}

if (check && stale.length) {
  console.error(
    `Out of date: ${stale.join(', ')}\nRun \`npm run sync-deps\` in examples/ to regenerate the "Use in Your App" sections.`,
  );
  process.exit(1);
}

if (!check) console.log(`Synced ${modules().length} module READMEs.`);
