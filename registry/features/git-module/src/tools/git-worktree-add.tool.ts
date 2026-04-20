import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteClient, SandboxEnvironmentService } from '@loopstack/remote-client';

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

@Tool({
  schema: GitWorktreeAddSchema,
  uiConfig: {
    description:
      'Creates a new git worktree at the given path. Optionally checks out an existing branch or creates a new one with "newBranch: true".',
  },
})
export class GitWorktreeAddTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(args: GitWorktreeAddArgs): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.gitWorktreeAdd(agentUrl, args);
    return { data: result };
  }
}
