import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteAgentClient } from '../services/remote-agent-client.service';
import { SandboxEnvironmentService } from '../services/sandbox-environment.service';

export type LogsArgs = {
  lines?: number;
  type?: 'out' | 'error' | 'all';
};

@Tool({
  schema: z
    .object({
      lines: z.number().optional().describe('Number of recent log lines to return (default 100, max 5000)'),
      type: z
        .enum(['out', 'error', 'all'])
        .optional()
        .describe('Which logs to retrieve: "out" for stdout, "error" for stderr, "all" for both (default "all")'),
    })
    .strict(),
  uiConfig: {
    description:
      'Retrieves application logs from the remote instance. Returns stdout and/or stderr output from the running NestJS application.',
  },
})
export class LogsTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteAgentClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(args: LogsArgs): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.getLogs(agentUrl, args.lines, args.type);
    return {
      data: {
        stdout: result.stdout,
        stderr: result.stderr,
      },
    };
  }
}
