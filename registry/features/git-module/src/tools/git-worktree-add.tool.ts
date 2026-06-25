import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

export const GitWorktreeAddSchema = z
  .object({
    path: z.string().describe('Filesystem path for the new worktree (relative to workspace root or absolute)'),
    branch: z.string().optional().describe('Branch to check out in the new worktree'),
    newBranch: z
      .boolean()
      .optional()
      .describe('Create the branch as part of adding the worktree (passes -b to git worktree add)'),
    force: z.boolean().optional().describe('Pass --force to git worktree add'),
  })
  .strict();

export type GitWorktreeAddArgs = z.infer<typeof GitWorktreeAddSchema>;

export type GitWorktreeAddResult = {
  success: boolean;
  path: string;
  output?: string;
};

@Tool({
  name: 'git_worktree_add',
  description:
    'Creates a new git worktree at the given path. Optionally checks out an existing branch or creates a new one with "newBranch: true".',
  schema: GitWorktreeAddSchema,
})
export class GitWorktreeAddTool extends BaseTool<GitWorktreeAddArgs, object, GitWorktreeAddResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: GitWorktreeAddArgs): Promise<ToolEnvelope<GitWorktreeAddResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitWorktreeAdd(agentUrl, args);
    return { data: result };
  }
}
