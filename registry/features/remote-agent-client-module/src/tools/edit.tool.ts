import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteAgentClient } from '../services/remote-agent-client.service';
import { SandboxEnvironmentService } from '../services/sandbox-environment.service';

export type EditArgs = {
  file_path: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
};

@Tool({
  schema: z
    .object({
      file_path: z.string().describe('The file path to edit'),
      old_string: z.string().describe('The exact string to find and replace'),
      new_string: z.string().describe('The replacement string'),
      replace_all: z.boolean().optional().describe('Replace all occurrences (default: false)'),
    })
    .strict(),
  uiConfig: {
    description:
      'Performs exact string replacement in a file on a remote instance. Replaces old_string with new_string. Fails if old_string is not unique unless replace_all is true.',
  },
})
export class EditTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteAgentClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(args: EditArgs): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.editFile(
      agentUrl,
      args.file_path,
      args.old_string,
      args.new_string,
      args.replace_all,
    );
    return { data: result };
  }
}
