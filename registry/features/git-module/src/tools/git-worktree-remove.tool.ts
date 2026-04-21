import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteClient, SandboxEnvironmentService } from '@loopstack/remote-client';

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

@Tool({
  schema: GitWorktreeRemoveSchema,
  uiConfig: {
    description: 'Removes a git worktree at the given path. Use force=true to remove dirty or locked worktrees.',
  },
})
export class GitWorktreeRemoveTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(args: GitWorktreeRemoveArgs): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.gitWorktreeRemove(agentUrl, args);
    return { data: result };
  }
}
