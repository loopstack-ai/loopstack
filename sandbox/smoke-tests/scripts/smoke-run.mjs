#!/usr/bin/env node
/**
 * Smoke run against the real backend: boots the built app (`dist/main.js`) on the
 * Postgres and Redis configured through the environment or `.env`, starts every
 * workflow in SMOKE_WORKFLOWS with the `loopstack` CLI, and checks how each run ends.
 *
 * Covers what the in-process `runWorkflow()` tests mock away: the HTTP start path,
 * BullMQ scheduling and retries, Postgres persistence, sub-workflow callbacks and
 * all example modules mounted in one app.
 *
 * Only workflows that need no LLM key, Docker socket, remote sandbox or OAuth app
 * are listed — the run must be deterministic in CI.
 *
 * Env: SMOKE_PORT (default: PORT, else 3000), SMOKE_RUN_TIMEOUT_MS (default 120000).
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {Array<{ workflow: string; expect: 'completed' | 'waiting' | 'failed'; error?: string }>} */
const SMOKE_WORKFLOWS = [
  // Advanced workflows — state, routing, tool results, documents, batching
  { workflow: 'workflow_state', expect: 'completed' },
  { workflow: 'workflow_tool_results', expect: 'completed' },
  { workflow: 'dynamic_routing_example', expect: 'completed' },
  { workflow: 'test_ui_documents', expect: 'completed' },
  { workflow: 'batch_processing_example', expect: 'completed' },
  // Sub-workflows — child completion delivered to the parent as a queued callback
  { workflow: 'run_sub_workflow_example_parent', expect: 'completed' },
  { workflow: 'run_sub_workflow_example_error_handling', expect: 'completed' },
  { workflow: 'run_sub_workflow_example_show_modes', expect: 'completed' },
  { workflow: 'run_sub_workflow_example_fan_out', expect: 'completed' },
  { workflow: 'run_sub_workflow_example_sequence', expect: 'completed' },
  // Error handling — auto-retries run on the queue backoff and succeed; the other modes end failed as designed
  { workflow: 'auto_retry_example', expect: 'completed' },
  { workflow: 'retry_target_example', expect: 'completed' },
  { workflow: 'error_place_example', expect: 'failed', error: 'Simulated external service error' },
  { workflow: 'manual_retry_example', expect: 'failed', error: 'Simulated external service error' },
  { workflow: 'transition_timeout_example', expect: 'failed', error: 'timed out after 2000ms' },
  { workflow: 'sub_workflow_error_place_example', expect: 'failed', error: 'Child workflow failed' },
  // Scheduling
  { workflow: 'call_webhook', expect: 'completed' },
  { workflow: 'call_signup', expect: 'completed' },
  { workflow: 'call_newsletter', expect: 'completed' },
  // Observability
  { workflow: 'quota_example', expect: 'completed' },
  { workflow: 'tracing_example', expect: 'completed' },
  { workflow: 'custom_calculator_example', expect: 'completed' },
  { workflow: 'audit_log_example', expect: 'completed' },
  // Filesystem
  { workflow: 'local_file_explorer_example', expect: 'completed' },
  // Human-in-the-loop — the run parks waiting for input
  { workflow: 'inline_form_example', expect: 'waiting' },
  { workflow: 'ask_user_text_example', expect: 'waiting' },
];

const EXIT_CODES = { completed: 0, failed: 1, waiting: 3 };
const READY_TIMEOUT_MS = 90_000;
const RUN_TIMEOUT_MS = Number(process.env.SMOKE_RUN_TIMEOUT_MS) || 120_000;
const LOG_TAIL_LINES = 150;

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = process.env.SMOKE_PORT ?? process.env.PORT ?? '3000';
const baseUrl = `http://127.0.0.1:${port}`;

const require = createRequire(import.meta.url);
const cliPackagePath = require.resolve('@loopstack/cli/package.json');
const cliBin = join(dirname(cliPackagePath), require(cliPackagePath).bin.loopstack);

const backendLog = [];

function remember(chunk) {
  backendLog.push(...chunk.toString().split('\n').filter(Boolean));
  if (backendLog.length > LOG_TAIL_LINES) backendLog.splice(0, backendLog.length - LOG_TAIL_LINES);
}

function printBackendLog() {
  console.error(`\n--- backend log (last ${backendLog.length} lines) ---\n${backendLog.join('\n')}\n---`);
}

async function isListening() {
  try {
    await fetch(baseUrl);
    return true;
  } catch {
    return false;
  }
}

function startBackend() {
  const mainPath = join(appDir, 'dist', 'main.js');
  const backend = spawn(process.execPath, [mainPath], {
    cwd: appDir,
    env: { ...process.env, PORT: port },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  backend.stdout.on('data', remember);
  backend.stderr.on('data', remember);
  return backend;
}

async function waitForBackend(backend) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (backend.exitCode !== null) throw new Error(`Backend exited during startup (code ${backend.exitCode})`);
    const response = await fetch(`${baseUrl}/api/v1/config/apps`).catch(() => undefined);
    if (response?.ok) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Backend did not answer ${baseUrl}/api/v1/config/apps with 2xx within ${READY_TIMEOUT_MS / 1000}s`);
}

function runWorkflow({ workflow }) {
  return new Promise((resolveRun) => {
    const cliArgs = ['run', workflow, '--json', '--quiet', '--url', baseUrl];
    const cli = spawn(process.execPath, [cliBin, ...cliArgs], { cwd: appDir, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    cli.stdout.on('data', (chunk) => (stdout += chunk));
    cli.stderr.on('data', (chunk) => (stderr += chunk));
    const timer = setTimeout(() => cli.kill('SIGKILL'), RUN_TIMEOUT_MS);
    cli.on('close', (code, signal) => {
      clearTimeout(timer);
      let result;
      try {
        result = JSON.parse(stdout);
      } catch {
        result = undefined;
      }
      resolveRun({ code, timedOut: signal === 'SIGKILL', result, stdout, stderr });
    });
  });
}

function check(entry, run) {
  if (run.timedOut) return `timed out after ${RUN_TIMEOUT_MS / 1000}s`;
  const status = run.result?.status;
  if (run.code !== EXIT_CODES[entry.expect] || status !== entry.expect) {
    return `expected ${entry.expect} (exit ${EXIT_CODES[entry.expect]}), got ${status ?? 'no result'} (exit ${run.code})`;
  }
  if (entry.error && !run.result.errorMessage?.includes(entry.error)) {
    return `expected error "${entry.error}", got "${run.result.errorMessage}"`;
  }
  return undefined;
}

async function stopBackend(backend) {
  if (backend.exitCode !== null) return;
  const exited = new Promise((r) => backend.once('exit', r));
  backend.kill('SIGTERM');
  const timer = setTimeout(() => backend.kill('SIGKILL'), 15_000);
  await exited;
  clearTimeout(timer);
}

async function main() {
  if (!existsSync(join(appDir, 'dist', 'main.js')) || !existsSync(cliBin)) {
    throw new Error('Build first: `npm run build -- --filter=smoke-tests...` from the monorepo root.');
  }
  if (await isListening()) {
    throw new Error(`Port ${port} is already in use — stop that process or set SMOKE_PORT.`);
  }

  console.log(`Starting smoke-tests backend on ${baseUrl}…`);
  const backend = startBackend();
  let failures = 0;
  try {
    await waitForBackend(backend);
    console.log(`Backend ready. Running ${SMOKE_WORKFLOWS.length} workflows.\n`);

    for (const entry of SMOKE_WORKFLOWS) {
      const run = await runWorkflow(entry);
      const problem = check(entry, run);
      const duration = run.result?.durationMs !== undefined ? ` (${run.result.durationMs}ms)` : '';
      if (!problem) {
        console.log(`  ✔ ${entry.workflow} — ${entry.expect}${duration}`);
        continue;
      }
      failures++;
      console.log(`  ✖ ${entry.workflow} — ${problem}${duration}`);
      if (run.result?.errorMessage) console.log(`      error: ${run.result.errorMessage}`);
      if (!run.result)
        console.log(`      cli: ${(run.stderr || run.stdout).trim().split('\n').slice(-5).join('\n      ')}`);
    }

    console.log(`\n${SMOKE_WORKFLOWS.length - failures} passed, ${failures} failed`);
    if (failures) printBackendLog();
  } catch (error) {
    failures++;
    console.error(`\n${error instanceof Error ? error.message : String(error)}`);
    printBackendLog();
  } finally {
    await stopBackend(backend);
  }
  process.exitCode = failures ? 1 : 0;
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
