import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  BaseTool,
  DOCUMENT_STORE,
  LinkDocument,
  Tool,
  ToolCallOptions,
  ToolResult,
  WORKFLOW_ORCHESTRATOR,
  WorkflowOrchestrator,
} from '@loopstack/common';
import type { DocumentStore } from '@loopstack/common';
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
  uiConfig: {
    description:
      'Launches GitHub OAuth authentication. Shows the user a sign-in prompt to authorize access to GitHub. ' +
      'Use this when a GitHub tool returns an "unauthorized" error. ' +
      'Pass the required OAuth scopes for the GitHub APIs you need access to. ' +
      'IMPORTANT: When using this tool, it must be the ONLY tool call in your response. Do not combine it with other tool calls.',
  },
  schema: AuthenticateGitHubTaskInputSchema,
})
export class AuthenticateGitHubTask extends BaseTool<
  AuthenticateGitHubTaskInput,
  object,
  AuthenticateGitHubTaskResult
> {
  private readonly logger = new Logger(AuthenticateGitHubTask.name);

  constructor(
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  protected async handle(
    args: AuthenticateGitHubTaskInput,
    options?: ToolCallOptions,
  ): Promise<ToolResult<AuthenticateGitHubTaskResult>> {
    const result = await this.orchestrator.queue(
      { provider: 'github', scopes: args.scopes },
      { workflowName: OAuthWorkflow.name, callback: args.callback },
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
