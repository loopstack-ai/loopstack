import type { Command } from 'commander';
import pc from 'picocolors';
import { WorkflowState } from '@loopstack/contracts/enums';
import { createClientFor, resolveConnection } from '../config/resolve.js';
import { ExitCode } from '../errors.js';
import { createIdleHandler } from '../hitl/idle-handler.js';
import { formatDuration, printData } from '../output/format.js';
import { parseRunArgs } from '../run/args.js';
import { followRun } from '../run/follow.js';
import { resolveWorkspaceId } from '../run/workspace.js';

const collect = (value: string, previous: string[]) => [...previous, value];

export function registerRunCommand(program: Command): void {
  program
    .command('run <workflow>')
    .description('Start a workflow run and follow it live (exit 0 completed / 1 failed / 3 waiting for input)')
    .option('--arg <key=value>', 'workflow argument, repeatable; key=@file.json reads a file', collect, [] as string[])
    .option('--workspace <id>', 'workspace to run in (default: newest workspace of the workflow’s app)')
    .option('--no-follow', 'start the run and exit immediately')
    .action(async (workflowName: string, options: { arg: string[]; workspace?: string; follow: boolean }, cmd) => {
      const globals = cmd.optsWithGlobals() as { env?: string; url?: string; token?: string; json?: boolean };
      const connection = resolveConnection(globals);
      const client = createClientFor(connection);
      const json = !!globals.json;
      const out = json ? process.stderr : process.stdout;

      const args = parseRunArgs(options.arg);
      const workspaceId = await resolveWorkspaceId(client, workflowName, options.workspace, connection.workspaceId);

      // Subscribe before starting so no event of the run is missed.
      const events = options.follow ? client.stream.events() : undefined;
      const startedAt = Date.now();
      const run = await client.processor.start({ workflowName, workspaceId, args });
      out.write(pc.dim(`▸ run ${run.workflowId} started\n`));

      if (!events) {
        printData(json ? JSON.stringify({ workflowId: run.workflowId }) : run.workflowId);
        process.exit(ExitCode.Success);
      }

      const outcome = await followRun(events, run.workflowId, out, {
        onIdle: createIdleHandler(client, run.workflowId, out),
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
            },
            null,
            2,
          ),
        );
      }

      if (outcome.status === WorkflowState.Completed) {
        out.write(`${pc.green('■')} run completed in ${formatDuration(durationMs)}\n`);
        process.exit(ExitCode.Success);
      }
      if (outcome.status === WorkflowState.Waiting || outcome.status === WorkflowState.Paused) {
        out.write(
          `${pc.yellow('⏸')} run is waiting for input — resume with \`loopstack trace ${run.workflowId} --follow\`\n`,
        );
        process.exit(ExitCode.NeedsInput);
      }
      out.write(`${pc.red('■')} run ${outcome.status}${full.errorMessage ? `: ${full.errorMessage}` : ''}\n`);
      process.exit(ExitCode.RunFailed);
    });
}
