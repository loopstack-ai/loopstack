import type { Command } from 'commander';
import pc from 'picocolors';
import { WorkflowState } from '@loopstack/contracts/enums';
import { createClientFor, resolveConnection } from '../config/resolve.js';
import { ExitCode } from '../errors.js';
import { createIdleHandler } from '../hitl/idle-handler.js';
import { printData, printStatus, renderResult } from '../output/format.js';
import { openInBrowser, studioRunUrl } from '../output/studio-link.js';
import { followRun } from '../run/follow.js';
import { offerRetry } from '../run/retry.js';
import { renderRunTrail } from '../run/trail.js';

const TERMINAL_STATES: readonly WorkflowState[] = [
  WorkflowState.Completed,
  WorkflowState.Failed,
  WorkflowState.Canceled,
];

const IDLE_STATES: readonly WorkflowState[] = [WorkflowState.Waiting, WorkflowState.Paused];

/** The command's exit-code contract: 0 completed / 1 failed or canceled / 3 waiting. */
function exitCodeForStatus(status: WorkflowState): number {
  if (status === WorkflowState.Completed) return ExitCode.Success;
  if (IDLE_STATES.includes(status)) return ExitCode.NeedsInput;
  return ExitCode.RunFailed;
}

interface AttachOptions {
  open?: boolean;
}

export function registerAttachCommand(program: Command): void {
  program
    .command('attach <runId>')
    .description(
      'Attach to a run: transcript so far, then live progress and prompts (exit 0 completed / 1 failed / 3 waiting)',
    )
    .option('--open', 'open the run in Studio')
    .action(async (runId: string, options: AttachOptions, cmd) => {
      const globals = cmd.optsWithGlobals() as { env?: string; url?: string; token?: string; json?: boolean };
      const connection = resolveConnection(globals);
      const client = createClientFor(connection);
      const json = !!globals.json;
      const out = json ? process.stderr : process.stdout;

      const link = studioRunUrl(connection, runId);
      if (options.open) {
        if (link) openInBrowser(link);
        else printStatus('No Studio URL configured for this environment — set one with `loopstack login`.');
      }

      // Subscribe before reading state so the live attach misses nothing.
      const events = client.stream.events();

      const workflow = await client.workflows.get(runId);
      const checkpoints = await client.workflows.checkpoints(runId);
      const { renderer, streamedMessageIds, streamedToolCallIds, visibleWorkflowIds } = await renderRunTrail(
        client,
        connection,
        out,
        workflow,
        checkpoints,
      );

      if (TERMINAL_STATES.includes(workflow.status)) {
        // Nothing to attach to — the transcript above is the whole story.
        if (json) {
          printData(
            JSON.stringify(
              {
                workflowId: runId,
                status: workflow.status,
                result: workflow.result,
                errorMessage: workflow.errorMessage,
              },
              null,
              2,
            ),
          );
        } else {
          out.write('\n');
          if (renderResult(out, workflow.result)) out.write('\n');
        }
        out.write(pc.dim(`run already ${workflow.status} — nothing to attach to\n`));
        if (workflow.status !== WorkflowState.Completed && workflow.errorMessage) {
          out.write(`${pc.red('■')} ${workflow.errorMessage}\n`);
        }
        client.stream.close();
        // Exit by status — attaching to an already-failed run must not report success (CI
        // pipelines resume parked runs via attach and rely on the 0/1/3 contract).
        process.exit(exitCodeForStatus(workflow.status));
      }

      out.write(pc.dim('\n— attached, following live —\n'));

      // An already-waiting run emits no further events until answered — the
      // prompt starts immediately and races the stream, so an answer given
      // in Studio meanwhile resumes the session too.
      const followOptions = {
        onIdle: createIdleHandler(client, runId, out, { studioUrl: link }),
        initiallyIdle: IDLE_STATES.includes(workflow.status),
        onDocument: renderer.onDocument,
        streamedMessageIds,
        streamedToolCallIds,
        visibleWorkflowIds,
      };
      let outcome = await followRun(events, runId, out, followOptions);
      if (!json) outcome = await offerRetry(client, runId, events, out, out, followOptions, outcome);
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
        if (!json) {
          out.write('\n');
          if (renderResult(out, full.result)) out.write('\n');
        }
        out.write(`${pc.green('■')} run completed\n`);
      } else if (IDLE_STATES.includes(outcome.status)) {
        out.write(`${pc.yellow('⏸')} run is still waiting for input\n`);
      } else {
        out.write(`${pc.red('■')} run ${outcome.status}${full.errorMessage ? `: ${full.errorMessage}` : ''}\n`);
      }
      process.exit(exitCodeForStatus(outcome.status));
    });
}
