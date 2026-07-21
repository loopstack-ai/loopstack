import type { Command } from 'commander';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pc from 'picocolors';
import type { LoopstackClient } from '@loopstack/client';
import { SortOrder, WorkflowState } from '@loopstack/contracts/enums';
import type { ResolvedConnection } from '../config/resolve.js';
import { createClientFor, resolveConnection } from '../config/resolve.js';
import { CliError, ExitCode } from '../errors.js';
import { inspectPendingPrompt } from '../hitl/pending.js';
import { colorStatus, printData, printStatus, renderResult, renderTable } from '../output/format.js';
import { openInBrowser, studioRunUrl } from '../output/studio-link.js';
import { renderRunTrail } from '../run/trail.js';

const IDLE_STATES: readonly WorkflowState[] = [WorkflowState.Waiting, WorkflowState.Paused];

interface RunsOptions {
  limit: string;
  workspace?: string;
  search?: string;
  status?: string;
  open?: boolean;
  record?: string;
}

interface Globals {
  env?: string;
  url?: string;
  token?: string;
  json?: boolean;
}

export function registerRunsCommand(program: Command): void {
  program
    .command('runs [runId]')
    .description('Recent runs (runs waiting for input first), or one run’s full transcript; `attach` joins it live')
    .option('--limit <n>', 'maximum number of runs to list', '20')
    .option('--workspace <id>', 'filter by workspace id')
    .option('--search <text>', 'search runs')
    .option('--status <status>', 'filter by status (e.g. waiting, completed, failed)')
    .option('--open', 'open the run in Studio (requires a run id)')
    .option('--record <file>', 'write the run’s recorded tool calls as a replay fixture (JSON)')
    .action(async (runId: string | undefined, options: RunsOptions, cmd) => {
      const globals = cmd.optsWithGlobals() as Globals;
      const connection = resolveConnection(globals);
      const client = createClientFor(connection);

      if (!runId) {
        if (options.open) throw new CliError('--open requires a run id: loopstack runs <run-id> --open');
        if (options.record) throw new CliError('--record requires a run id: loopstack runs <run-id> --record <file>');
        await listRuns(client, connection, options, !!globals.json);
        return;
      }
      if (options.record) {
        await recordFixture(client, runId, options.record, !!globals.json);
        return;
      }
      await showRun(client, connection, runId, options, !!globals.json);
    });
}

/**
 * Derive a replay fixture from the run's tool-call audit records (backend must run with
 * `recordToolCalls` enabled). The fixture format matches `replay()` in `@loopstack/testing`.
 */
async function recordFixture(client: LoopstackClient, runId: string, file: string, json: boolean): Promise<void> {
  const records = await client.workflows.toolCalls(runId);
  if (records.length === 0) {
    throw new CliError(
      'No recorded tool calls for this run. Start the backend with recordToolCalls enabled ' +
        '(LOOPSTACK_RECORD_TOOL_CALLS=true) and run the workflow again.',
    );
  }

  const recordings = records.map((record) => ({
    transition: record.transitionId ?? '',
    seq: record.seq,
    tool: record.toolName,
    ...(record.args !== null ? { args: record.args } : {}),
    envelope: record.envelope,
  }));
  const target = resolve(file);
  writeFileSync(target, `${JSON.stringify({ version: 1, recordings }, null, 2)}\n`);

  if (json) {
    printData(JSON.stringify({ file: target, recordings: recordings.length }, null, 2));
  } else {
    printStatus(`${pc.green('✓')} wrote ${recordings.length} recording(s) to ${target}`);
  }
}

/** The runs listing — the inbox: runs waiting for input are surfaced first. */
async function listRuns(
  client: LoopstackClient,
  connection: ResolvedConnection,
  options: RunsOptions,
  json: boolean,
): Promise<void> {
  const filter = {
    ...(options.workspace && { workspaceId: options.workspace }),
    ...(options.status && { status: options.status }),
  };
  const page = await client.workflows.list({
    ...(Object.keys(filter).length > 0 && { filter }),
    ...(options.search && { search: options.search }),
    sortBy: [{ field: 'createdAt', order: SortOrder.DESC }],
    page: 0,
    limit: Number(options.limit),
  });

  const needsInput = page.data.filter((run) => IDLE_STATES.includes(run.status));
  const rest = page.data.filter((run) => !IDLE_STATES.includes(run.status));
  const ordered = [...needsInput, ...rest];

  if (json) {
    const withLinks = ordered.map((run) => {
      const studioUrl = studioRunUrl(connection, run.id);
      return { ...run, ...(studioUrl && { studioUrl }) };
    });
    printData(JSON.stringify(withLinks, null, 2));
    return;
  }
  if (ordered.length === 0) {
    printStatus(`No runs on ${connection.url} yet — start one with \`loopstack run <workflow>\`.`);
    return;
  }
  const rows = ordered.map((run) => [
    run.id,
    run.workflowName,
    `#${run.run}`,
    colorStatus(run.status),
    run.title ?? '',
    new Date(run.createdAt).toLocaleString(),
  ]);
  printData(renderTable(['ID', 'WORKFLOW', 'RUN', 'STATUS', 'TITLE', 'CREATED'], rows));
  printStatus('');
  if (needsInput.length > 0) {
    printStatus(`${pc.yellow('⏸')} ${needsInput.length} waiting for input — answer with \`loopstack attach <run-id>\``);
  }
  printStatus(`${ordered.length} of ${page.total} runs (${connection.name})`);
}

/** One run's full transcript: header, steps, and the document history. */
async function showRun(
  client: LoopstackClient,
  connection: ResolvedConnection,
  runId: string,
  options: RunsOptions,
  json: boolean,
): Promise<void> {
  const link = studioRunUrl(connection, runId);
  if (options.open) {
    if (link) openInBrowser(link);
    else printStatus('No Studio URL configured for this environment — set one with `loopstack login`.');
  }

  const workflow = await client.workflows.get(runId);
  const checkpoints = await client.workflows.checkpoints(runId);
  const pendingPrompt = IDLE_STATES.includes(workflow.status)
    ? await inspectPendingPrompt(client, runId).catch(() => undefined)
    : undefined;

  if (json) {
    printData(
      JSON.stringify(
        { workflow, checkpoints, ...(pendingPrompt && { pendingPrompt }), ...(link && { studioUrl: link }) },
        null,
        2,
      ),
    );
    process.exit(ExitCode.Success);
  }

  const out = process.stdout;
  await renderRunTrail(client, connection, out, workflow, checkpoints);
  out.write('\n');
  if (renderResult(out, workflow.result)) out.write('\n');
  if (IDLE_STATES.includes(workflow.status)) {
    if (pendingPrompt && !pendingPrompt.studioOnly) {
      out.write(`${pc.yellow('⏸')} waiting for input: ${pendingPrompt.description}\n`);
      out.write(
        pc.dim(
          `  answer with \`loopstack answer ${runId} --arg k=v\` or interactively: \`loopstack attach ${runId}\`\n`,
        ),
      );
    } else {
      out.write(`${pc.yellow('⏸')} run is waiting for input — answer with \`loopstack attach ${runId}\`\n`);
    }
  }
  process.exit(ExitCode.Success);
}
