import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteClient } from '../services/remote-client.service';
import { SandboxEnvironmentService } from '../services/sandbox-environment.service';

export type GrepArgs = {
  pattern: string;
  path?: string;
  glob?: string;
  type?: string;
  case_insensitive?: boolean;
};

@Tool({
  schema: z
    .object({
      pattern: z.string().describe('Regex pattern to search for in file contents'),
      path: z.string().optional().describe('Directory to search in, relative to workspace root'),
      glob: z.string().optional().describe('Glob pattern to filter files (e.g. "*.ts")'),
      type: z.string().optional().describe('File type filter (e.g. "js", "ts", "py")'),
      case_insensitive: z.boolean().optional().describe('Case-insensitive search'),
    })
    .strict(),
  uiConfig: {
    description:
      'Searches file contents by regex pattern on a remote instance. Returns matching lines with file paths and line numbers.',
  },
})
export class GrepTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(args: GrepArgs): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.grep(agentUrl, args.pattern, args.path, {
      glob: args.glob,
      type: args.type,
      caseInsensitive: args.case_insensitive,
    });
    return { data: result };
  }
}
