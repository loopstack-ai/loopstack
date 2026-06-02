import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

export type GitCommitArgs = {
  message: string;
};

export type GitCommitResult = { hash: string; message: string };

@Tool({
  name: 'git_commit',
  description: 'Creates a git commit with the currently staged changes.',
  schema: z
    .object({
      message: z.string().describe('The commit message'),
    })
    .strict(),
})
export class GitCommitTool extends BaseTool<GitCommitArgs, object, GitCommitResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: GitCommitArgs, ctx: LoopstackContext): Promise<ToolResult<GitCommitResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitCommit(agentUrl, args.message);
    return { data: result };
  }
}
