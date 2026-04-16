import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteClient } from '../services/remote-client.service';
import { SandboxEnvironmentService } from '../services/sandbox-environment.service';

export type GlobArgs = {
  pattern: string;
  path?: string;
};

@Tool({
  schema: z
    .object({
      pattern: z.string().describe('Glob pattern to match files (e.g. "**/*.ts")'),
      path: z.string().optional().describe('Directory to search in, relative to workspace root'),
    })
    .strict(),
  uiConfig: {
    description:
      'Finds files by glob pattern on a remote instance. Supports patterns like "**/*.ts", "src/**/*.{js,ts}". Returns relative file paths.',
  },
})
export class GlobTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(args: GlobArgs): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.glob(agentUrl, args.pattern, args.path);
    return { data: result };
  }
}
