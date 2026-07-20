import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

/**
 * Args for `GitDiffTool`.
 *
 * @public
 */
export type GitDiffArgs = {
  staged?: boolean;
};

/**
 * A single changed file entry returned by `GitDiffTool`.
 *
 * @public
 */
export type GitDiffFile = {
  path: string;
  status: string;
};

/**
 * Result for `GitDiffTool`.
 *
 * @public
 */
export type GitDiffResult = {
  files: GitDiffFile[];
};

/**
 * Tool that lists changed files in the workspace with their change status.
 *
 * @providedBy GitModule
 * @public
 */
@Tool({
  name: 'git_diff',
  description: 'Shows changed files in the workspace. Returns file paths and their change status.',
  schema: z
    .object({
      staged: z.boolean().optional().describe('Show staged changes instead of unstaged'),
    })
    .strict(),
})
export class GitDiffTool extends BaseTool<GitDiffArgs, object, GitDiffResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: GitDiffArgs): Promise<ToolEnvelope<GitDiffResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitDiff(agentUrl, args.staged);
    return { data: result };
  }
}
