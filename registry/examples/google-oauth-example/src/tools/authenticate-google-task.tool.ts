import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, LinkDocument, Tool, ToolCallOptions, ToolResult } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
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

export type AuthenticateGoogleTaskResult = { workflowId: string; mode: string; [key: string]: unknown } | string;

@Tool({
  name: 'authenticate_google',
  description:
    'Launches Google OAuth authentication. Shows the user a sign-in prompt to authorize access to Google services. ' +
    'Use this when a Google tool returns an "unauthorized" error. ' +
    'Pass the required OAuth scopes for the Google APIs you need access to. ' +
    'IMPORTANT: When using this tool, it must be the ONLY tool call in your response. Do not combine it with other tool calls.',
  schema: AuthenticateGoogleTaskInputSchema,
})
export class AuthenticateGoogleTask extends BaseTool<
  AuthenticateGoogleTaskInput,
  object,
  AuthenticateGoogleTaskResult
> {
  private readonly logger = new Logger(AuthenticateGoogleTask.name);

  constructor(private readonly oAuthWorkflow: OAuthWorkflow) {
    super();
  }

  protected async handle(
    args: AuthenticateGoogleTaskInput,
    ctx: LoopstackContext,
    options?: ToolCallOptions,
  ): Promise<ToolResult<AuthenticateGoogleTaskResult>> {
    const result = await this.oAuthWorkflow.run(
      { provider: 'google', scopes: args.scopes },
      { callback: options?.callback ?? args.callback },
    );

    await this.documentStore.save(
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
      pending: { workflowId: result.workflowId },
    };
  }

  async complete(result: Record<string, unknown>): Promise<ToolResult<AuthenticateGoogleTaskResult>> {
    const data = result as { workflowId?: string };

    await this.documentStore.save(
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
