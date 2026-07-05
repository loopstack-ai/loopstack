import type { Command } from 'commander';
import pc from 'picocolors';
import type { LoopstackClient } from '@loopstack/client';
import { SortOrder, WorkflowState } from '@loopstack/contracts/enums';
import { createClientFor, resolveConnection } from '../config/resolve.js';
import { CliError, ExitCode } from '../errors.js';
import { createIdleHandler } from '../hitl/idle-handler.js';
import { colorStatus, formatDuration, printData, printStatus, renderTable } from '../output/format.js';
import { followRun } from '../run/follow.js';

const TERMINAL_STATES: readonly WorkflowState[] = [
  WorkflowState.Completed,
  WorkflowState.Failed,
  WorkflowState.Canceled,
];

const IDLE_STATES: readonly WorkflowState[] = [WorkflowState.Waiting, WorkflowState.Paused];

interface RunsOptions {
  follow?: boolean;
  limit: string;
  workspace?: string;
  search?: string;
  status?: string;
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
    .description('Recent runs (runs waiting for input first), or one run’s audit trail; --follow attaches live')
    .option('--follow', 'attach to the live stream after printing the trail (requires a run id)')
    .option('--limit <n>', 'maximum number of runs to list', '20')
    .option('--workspace <id>', 'filter by workspace id')
    .option('--search <text>', 'search runs')
    .option('--status <status>', 'filter by status (e.g. waiting, completed, failed)')
    .action(async (runId: string | undefined, options: RunsOptions, cmd) => {
      const globals = cmd.optsWithGlobals() as Globals;
      const connection = resolveConnection(globals);
      const client = createClientFor(connection);

      if (!runId) {
        if (options.follow) throw new CliError('--follow requires a run id: loopstack runs <run-id> --follow');
        await listRuns(client, connection.name, connection.url, options, !!globals.json);
        return;
      }
      await showRun(client, runId, options, !!globals.json);
    });
}

/** The runs listing — the inbox: runs waiting for input are surfaced first. */
async function listRuns(
  client: LoopstackClient,
  connectionName: string,
  connectionUrl: string,
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
    printData(JSON.stringify(ordered, null, 2));
    return;
  }
  if (ordered.length === 0) {
    printStatus(`No runs on ${connectionUrl} yet — start one with \`loopstack run <workflow>\`.`);
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
  if (needsInput.length > 0) {
    printStatus(
      `${pc.yellow('⏸')} ${needsInput.length} waiting for input — answer with \`loopstack runs <run-id> --follow\``,
    );
  }
  printStatus(`${ordered.length} of ${page.total} runs (${connectionName})`);
}

/** One run's audit trail; --follow attaches live and answers prompts. */
async function showRun(client: LoopstackClient, runId: string, options: RunsOptions, json: boolean): Promise<void> {
  const out = json ? process.stderr : process.stdout;

  // Subscribe before reading state so live attach misses nothing.
  const events = options.follow ? client.stream.events() : undefined;

  const workflow = await client.workflows.get(runId);
  const checkpoints = await client.workflows.checkpoints(runId);

  if (json && !options.follow) {
    printData(JSON.stringify({ workflow, checkpoints }, null, 2));
    process.exit(ExitCode.Success);
  }

  const title = workflow.title ? ` (${workflow.title})` : '';
  out.write(`${pc.bold(workflow.workflowName)} #${workflow.run}${title} — ${colorStatus(workflow.status)}\n`);
  out.write(pc.dim(`started ${new Date(workflow.createdAt).toLocaleString()}  ${workflow.id}\n`));

  // Collapse consecutive checkpoints of the same place (state saves) into
  // one step line spanning entry to exit.
  const steps: { place: string; enteredAt: number; leftAt?: number }[] = [];
  for (const checkpoint of checkpoints) {
    const at = new Date(checkpoint.createdAt).getTime();
    const last = steps[steps.length - 1];
    if (last && last.place === checkpoint.place) continue;
    if (last) last.leftAt = at;
    steps.push({ place: checkpoint.place, enteredAt: at });
  }
  for (const step of steps) {
    if (step.place === 'end') continue;
    const duration = step.leftAt !== undefined ? pc.dim(` (${formatDuration(step.leftAt - step.enteredAt)})`) : '';
    out.write(`${pc.green('✓')} ${step.place}${duration}\n`);
  }
  if (workflow.errorMessage) out.write(`${pc.red('✖')} ${workflow.errorMessage}\n`);

  if (!options.follow || TERMINAL_STATES.includes(workflow.status)) {
    client.stream.close();
    process.exit(ExitCode.Success);
  }

  out.write(pc.dim('— attached, following live —\n'));
  const onIdle = createIdleHandler(client, runId, out);

  // An already-waiting run emits no further events until answered —
  // trigger the prompt directly before entering the event loop.
  if (IDLE_STATES.includes(workflow.status)) {
    const resumed = await onIdle();
    if (!resumed) {
      client.stream.close();
      out.write(`${pc.yellow('⏸')} run is still waiting for input\n`);
      process.exit(ExitCode.NeedsInput);
    }
  }

  const outcome = await followRun(events!, runId, out, { onIdle });
  client.stream.close();

  const full = await client.workflows.get(runId);
  if (json) {
    printData(
      JSON.stringify(
        { workflowId: runId, status: outcome.status, result: full.result, errorMessage: full.errorMessage },
        null,
        2,
      ),
    );
  }
  if (outcome.status === WorkflowState.Completed) {
    out.write(`${pc.green('■')} run completed\n`);
    process.exit(ExitCode.Success);
  }
  if (IDLE_STATES.includes(outcome.status)) {
    out.write(`${pc.yellow('⏸')} run is still waiting for input\n`);
    process.exit(ExitCode.NeedsInput);
  }
  out.write(`${pc.red('■')} run ${outcome.status}${full.errorMessage ? `: ${full.errorMessage}` : ''}\n`);
  process.exit(ExitCode.RunFailed);
}
