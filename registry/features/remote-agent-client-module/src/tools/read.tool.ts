import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteAgentClient } from '../services/remote-agent-client.service';
import { SandboxEnvironmentService } from '../services/sandbox-environment.service';

export type ReadArgs = {
  file_path: string;
  offset?: number;
  limit?: number;
};

@Tool({
  schema: z
    .object({
      file_path: z.string().describe('The file path to read'),
      offset: z.number().optional().describe('Line number to start reading from (1-indexed)'),
      limit: z.number().optional().describe('Number of lines to read'),
    })
    .strict(),
  uiConfig: {
    description:
      'Reads a file from a remote instance. Returns file content. Supports offset and limit for reading specific line ranges.',
  },
})
export class ReadTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteAgentClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(args: ReadArgs): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.readFile(agentUrl, args.file_path, args.offset, args.limit);
    return { data: { content: result.content, path: args.file_path } };
  }
}
