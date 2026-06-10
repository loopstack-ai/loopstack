import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, LinkDocument, Tool, ToolCallOptions, ToolResult } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { OAuthWorkflow } from '@loopstack/oauth-module';

const AuthenticateGitHubTaskInputSchema = z
  .object({
    scopes: z.array(z.string()).describe('The OAuth scopes to request (e.g. repo, user, workflow, read:org)'),
    callback: z
      .object({
        transition: z.string(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .optional(),
  })
  .strict();

type AuthenticateGitHubTaskInput = z.infer<typeof AuthenticateGitHubTaskInputSchema>;

export type AuthenticateGitHubTaskResult = { workflowId: string; mode: string; [key: string]: unknown } | string;

@Tool({
  name: 'authenticate_github',
  description:
    'Launches GitHub OAuth authentication. Shows the user a sign-in prompt to authorize access to GitHub. ' +
    'Use this when a GitHub tool returns an "unauthorized" error. ' +
    'Pass the required OAuth scopes for the GitHub APIs you need access to. ' +
    'IMPORTANT: When using this tool, it must be the ONLY tool call in your response. Do not combine it with other tool calls.',
  schema: AuthenticateGitHubTaskInputSchema,
})
export class AuthenticateGitHubTask extends BaseTool<
  AuthenticateGitHubTaskInput,
  object,
  AuthenticateGitHubTaskResult
> {
  private readonly logger = new Logger(AuthenticateGitHubTask.name);

  constructor(private readonly oAuthWorkflow: OAuthWorkflow) {
    super();
  }

  protected async handle(
    args: AuthenticateGitHubTaskInput,
    ctx: RunContext,
    options?: ToolCallOptions,
  ): Promise<ToolResult<AuthenticateGitHubTaskResult>> {
    const result = await this.oAuthWorkflow.run(
      { provider: 'github', scopes: args.scopes },
      { callback: options?.callback ?? args.callback },
    );

    await this.documentStore.save(
      LinkDocument,
      {
        status: 'pending',
        label: 'GitHub authentication required',
        workflowId: result.workflowId,
        embed: true,
        expanded: true,
      },
      { id: `link_${result.workflowId}` },
    );

    return {
      data: { ...result, mode: 'async' },
      pending: { workflowId: result.workflowId },
    };
  }

  async complete(result: Record<string, unknown>): Promise<ToolResult<AuthenticateGitHubTaskResult>> {
    const data = result as { workflowId?: string };

    await this.documentStore.save(
      LinkDocument,
      {
        status: 'success',
        label: 'GitHub authentication completed',
        workflowId: data.workflowId,
      },
      { id: `link_${data.workflowId}` },
    );

    return {
      data: 'GitHub authentication completed successfully. You can now use GitHub tools.',
    };
  }
}
