import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService } from '../services/environment.service.js';
import { RemoteClient } from '../services/remote-client.service.js';

/**
 * Args for `logs` — optional `lines` count and the log `type` to retrieve.
 *
 * @public
 */
export type LogsArgs = {
  lines?: number;
  type?: 'out' | 'error' | 'all';
};

/**
 * Result for `logs` — the captured stdout and stderr output.
 *
 * @public
 */
export type LogsResult = {
  stdout: string;
  stderr: string;
};

/**
 * Tool that retrieves application logs from the remote instance.
 *
 * @providedBy RemoteClientModule
 * @public
 */
@Tool({
  name: 'logs',
  description:
    'Retrieves application logs from the remote instance. Returns stdout and/or stderr output from the running NestJS application.',
  schema: z
    .object({
      lines: z.number().optional().describe('Number of recent log lines to return (default 100, max 5000)'),
      type: z
        .enum(['out', 'error', 'all'])
        .optional()
        .describe('Which logs to retrieve: "out" for stdout, "error" for stderr, "all" for both (default "all")'),
    })
    .strict(),
})
export class LogsTool extends BaseTool<LogsArgs, object, LogsResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: LogsArgs): Promise<ToolEnvelope<LogsResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.getLogs(agentUrl, args.lines, args.type);
    return {
      data: {
        stdout: result.stdout,
        stderr: result.stderr,
      },
    };
  }
}
