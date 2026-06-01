import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

export const GitWorktreeRemoveSchema = z
  .object({
    path: z.string().describe('Path of the worktree to remove'),
    force: z
      .boolean()
      .optional()
      .describe('Pass --force to remove a worktree that has uncommitted changes or is locked'),
  })
  .strict();

export type GitWorktreeRemoveArgs = z.infer<typeof GitWorktreeRemoveSchema>;

export type GitWorktreeRemoveResult = { success: boolean };

@Tool({
  name: 'git_worktree_remove',
  description: 'Removes a git worktree at the given path. Use force=true to remove dirty or locked worktrees.',
  schema: GitWorktreeRemoveSchema,
})
export class GitWorktreeRemoveTool extends BaseTool<GitWorktreeRemoveArgs, object, GitWorktreeRemoveResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: GitWorktreeRemoveArgs): Promise<ToolResult<GitWorktreeRemoveResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitWorktreeRemove(agentUrl, args);
    return { data: result };
  }
}
