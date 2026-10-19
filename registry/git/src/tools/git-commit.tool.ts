import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { GitDirArgSchema } from './git-dir.schema.js';

/**
 * Args for `GitCommitTool`.
 *
 * @public
 */
export type GitCommitArgs = {
  message: string;
  authorName?: string;
  authorEmail?: string;
  skipHooks?: boolean;
  dir?: string;
};

/**
 * Result for `GitCommitTool`.
 *
 * @public
 */
export type GitCommitResult = { hash: string; message: string };

/**
 * Zod schema for `GitCommitResult`.
 *
 * @public
 */
export const GitCommitResultSchema = z.strictObject({ hash: z.string(), message: z.string() });

/**
 * Tool that creates a git commit from the currently staged changes.
 *
 * @providedBy GitModule
 * @public
 */
@Tool({
  name: 'git_commit',
  description:
    'Creates a git commit with the currently staged changes. An author name and email apply to this commit ' +
    "only, leaving the repository's own config as it is.",
  schema: z
    .object({
      message: z.string().describe('The commit message'),
      authorName: z.string().optional().describe('Author of this commit; goes with authorEmail.'),
      authorEmail: z.string().optional().describe('Author email of this commit; goes with authorName.'),
      skipHooks: z.boolean().optional().describe("Do not run the repository's commit hooks."),
      dir: GitDirArgSchema,
    })
    .strict(),
  resultSchema: GitCommitResultSchema,
  effects: 'external',
})
export class GitCommitTool extends BaseTool<GitCommitArgs, object, GitCommitResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: GitCommitArgs): Promise<ToolEnvelope<GitCommitResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitCommit(agentUrl, args);
    return { data: result };
  }
}
