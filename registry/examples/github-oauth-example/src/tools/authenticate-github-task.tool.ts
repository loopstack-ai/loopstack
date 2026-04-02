import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, InjectDocument, InjectWorkflow, Input, Tool, ToolResult } from '@loopstack/common';
import { LinkDocument } from '@loopstack/core';
import { OAuthWorkflow } from '@loopstack/oauth-module';

const AuthenticateGitHubTaskInputSchema = z
  .object({
    scopes: z.array(z.string()).describe('The OAuth scopes to request (e.g. repo, user, workflow, read:org)'),
  })
  .strict();

type AuthenticateGitHubTaskInput = z.infer<typeof AuthenticateGitHubTaskInputSchema>;

@Injectable()
@Tool({
  config: {
    description:
      'Launches GitHub OAuth authentication. Shows the user a sign-in prompt to authorize access to GitHub. ' +
      'Use this when a GitHub tool returns an "unauthorized" error. ' +
      'Pass the required OAuth scopes for the GitHub APIs you need access to. ' +
      'IMPORTANT: When using this tool, it must be the ONLY tool call in your response. Do not combine it with other tool calls.',
  },
})
export class AuthenticateGitHubTask extends BaseTool {
  private readonly logger = new Logger(AuthenticateGitHubTask.name);

  @InjectWorkflow() private oAuth: OAuthWorkflow;
  @InjectDocument() private linkDocument: LinkDocument;

  @Input({ schema: AuthenticateGitHubTaskInputSchema })
  args: AuthenticateGitHubTaskInput;

  async run(args: AuthenticateGitHubTaskInput): Promise<ToolResult> {
    const result = await this.oAuth.run({
      args: { provider: 'github', scopes: args.scopes },
    });

    await this.linkDocument.create({
      id: 'github_auth_link',
      validate: 'skip',
      content: {
        status: 'pending',
        label: 'GitHub authentication required',
        href: `/workflows/${result.workflowId}`,
        embed: true,
        expanded: true,
      },
    });

    return {
      data: result,
    };
  }

  async complete(result: Record<string, unknown>): Promise<ToolResult> {
    const data = result as { workflowId?: string };

    await this.linkDocument.create({
      id: 'github_auth_link',
      validate: 'skip',
      content: {
        status: 'success',
        label: 'GitHub authentication completed',
        href: `/workflows/${data.workflowId}`,
      },
    });

    return {
      data: 'GitHub authentication completed successfully. You can now use GitHub tools.',
    };
  }
}
