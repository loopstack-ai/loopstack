import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

export type GitWorktree = {
  path: string;
  head?: string;
  branch?: string;
  bare: boolean;
  detached: boolean;
  locked?: string;
  prunable?: string;
};

export type GitWorktreeListResult = {
  worktrees: GitWorktree[];
};

@Tool({
  name: 'git_worktree_list',
  description:
    'Lists all git worktrees attached to the repository. Each entry includes path, HEAD commit, branch, and flags (bare, detached, locked, prunable).',
  schema: z.object({}).strict(),
})
export class GitWorktreeListTool extends BaseTool<object, object, GitWorktreeListResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(_args: object, _ctx: LoopstackContext): Promise<ToolResult<GitWorktreeListResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitWorktreeList(agentUrl);
    return { data: result };
  }
}
