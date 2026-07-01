import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
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
 * Result for `bash` — stdout, stderr, and the process exit code.
 *
 * @public
 */
export type BashResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

/**
 * Tool that executes a shell command on the remote instance and returns its output and exit code.
 *
 * @providedBy RemoteClientModule
 * @public
 */
@Tool({
  name: 'bash',
  description: 'Executes a shell command on a remote instance. Returns stdout, stderr, and exit code.',
  schema: z
    .object({
      command: z.string().describe('The shell command to execute'),
      timeout: z.number().optional().describe('Timeout in milliseconds'),
    })
    .strict(),
})
export class BashTool extends BaseTool<BashArgs, object, BashResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: BashArgs): Promise<ToolEnvelope<BashResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.executeCommand(agentUrl, args.command, undefined, args.timeout);
    return {
      data: {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      },
    };
  }
}
