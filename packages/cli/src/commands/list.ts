import type { Command } from 'commander';
import { createClientFor, resolveConnection } from '../config/resolve.js';
import { printData, printStatus, renderTable } from '../output/format.js';

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List the workflows you can run in this environment')
    .action(async (_options: Record<string, never>, cmd) => {
      const globals = cmd.optsWithGlobals() as { env?: string; url?: string; token?: string; json?: boolean };
      const connection = resolveConnection(globals);
      const client = createClientFor(connection);

      const apps = await client.config.apps();
      const workflows = apps.flatMap((app) =>
        app.workflows.map((workflow) => ({
          workflowName: workflow.workflowName,
          title: workflow.title ?? '',
          description: workflow.description ?? '',
          appName: app.appName,
          appTitle: app.title,
        })),
      );

      if (globals.json) {
        printData(JSON.stringify(workflows, null, 2));
        return;
      }
      if (workflows.length === 0) {
        printStatus(`No workflows on ${connection.url} — is a Loopstack app with @StudioApp modules running?`);
        return;
      }
      const rows = workflows.map((workflow) => [workflow.workflowName, workflow.title, workflow.appTitle]);
      printData(renderTable(['WORKFLOW', 'TITLE', 'APP'], rows));
      printStatus(
        `${workflows.length} workflows in ${apps.length} apps (${connection.name}) — start one with \`loopstack run <workflow>\``,
      );
    });
}
