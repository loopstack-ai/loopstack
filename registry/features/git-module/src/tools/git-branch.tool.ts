import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

export type GitBranchResult = {
  current: string;
  branches: { name: string; isCurrent: boolean }[];
};

@Tool({
  name: 'git_branch',
  description: 'Lists all local git branches and indicates the current branch.',
  schema: z.object({}).strict(),
})
export class GitBranchTool extends BaseTool<object, object, GitBranchResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(_args: object, _ctx: LoopstackContext): Promise<ToolResult<GitBranchResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitBranches(agentUrl);
    return { data: result };
  }
}
