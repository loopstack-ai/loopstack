import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
import { EnvironmentService } from '../services/environment.service.js';
import { RemoteClient } from '../services/remote-client.service.js';

export type EditArgs = {
  file_path: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
};

export type EditResult = {
  success: boolean;
  path: string;
  replacements: number;
};

@Tool({
  name: 'edit',
  description:
    'Performs exact string replacement in a file on a remote instance. Replaces old_string with new_string. Fails if old_string is not unique unless replace_all is true.',
  schema: z
    .object({
      file_path: z.string().describe('The file path to edit'),
      old_string: z.string().describe('The exact string to find and replace'),
      new_string: z.string().describe('The replacement string'),
      replace_all: z.boolean().optional().describe('Replace all occurrences (default: false)'),
    })
    .strict(),
})
export class EditTool extends BaseTool<EditArgs, object, EditResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: EditArgs, ctx: LoopstackContext): Promise<ToolResult<EditResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.editFile(
      agentUrl,
      args.file_path,
      args.old_string,
      args.new_string,
      args.replace_all,
    );
    return { data: result };
  }
}
