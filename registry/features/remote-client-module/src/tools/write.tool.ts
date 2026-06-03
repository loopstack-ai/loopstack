import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
import { EnvironmentService } from '../services/environment.service.js';
import { RemoteClient } from '../services/remote-client.service.js';

export type WriteArgs = {
  file_path: string;
  content: string;
};

export type WriteResult = {
  success: boolean;
  path: string;
};

@Tool({
  name: 'write',
  description: 'Writes a file to a remote instance. Creates parent directories if needed. Overwrites existing files.',
  schema: z
    .object({
      file_path: z.string().describe('The file path to write'),
      content: z.string().describe('The content to write to the file'),
    })
    .strict(),
})
export class WriteTool extends BaseTool<WriteArgs, object, WriteResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: WriteArgs, _ctx: LoopstackContext): Promise<ToolResult<WriteResult>> {
    const agentUrl = await this.env.getAgentUrl();
    await this.remote.writeFile(agentUrl, args.file_path, args.content);
    return { data: { success: true, path: args.file_path } };
  }
}
