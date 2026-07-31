import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

/**
 * Result for `GitStatusTool`.
 *
 * @public
 */
export type GitStatusResult = {
  branch: string;
  staged: string[];
  modified: string[];
  untracked: string[];
  deleted: string[];
};

/**
 * Zod schema for `GitStatusResult`.
 *
 * @public
 */
export const GitStatusResultSchema = z.strictObject({
  branch: z.string(),
  staged: z.array(z.string()),
  modified: z.array(z.string()),
  untracked: z.array(z.string()),
  deleted: z.array(z.string()),
});

/**
 * Tool that reports the git status of the workspace: current branch plus staged, modified,
 * untracked, and deleted files.
 *
 * @providedBy GitModule
 * @public
 */
@Tool({
  name: 'git_status',
  description:
    'Gets the git status of the workspace. Returns current branch, staged, modified, untracked, and deleted files.',
  schema: z.object({}).strict(),
  resultSchema: GitStatusResultSchema,
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
