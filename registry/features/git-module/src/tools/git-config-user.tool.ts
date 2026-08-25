import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

/**
 * Args for `GitConfigUserTool`.
 *
 * @public
 */
export type GitConfigUserArgs = {
  name: string;
  email: string;
};

/**
 * Result for `GitConfigUserTool`.
 *
 * @public
 */
export type GitConfigUserResult = { success: boolean };

/**
 * Zod schema for `GitConfigUserResult`.
 *
 * @public
 */
export const GitConfigUserResultSchema = z.strictObject({ success: z.boolean() });

/**
 * Tool that configures git `user.name` and `user.email` for the workspace repository.
 *
 * @providedBy GitModule
 * @public
 */
@Tool({
  name: 'git_config_user',
  description: 'Configures git user.name and user.email for the workspace repository.',
  schema: z
    .object({
      name: z.string().describe('Git user name (user.name)'),
      email: z.string().describe('Git user email (user.email)'),
    })
    .strict(),
  resultSchema: GitConfigUserResultSchema,
  effects: 'external',
})
export class GitConfigUserTool extends BaseTool<GitConfigUserArgs, object, GitConfigUserResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: GitConfigUserArgs): Promise<ToolEnvelope<GitConfigUserResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitConfigUser(agentUrl, args.name, args.email);
    return { data: result };
  }
}
