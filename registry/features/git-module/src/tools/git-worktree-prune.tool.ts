import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

export type GitWorktreePruneResult = {
  success: boolean;
  output?: string;
};

@Tool({
  name: 'git_worktree_prune',
  schema: z.object({}).strict(),
  uiConfig: {
    description: 'Prunes worktree administrative files for worktrees whose directories no longer exist.',
  },
})
export class GitWorktreePruneTool extends BaseTool<object, object, GitWorktreePruneResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(): Promise<ToolResult<GitWorktreePruneResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitWorktreePrune(agentUrl);
    return { data: result };
  }
}
