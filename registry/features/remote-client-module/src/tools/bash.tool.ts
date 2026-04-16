import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteClient } from '../services/remote-client.service';
import { SandboxEnvironmentService } from '../services/sandbox-environment.service';

export type BashArgs = {
  command: string;
  timeout?: number;
};

@Tool({
  schema: z
    .object({
      command: z.string().describe('The shell command to execute'),
      timeout: z.number().optional().describe('Timeout in milliseconds'),
    })
    .strict(),
  uiConfig: {
    description: 'Executes a shell command on a remote instance. Returns stdout, stderr, and exit code.',
  },
})
export class BashTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(args: BashArgs): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.executeCommand(agentUrl, args.command, undefined, args.timeout);
    return {
      data: {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      },
    };
  }
}
