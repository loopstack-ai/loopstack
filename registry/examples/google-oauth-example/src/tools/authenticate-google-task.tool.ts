import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, InjectDocument, InjectWorkflow, Input, Tool, ToolResult } from '@loopstack/common';
import { LinkDocument } from '@loopstack/core';
import { OAuthWorkflow } from '@loopstack/oauth-module';

const AuthenticateGoogleTaskInputSchema = z
  .object({
    scopes: z
      .array(z.string())
      .describe('The OAuth scopes to request (e.g. https://www.googleapis.com/auth/calendar.events)'),
  })
  .strict();

type AuthenticateGoogleTaskInput = z.infer<typeof AuthenticateGoogleTaskInputSchema>;

@Injectable()
@Tool({
  config: {
    description:
      'Launches Google OAuth authentication. Shows the user a sign-in prompt to authorize access to Google services. ' +
      'Use this when a Google tool returns an "unauthorized" error. ' +
      'Pass the required OAuth scopes for the Google APIs you need access to. ' +
      'IMPORTANT: When using this tool, it must be the ONLY tool call in your response. Do not combine it with other tool calls.',
  },
})
export class AuthenticateGoogleTask extends BaseTool {
  private readonly logger = new Logger(AuthenticateGoogleTask.name);

  @InjectWorkflow() private oAuth: OAuthWorkflow;
  @InjectDocument() private linkDocument: LinkDocument;

  @Input({ schema: AuthenticateGoogleTaskInputSchema })
  args: AuthenticateGoogleTaskInput;

  async run(args: AuthenticateGoogleTaskInput): Promise<ToolResult> {
    const result = await this.oAuth.run({
      args: { provider: 'google', scopes: args.scopes },
    });

    await this.linkDocument.create({
      id: 'google_auth_link',
      validate: 'skip',
      content: {
        status: 'pending',
        label: 'Google authentication required',
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
      id: 'google_auth_link',
      validate: 'skip',
      content: {
        status: 'success',
        label: 'Google authentication completed',
        href: `/workflows/${data.workflowId}`,
      },
    });

    return {
      data: 'Google authentication completed successfully. You can now use Google Workspace tools.',
    };
  }
}
