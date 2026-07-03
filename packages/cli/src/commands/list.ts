import type { Command } from 'commander';
import { SortOrder } from '@loopstack/contracts/enums';
import { createClientFor, resolveConnection } from '../config/resolve.js';
import { colorStatus, printData, printStatus, renderTable } from '../output/format.js';

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List recent workflow runs')
    .option('--limit <n>', 'maximum number of runs', '20')
    .option('--workspace <id>', 'filter by workspace id')
    .action(async (options: { limit: string; workspace?: string }, cmd) => {
      const globals = cmd.optsWithGlobals() as { env?: string; url?: string; token?: string; json?: boolean };
      const connection = resolveConnection(globals);
      const client = createClientFor(connection);

      const page = await client.workflows.list({
        ...(options.workspace && { filter: { workspaceId: options.workspace } }),
        sortBy: [{ field: 'createdAt', order: SortOrder.DESC }],
        page: 0,
        limit: Number(options.limit),
      });

      if (globals.json) {
        printData(JSON.stringify(page.data, null, 2));
        return;
      }
      if (page.data.length === 0) {
        printStatus(`No runs on ${connection.url} yet — start one with \`loopstack run <workflow>\`.`);
        return;
      }
      const rows = page.data.map((run) => [
        run.id,
        run.workflowName,
        `#${run.run}`,
        colorStatus(run.status),
        run.title ?? '',
        new Date(run.createdAt).toLocaleString(),
      ]);
      printData(renderTable(['ID', 'WORKFLOW', 'RUN', 'STATUS', 'TITLE', 'CREATED'], rows));
      printStatus(`${page.data.length} of ${page.total} runs (${connection.name})`);
    });
}
