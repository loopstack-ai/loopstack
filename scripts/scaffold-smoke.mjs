#!/usr/bin/env node
// Scaffold smoke test — exercises the documented "getting started" path end-to-end
// against the working tree (not the last npm release):
//
//   loopstack create → npm install → npm run build → boot → loopstack run hello
//
// It packs the local framework packages into tarballs and points the fresh app at
// them (via file: deps + npm overrides), so a dependency or ESM regression here fails
// loudly instead of reaching users. Requires a reachable Postgres and Redis.
//
// Env:
//   DATABASE_URL  (default postgres://postgres:admin@localhost:5432/postgres)
//   REDIS_URL     (default redis://localhost:6379)
//   PORT          (default 3999)
//   SMOKE_WORKDIR (default a fresh dir under the OS temp dir)
import { spawn, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const CLI_BIN = path.join(REPO_ROOT, 'packages/cli/dist/main.js');

// Framework packages the scaffold resolves at runtime (loopstack-module + its
// transitive deps) plus testing (a template devDependency).
const FRAMEWORK_PACKAGES = ['contracts', 'common', 'core', 'auth', 'api', 'loopstack-module', 'testing'];

const PORT = process.env.PORT ?? '3999';
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://postgres:admin@localhost:5432/postgres';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const WORKDIR = process.env.SMOKE_WORKDIR ?? fs.mkdtempSync(path.join(os.tmpdir(), 'loopstack-smoke-'));

function log(msg) {
  process.stderr.write(`\x1b[36m▸ ${msg}\x1b[0m\n`);
}

function fail(msg) {
  process.stderr.write(`\x1b[31m✖ ${msg}\x1b[0m\n`);
  process.exit(1);
}

function runStep(label, command, args, opts = {}) {
  log(label);
  const result = spawnSync(command, args, { stdio: 'inherit', ...opts });
  if (result.error) fail(`${label} failed: ${result.error.message}`);
  if (result.status !== 0) fail(`${label} failed (exit ${result.status ?? 'unknown'})`);
  return result;
}

// Pack every framework package and return a map of package name → tarball path.
function packFramework(tarballDir) {
  fs.mkdirSync(tarballDir, { recursive: true });
  const tarballs = {};
  for (const pkg of FRAMEWORK_PACKAGES) {
    const pkgDir = path.join(REPO_ROOT, 'packages', pkg);
    const result = spawnSync('npm', ['pack', '--json', '--pack-destination', tarballDir], {
      cwd: pkgDir,
      encoding: 'utf8',
    });
    if (result.status !== 0) fail(`npm pack ${pkg} failed:\n${result.stderr}`);
    const [meta] = JSON.parse(result.stdout);
    tarballs[meta.name] = path.join(tarballDir, meta.filename);
    log(`packed ${meta.name} → ${meta.filename}`);
  }
  return tarballs;
}

// Rewrite the scaffold's package.json so every @loopstack/* dependency resolves to
// the freshly packed tarball — direct deps and (via overrides) transitive ones.
function pinToTarballs(appDir, tarballs) {
  const pkgPath = path.join(appDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  for (const deps of [pkg.dependencies, pkg.devDependencies]) {
    if (!deps) continue;
    for (const name of Object.keys(deps)) {
      if (tarballs[name]) deps[name] = `file:${tarballs[name]}`;
    }
  }
  pkg.overrides = {};
  for (const [name, tgz] of Object.entries(tarballs)) {
    pkg.overrides[name] = `file:${tgz}`;
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

// Ready when the CLI can reach the backend and list its workflows — a role-agnostic
// probe that exercises the same HTTP path the smoke run will use. Throws (rather than
// exiting) so the caller's teardown still runs if the backend never comes up.
async function waitForBackend(url, attempts = 90) {
  for (let i = 0; i < attempts; i++) {
    const result = spawnSync('node', [CLI_BIN, 'list', '--url', url, '--json'], { stdio: 'ignore' });
    if (result.status === 0) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`backend did not become reachable at ${url}`);
}

async function main() {
  if (!fs.existsSync(CLI_BIN)) fail(`CLI not built at ${CLI_BIN} — run "npm run build" first.`);
  log(`workdir: ${WORKDIR}`);

  const tarballs = packFramework(path.join(WORKDIR, 'tarballs'));

  const appDir = path.join(WORKDIR, 'smoke-app');
  fs.rmSync(appDir, { recursive: true, force: true });
  runStep('Scaffolding app', 'node', [CLI_BIN, 'create', appDir, '--skip-install', '--no-git']);

  log('Pinning @loopstack/* to local tarballs');
  pinToTarballs(appDir, tarballs);

  // Fails on ERESOLVE by default — no --legacy-peer-deps escape hatch.
  runStep('Installing dependencies (clean resolution expected)', 'npm', ['install'], { cwd: appDir });

  runStep('Building app', 'npm', ['run', 'build'], { cwd: appDir });

  log('Booting backend');
  const bootLog = path.join(WORKDIR, 'backend.log');
  // Detached process group + logs to a file so the child never holds this
  // script's stdio pipe open (which would stall a downstream `| tail`).
  const logFd = fs.openSync(bootLog, 'w');
  const boot = spawn('node', ['dist/main.js'], {
    cwd: appDir,
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: { ...process.env, PORT, DATABASE_URL, REDIS_URL },
  });
  boot.unref();

  const url = `http://127.0.0.1:${PORT}`;
  let failure = null;
  try {
    await waitForBackend(url);
    log('Backend reachable — running hello workflow');
    const run = spawnSync('node', [CLI_BIN, 'run', 'hello', '--arg', 'name=CI', '--url', url, '--json'], {
      stdio: 'inherit',
    });
    if (run.status !== 0) throw new Error(`loopstack run hello failed (exit ${run.status ?? 'unknown'})`);
    log('Smoke test passed ✓');
  } catch (err) {
    failure = err instanceof Error ? err.message : String(err);
  } finally {
    // Tear down the whole process group (Nest + BullMQ worker); SIGKILL if it lingers.
    // Runs on both success and failure, so a failed run never orphans the backend.
    for (const signal of ['SIGTERM', 'SIGKILL']) {
      try {
        process.kill(-boot.pid, signal);
      } catch {
        break; // already gone
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    fs.closeSync(logFd);
  }
  if (failure) fail(failure);
  process.exit(0);
}

main().catch((err) => fail(err.stack ?? String(err)));
