import type { Command } from 'commander';
import { Writable } from 'node:stream';
import pc from 'picocolors';
import { WorkflowState } from '@loopstack/contracts/enums';
import { createClientFor, resolveConnection } from '../config/resolve.js';
import { ExitCode } from '../errors.js';
import { createIdleHandler } from '../hitl/idle-handler.js';
import { formatDuration, printData, printStatus, renderResult } from '../output/format.js';
import { openInBrowser, studioRunUrl } from '../output/studio-link.js';
import { parseRunArgs } from '../run/args.js';
import { createDocumentRenderer } from '../run/documents.js';
import { followRun } from '../run/follow.js';
import { resolveWorkspaceId } from '../run/workspace.js';

const collect = (value: string, previous: string[]) => [...previous, value];

const discard = () => new Writable({ write: (_chunk, _encoding, callback) => callback() });

interface RunOptions {
  arg: string[];
  workspace?: string;
  detach?: boolean;
  quiet?: boolean;
  open?: boolean;
  editor?: boolean;
}

export function registerRunCommand(program: Command): void {
  program
    .command('run <workflow>')
    .description('Start a workflow run and follow it live (exit 0 completed / 1 failed / 3 waiting for input)')
    .option(
      '--arg <key=value>',
      'workflow argument, repeatable; key=@file.json reads a file, key=@- reads stdin',
      collect,
      [] as string[],
    )
    .option('--workspace <id>', 'workspace to run in (default: newest workspace of the workflow’s app)')
    .option('--detach', 'start the run, print its id, exit immediately')
    .option('--quiet', 'no progress — print only the final result')
    .option('--open', 'open the run in Studio')
    .option('--editor', 'answer field forms in $EDITOR instead of handing off to Studio')
    .action(async (workflowName: string, options: RunOptions, cmd) => {
      const globals = cmd.optsWithGlobals() as { env?: string; url?: string; token?: string; json?: boolean };
      const connection = resolveConnection(globals);
      const client = createClientFor(connection);
      const json = !!globals.json;
      const quiet = !!options.quiet;
      // Progress rendering; discarded under --quiet, stderr under --json.
      const out = json ? process.stderr : quiet ? discard() : process.stdout;
      // Prompts and final status lines stay visible even under --quiet.
      const statusOut = json || quiet ? process.stderr : process.stdout;

      const args = parseRunArgs(options.arg);
      const workspaceId = await resolveWorkspaceId(client, workflowName, options.workspace, connection.workspaceId);

      // Subscribe before starting so no event of the run is missed.
      const events = options.detach ? undefined : client.stream.events();
      const startedAt = Date.now();
      const run = await client.processor.start({ workflowName, workspaceId, args });
      out.write(pc.dim(`▸ run ${run.workflowId} started\n`));

      const link = studioRunUrl(connection, run.workflowId);
      if (options.open) {
        if (link) openInBrowser(link);
        else printStatus('No Studio URL configured for this environment — set one with `loopstack login`.');
      }

      if (!events) {
        if (link) printStatus(pc.dim(`⧉ ${link}`));
        printData(
          json ? JSON.stringify({ workflowId: run.workflowId, ...(link && { studioUrl: link }) }) : run.workflowId,
        );
        process.exit(ExitCode.Success);
      }

      const outcome = await followRun(events, run.workflowId, out, {
        onIdle: createIdleHandler(client, run.workflowId, statusOut, { studioUrl: link, editor: options.editor }),
        onDocument: createDocumentRenderer(client, out),
      });
      client.stream.close();
      const durationMs = Date.now() - startedAt;

      const full = await client.workflows.get(run.workflowId);
      if (json) {
        printData(
          JSON.stringify(
            {
              workflowId: run.workflowId,
              status: outcome.status,
              result: full.result,
              errorMessage: full.errorMessage,
              durationMs,
              ...(link && { studioUrl: link }),
            },
            null,
            2,
          ),
        );
      }

      if (outcome.status === WorkflowState.Completed) {
        if (!json && quiet) {
          const result = full.result as unknown;
          printData(typeof result === 'string' ? result : JSON.stringify(result ?? null, null, 2));
        }
        if (!json && !quiet) renderResult(out, full.result);
        statusOut.write(`${pc.green('■')} run completed in ${formatDuration(durationMs)}\n`);
        process.exit(ExitCode.Success);
      }
      if (outcome.status === WorkflowState.Waiting || outcome.status === WorkflowState.Paused) {
        statusOut.write(
          `${pc.yellow('⏸')} run is waiting for input — resume with \`loopstack runs ${run.workflowId} --follow\`\n`,
        );
        if (link) statusOut.write(pc.dim(`⧉ answer in Studio: ${link}\n`));
        process.exit(ExitCode.NeedsInput);
      }
      statusOut.write(`${pc.red('■')} run ${outcome.status}${full.errorMessage ? `: ${full.errorMessage}` : ''}\n`);
      if (link) statusOut.write(pc.dim(`⧉ inspect in Studio: ${link}\n`));
      process.exit(ExitCode.RunFailed);
    });
}
