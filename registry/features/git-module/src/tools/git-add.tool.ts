import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

export type GitAddArgs = {
  files: string[];
};

export type GitAddResult = { success: boolean };

@Tool({
  name: 'git_add',
  schema: z
    .object({
      files: z.array(z.string()).describe('File paths to stage. Use ["."] to stage all changes.'),
    })
    .strict(),
  uiConfig: {
    description: 'Stages files for the next git commit.',
  },
})
export class GitAddTool extends BaseTool<GitAddArgs, object, GitAddResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: GitAddArgs): Promise<ToolResult<GitAddResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitAdd(agentUrl, args.files);
    return { data: result };
  }
}
