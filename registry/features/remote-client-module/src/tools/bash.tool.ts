import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { BaseTool, MessageDocument, type RunContext, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService } from '../services/environment.service.js';
import { RemoteClient } from '../services/remote-client.service.js';

/**
 * Args for `bash` — the shell `command` and an optional `timeout` in milliseconds.
 *
 * @public
 */
export type BashArgs = {
  command: string;
  timeout?: number;
};

/**
 * Result for `bash` — the merged stdout+stderr `output` (chronological, as streamed) and the exit code.
 *
 * @public
 */
export type BashResult = {
  output: string;
  exitCode: number;
};

/**
 * Zod schema for {@link BashResult}.
 *
 * @public
 */
export const BashResultSchema = z.strictObject({
  output: z.string(),
  exitCode: z.number(),
});

/**
 * Tool that executes a shell command on the remote instance, streaming its output live into a document
 * as it runs, and returns the merged output plus the exit code.
 *
 * @providedBy RemoteClientModule
 * @public
 */
@Tool({
  name: 'bash',
  description:
    'Executes a shell command on a remote instance. Streams output live; returns merged output and exit code.',
  schema: z
    .object({
      command: z.string().describe('The shell command to execute'),
      timeout: z.number().optional().describe('Timeout in milliseconds'),
    })
    .strict(),
  resultSchema: BashResultSchema,
  effects: 'external',
})
export class BashTool extends BaseTool<BashArgs, object, BashResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: BashArgs, ctx: RunContext): Promise<ToolEnvelope<BashResult>> {
    const agentUrl = await this.env.getAgentUrl();
    // One live document per invocation — keyed uniquely so concurrent/sequential bash calls don't clobber.
    const key = `bash_${randomUUID()}`;
    let buffer = '';
    const { output, exitCode } = await this.remote.streamCommand(agentUrl, {
      command: args.command,
      timeout: args.timeout,
      signal: ctx.signal,
      onChunk: async (chunk) => {
        buffer += chunk;
        await this.documentStore.save(
          MessageDocument,
          { role: 'system', text: `**\`${args.command}\`**\n\n\`\`\`\n${tail(buffer)}\n\`\`\`` },
          { key },
        );
      },
    });
    return { data: { output, exitCode } };
  }
}

/** Keep the last {@link maxChars} chars so the live document never grows unbounded. */
function tail(text: string, maxChars = 16000): string {
  return (text.length > maxChars ? text.slice(-maxChars) : text).trimEnd();
}
