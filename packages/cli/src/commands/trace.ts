import type { Command } from 'commander';
import pc from 'picocolors';
import { WorkflowState } from '@loopstack/contracts/enums';
import { createClientFor, resolveConnection } from '../config/resolve.js';
import { ExitCode } from '../errors.js';
import { createIdleHandler } from '../hitl/idle-handler.js';
import { colorStatus, formatDuration, printData } from '../output/format.js';
import { followRun } from '../run/follow.js';

const TERMINAL_STATES: readonly WorkflowState[] = [
  WorkflowState.Completed,
  WorkflowState.Failed,
  WorkflowState.Canceled,
];

export function registerTraceCommand(program: Command): void {
  program
    .command('trace <runId>')
    .description('Show the audit trail of a run; --follow attaches live and answers prompts')
    .option('--follow', 'attach to the live stream after printing the trail')
    .action(async (runId: string, options: { follow?: boolean }, cmd) => {
      const globals = cmd.optsWithGlobals() as { env?: string; url?: string; token?: string; json?: boolean };
      const connection = resolveConnection(globals);
      const client = createClientFor(connection);
      const json = !!globals.json;
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
      if (workflow.status === WorkflowState.Waiting || workflow.status === WorkflowState.Paused) {
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
      if (outcome.status === WorkflowState.Waiting || outcome.status === WorkflowState.Paused) {
        out.write(`${pc.yellow('⏸')} run is still waiting for input\n`);
        process.exit(ExitCode.NeedsInput);
      }
      out.write(`${pc.red('■')} run ${outcome.status}${full.errorMessage ? `: ${full.errorMessage}` : ''}\n`);
      process.exit(ExitCode.RunFailed);
    });
}
