import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

export type GitCheckoutArgs = {
  branch: string;
  create?: boolean;
};

export type GitCheckoutResult = { branch: string };

@Tool({
  name: 'git_checkout',
  description: 'Switches to a different git branch, optionally creating it.',
  schema: z
    .object({
      branch: z.string().describe('Branch name to switch to'),
      create: z.boolean().optional().describe('Create the branch if it does not exist'),
    })
    .strict(),
})
export class GitCheckoutTool extends BaseTool<GitCheckoutArgs, object, GitCheckoutResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: GitCheckoutArgs): Promise<ToolResult<GitCheckoutResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitCheckout(agentUrl, args.branch, args.create);
    return { data: result };
  }
}
