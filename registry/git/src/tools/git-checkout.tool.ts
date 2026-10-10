import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

/**
 * Args for `GitCheckoutTool`.
 *
 * @public
 */
export type GitCheckoutArgs = {
  branch: string;
  create?: boolean;
};

/**
 * Result for `GitCheckoutTool`.
 *
 * @public
 */
export type GitCheckoutResult = { branch: string };

/**
 * Zod schema for `GitCheckoutResult`.
 *
 * @public
 */
export const GitCheckoutResultSchema = z.strictObject({ branch: z.string() });

/**
 * Tool that switches to a different git branch, optionally creating it.
 *
 * @providedBy GitModule
 * @public
 */
@Tool({
  name: 'git_checkout',
  description: 'Switches to a different git branch, optionally creating it.',
  schema: z
    .object({
      branch: z.string().describe('Branch name to switch to'),
      create: z.boolean().optional().describe('Create the branch if it does not exist'),
    })
    .strict(),
  resultSchema: GitCheckoutResultSchema,
  effects: 'external',
})
export class GitCheckoutTool extends BaseTool<GitCheckoutArgs, object, GitCheckoutResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: GitCheckoutArgs): Promise<ToolEnvelope<GitCheckoutResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitCheckout(agentUrl, args.branch, args.create);
    return { data: result };
  }
}
