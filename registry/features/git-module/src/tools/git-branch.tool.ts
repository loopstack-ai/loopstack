import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

/**
 * Result for `GitBranchTool`.
 *
 * @public
 */
export type GitBranchResult = {
  current: string;
  branches: { name: string; isCurrent: boolean }[];
};

/**
 * Tool that lists all local git branches and indicates the current branch.
 *
 * @providedBy GitModule
 * @public
 */
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

  protected async handle(): Promise<ToolEnvelope<GitBranchResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitBranches(agentUrl);
    return { data: result };
  }
}
