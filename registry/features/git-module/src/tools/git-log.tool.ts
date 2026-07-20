import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

/**
 * Args for `GitLogTool`.
 *
 * @public
 */
export type GitLogArgs = {
  limit?: number;
};

/**
 * A single commit entry returned by `GitLogTool`.
 *
 * @public
 */
export type GitCommit = {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
};

/**
 * Result for `GitLogTool`.
 *
 * @public
 */
export type GitLogResult = {
  commits: GitCommit[];
};

/**
 * Tool that returns the git commit log for the workspace repository.
 *
 * @providedBy GitModule
 * @public
 */
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

  protected async handle(args: GitLogArgs): Promise<ToolEnvelope<GitLogResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitLog(agentUrl, args.limit);
    return { data: result };
  }
}
