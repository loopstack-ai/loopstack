import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, InjectWorkflow, Tool, ToolResult } from '@loopstack/common';
import { LinkDocument } from '@loopstack/core';
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

@Injectable()
@Tool({
  uiConfig: {
    description:
      'Launches GitHub OAuth authentication. Shows the user a sign-in prompt to authorize access to GitHub. ' +
      'Use this when a GitHub tool returns an "unauthorized" error. ' +
      'Pass the required OAuth scopes for the GitHub APIs you need access to. ' +
      'IMPORTANT: When using this tool, it must be the ONLY tool call in your response. Do not combine it with other tool calls.',
  },
  schema: AuthenticateGitHubTaskInputSchema,
})
export class AuthenticateGitHubTask extends BaseTool {
  private readonly logger = new Logger(AuthenticateGitHubTask.name);

  @InjectWorkflow() private oAuth: OAuthWorkflow;

  async call(args: AuthenticateGitHubTaskInput): Promise<ToolResult> {
    const result = await this.oAuth.run(
      { provider: 'github', scopes: args.scopes },
      { alias: 'oAuth', callback: args.callback },
    );

    await this.repository.save(
      LinkDocument,
      {
        id: 'github_auth_link',
        status: 'pending',
        label: 'GitHub authentication required',
        href: `/workflows/${result.workflowId}`,
        embed: true,
        expanded: true,
      },
      { validate: 'skip' },
    );

    return {
      data: { ...result, mode: 'async' },
    };
  }

  async complete(result: Record<string, unknown>): Promise<ToolResult> {
    const data = result as { workflowId?: string };

    await this.repository.save(
      LinkDocument,
      {
        id: 'github_auth_link',
        status: 'success',
        label: 'GitHub authentication completed',
        href: `/workflows/${data.workflowId}`,
      },
      { validate: 'skip' },
    );

    return {
      data: 'GitHub authentication completed successfully. You can now use GitHub tools.',
    };
  }
}
