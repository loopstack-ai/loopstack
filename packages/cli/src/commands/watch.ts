import type { Command } from 'commander';
import pc from 'picocolors';
import { createClientFor, resolveConnection } from '../config/resolve.js';
import { printStatus } from '../output/format.js';

const collect = (value: string, previous: string[]) => [...previous, value];

function summarize(message: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof message.workflowId === 'string') parts.push(message.workflowId);
  if (typeof message.status === 'string') parts.push(String(message.status));
  if (typeof message.place === 'string') parts.push(`@${String(message.place)}`);
  if (typeof message.delta === 'string') parts.push(JSON.stringify((message.delta as string).slice(0, 40)));
  if (typeof message.workspaceId === 'string') parts.push(`ws:${String(message.workspaceId)}`);
  return parts.join('  ');
}

export function registerWatchCommand(program: Command): void {
  program
    .command('watch')
    .description("Stream the environment's live events (Ctrl+C to stop)")
    .option('--workflow <id>', 'only events of this workflow run')
    .option('--type <type>', 'only this event type (repeatable, e.g. workflow.updated)', collect, [] as string[])
    .action(async (options: { workflow?: string; type: string[] }, cmd) => {
      const globals = cmd.optsWithGlobals() as { env?: string; url?: string; token?: string; json?: boolean };
      const connection = resolveConnection(globals);
      const client = createClientFor(connection);
      const json = !!globals.json;

      client.stream.onStatus((status) => printStatus(pc.dim(`stream: ${status}`)));
      client.stream.onAny((message) => {
        const record = message as unknown as Record<string, unknown>;
        if (options.workflow && record.workflowId !== options.workflow) return;
        if (options.type.length > 0 && !options.type.includes(String(record.type))) return;

        if (json) {
          console.log(JSON.stringify(message));
          return;
        }
        const time = new Date().toLocaleTimeString();
        console.log(`${pc.dim(time)}  ${pc.bold(String(record.type).padEnd(28))} ${summarize(record)}`);
      });

      printStatus(pc.dim(`watching ${connection.url} — Ctrl+C to stop`));
      await new Promise(() => {});
    });
}
