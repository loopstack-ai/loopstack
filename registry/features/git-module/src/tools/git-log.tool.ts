import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

export type GitLogArgs = {
  limit?: number;
};

export type GitCommit = {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
};

export type GitLogResult = {
  commits: GitCommit[];
};

@Tool({
  name: 'git_log',
  description: 'Shows the git commit log for the workspace repository.',
  schema: z
    .object({
      limit: z.number().optional().default(20).describe('Maximum number of log entries to return'),
    })
    .strict(),
})
export class GitLogTool extends BaseTool<GitLogArgs, object, GitLogResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: GitLogArgs, _ctx: LoopstackContext): Promise<ToolResult<GitLogResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitLog(agentUrl, args.limit);
    return { data: result };
  }
}
