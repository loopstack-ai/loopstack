import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

export type GitStatusResult = {
  branch: string;
  staged: string[];
  modified: string[];
  untracked: string[];
  deleted: string[];
};

@Tool({
  name: 'git_status',
  description:
    'Gets the git status of the workspace. Returns current branch, staged, modified, untracked, and deleted files.',
  schema: z.object({}).strict(),
})
export class GitStatusTool extends BaseTool<object, object, GitStatusResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(): Promise<ToolEnvelope<GitStatusResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitStatus(agentUrl);
    return { data: result };
  }
}
