import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

/**
 * Args for `GitAddTool`.
 *
 * @public
 */
export type GitAddArgs = {
  files: string[];
};

/**
 * Result for `GitAddTool`.
 *
 * @public
 */
export type GitAddResult = { success: boolean };

/**
 * Zod schema for `GitAddResult`.
 *
 * @public
 */
export const GitAddResultSchema = z.strictObject({ success: z.boolean() });

/**
 * Tool that stages files for the next git commit.
 *
 * @providedBy GitModule
 * @public
 */
@Tool({
  name: 'git_add',
  description: 'Stages files for the next git commit.',
  schema: z
    .object({
      files: z.array(z.string()).describe('File paths to stage. Use ["."] to stage all changes.'),
    })
    .strict(),
  resultSchema: GitAddResultSchema,
})
export class GitAddTool extends BaseTool<GitAddArgs, object, GitAddResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: GitAddArgs): Promise<ToolEnvelope<GitAddResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitAdd(agentUrl, args.files);
    return { data: result };
  }
}
