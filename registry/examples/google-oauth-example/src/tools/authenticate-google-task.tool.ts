import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  InjectDocument,
  InjectTool,
  Input,
  RunContext,
  Tool,
  ToolInterface,
  ToolResult,
  ToolSideEffects,
  WorkflowInterface,
  WorkflowMetadataInterface,
} from '@loopstack/common';
import { CreateDocument, LinkDocument, Task } from '@loopstack/core';

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
export class AuthenticateGoogleTask implements ToolInterface<AuthenticateGoogleTaskInput> {
  private readonly logger = new Logger(AuthenticateGoogleTask.name);

  @InjectTool() private task: Task;
  @InjectTool() private createDocument: CreateDocument;
  @InjectDocument() private linkDocument: LinkDocument;

  @Input({ schema: AuthenticateGoogleTaskInputSchema })
  args: AuthenticateGoogleTaskInput;

  async execute(
    args: AuthenticateGoogleTaskInput,
    ctx: RunContext,
    parent: WorkflowInterface | ToolInterface,
    metadata: WorkflowMetadataInterface,
  ): Promise<ToolResult> {
    const taskResult = await this.task.execute(
      { workflow: 'oAuth', args: { provider: 'google', scopes: args.scopes } },
      ctx,
      parent,
    );

    const effects: ToolSideEffects[] = [];

    const linkResult = await this.createDocument.execute(
      {
        document: 'linkDocument',
        id: 'google_auth_link',
        validate: 'skip' as const,
        update: {
          content: {
            status: 'pending',
            label: 'Google authentication required',
            href: `/pipelines/${String((taskResult.data as Record<string, unknown>).pipelineId)}`,
            embed: true,
            expanded: true,
          },
        },
      },
      ctx,
      this,
      metadata,
    );
    if (linkResult.effects) {
      effects.push(...linkResult.effects);
    }

    return {
      data: taskResult.data as Record<string, unknown>,
      effects,
    };
  }

  async complete(
    result: Record<string, unknown>,
    ctx: RunContext,
    parent: WorkflowInterface | ToolInterface,
    metadata: WorkflowMetadataInterface,
  ): Promise<ToolResult> {
    const data = result as { pipelineId?: string };

    const effects: ToolSideEffects[] = [];

    const linkResult = await this.createDocument.execute(
      {
        document: 'linkDocument',
        id: 'google_auth_link',
        validate: 'skip' as const,
        update: {
          content: {
            status: 'success',
            label: 'Google authentication completed',
            href: `/pipelines/${data.pipelineId}`,
          },
        },
      },
      ctx,
      this,
      metadata,
    );
    if (linkResult.effects) {
      effects.push(...linkResult.effects);
    }

    return {
      data: 'Google authentication completed successfully. You can now use Google Workspace tools.',
      effects,
    };
  }
}
