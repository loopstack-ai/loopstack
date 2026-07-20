import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

/**
 * Result for `GitWorktreePruneTool`.
 *
 * @public
 */
export type GitWorktreePruneResult = {
  success: boolean;
  output?: string;
};

/**
 * Tool that prunes worktree administrative files for worktrees whose directories no longer exist.
 *
 * @providedBy GitModule
 * @public
 */
@Tool({
  name: 'git_worktree_prune',
  description: 'Prunes worktree administrative files for worktrees whose directories no longer exist.',
  schema: z.object({}).strict(),
})
export class GitWorktreePruneTool extends BaseTool<object, object, GitWorktreePruneResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(): Promise<ToolEnvelope<GitWorktreePruneResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitWorktreePrune(agentUrl);
    return { data: result };
  }
}
