import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteClient } from '../services/remote-client.service';
import { SandboxEnvironmentService } from '../services/sandbox-environment.service';

export type WriteArgs = {
  file_path: string;
  content: string;
};

@Tool({
  schema: z
    .object({
      file_path: z.string().describe('The file path to write'),
      content: z.string().describe('The content to write to the file'),
    })
    .strict(),
  uiConfig: {
    description: 'Writes a file to a remote instance. Creates parent directories if needed. Overwrites existing files.',
  },
})
export class WriteTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(args: WriteArgs): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    await this.remoteAgentClient.writeFile(agentUrl, args.file_path, args.content);
    return { data: { success: true, path: args.file_path } };
  }
}
