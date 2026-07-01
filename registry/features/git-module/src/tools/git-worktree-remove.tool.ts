import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

/**
 * Zod schema for `GitWorktreeRemoveTool` arguments.
 *
 * @public
 */
export const GitWorktreeRemoveSchema = z
  .object({
    path: z.string().describe('Path of the worktree to remove'),
    force: z
      .boolean()
      .optional()
      .describe('Pass --force to remove a worktree that has uncommitted changes or is locked'),
  })
  .strict();

/**
 * Args for `GitWorktreeRemoveTool`.
 *
 * @public
 */
export type GitWorktreeRemoveArgs = z.infer<typeof GitWorktreeRemoveSchema>;

/**
 * Result for `GitWorktreeRemoveTool`.
 *
 * @public
 */
export type GitWorktreeRemoveResult = { success: boolean };

/**
 * Tool that removes a git worktree at the given path, optionally forcing removal of dirty or locked worktrees.
 *
 * @providedBy GitModule
 * @public
 */
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

  protected async handle(args: GitWorktreeRemoveArgs): Promise<ToolEnvelope<GitWorktreeRemoveResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitWorktreeRemove(agentUrl, args);
    return { data: result };
  }
}
