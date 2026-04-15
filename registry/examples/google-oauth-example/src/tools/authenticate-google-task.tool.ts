import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, InjectWorkflow, LinkDocument, Tool, ToolResult } from '@loopstack/common';
import { OAuthWorkflow } from '@loopstack/oauth-module';

const AuthenticateGoogleTaskInputSchema = z
  .object({
    scopes: z
      .array(z.string())
      .describe('The OAuth scopes to request (e.g. https://www.googleapis.com/auth/calendar.events)'),
    callback: z
      .object({
        transition: z.string(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .optional(),
  })
  .strict();

type AuthenticateGoogleTaskInput = z.infer<typeof AuthenticateGoogleTaskInputSchema>;

@Injectable()
@Tool({
  uiConfig: {
    description:
      'Launches Google OAuth authentication. Shows the user a sign-in prompt to authorize access to Google services. ' +
      'Use this when a Google tool returns an "unauthorized" error. ' +
      'Pass the required OAuth scopes for the Google APIs you need access to. ' +
      'IMPORTANT: When using this tool, it must be the ONLY tool call in your response. Do not combine it with other tool calls.',
  },
  schema: AuthenticateGoogleTaskInputSchema,
})
export class AuthenticateGoogleTask extends BaseTool {
  private readonly logger = new Logger(AuthenticateGoogleTask.name);

  @InjectWorkflow() private oAuth: OAuthWorkflow;

  async call(args: AuthenticateGoogleTaskInput): Promise<ToolResult> {
    const result = await this.oAuth.run(
      { provider: 'google', scopes: args.scopes },
      { alias: 'oAuth', callback: args.callback },
    );

    await this.repository.save(
      LinkDocument,
      {
        status: 'pending',
        label: 'Google authentication required',
        workflowId: result.workflowId,
        embed: true,
        expanded: true,
      },
      { id: `link_${result.workflowId}` },
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
        status: 'success',
        label: 'Google authentication completed',
        workflowId: data.workflowId,
      },
      { id: `link_${data.workflowId}` },
    );

    return {
      data: 'Google authentication completed successfully. You can now use Google Workspace tools.',
    };
  }
}
