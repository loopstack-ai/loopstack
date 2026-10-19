import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { GitDirArgSchema, type GitDirArgs } from './git-dir.schema.js';

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
  /**
   * Git's own two status columns per path: `index` is what is staged, `worktree` what is not, each a space
   * when there is nothing. The lists above answer what changed; these tell an index change from a working-tree
   * one, which is what a caller that has just staged within a policy needs to ask what the policy left out.
   * The path is as git prints it, so a rename reads `old -> new`.
   */
  entries: { path: string; index: string; worktree: string }[];
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
  entries: z.array(z.strictObject({ path: z.string(), index: z.string(), worktree: z.string() })),
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
    'Gets the git status of the workspace. Returns the current branch, the staged, modified, untracked and ' +
    "deleted files, and each path's two status columns in `entries`.",
  schema: z.object({ dir: GitDirArgSchema }).strict(),
  resultSchema: GitStatusResultSchema,
  effects: 'none',
})
export class GitStatusTool extends BaseTool<GitDirArgs, object, GitStatusResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: GitDirArgs): Promise<ToolEnvelope<GitStatusResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitStatus(agentUrl, args);
    return { data: result };
  }
}
