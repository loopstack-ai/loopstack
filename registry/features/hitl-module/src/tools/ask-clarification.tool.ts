import { Inject } from '@nestjs/common';
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
import { AskUserWorkflow } from '../workflows/ask-user/ask-user.workflow.js';

const AskClarificationInputSchema = z
  .object({
    question: z
      .string()
      .describe('The clarification question to ask the user. Be specific about what information you need and why.'),
    mode: z
      .enum(['text', 'options', 'confirm'])
      .optional()
      .describe(
        'How the question is presented. "text" (default) shows a free-text input. ' +
          '"options" shows a list of choices for the user to pick from. ' +
          '"confirm" shows Yes / No buttons.',
      ),
    options: z
      .array(z.string())
      .optional()
      .describe('The list of choices when mode is "options". Required when mode is "options".'),
    allowCustomAnswer: z
      .boolean()
      .optional()
      .describe(
        'When mode is "options", set to true to show an additional free-text input ' +
          'so the user can provide a custom answer not in the list.',
      ),
  })
  .strict();

type AskClarificationInput = z.infer<typeof AskClarificationInputSchema>;

export type AskClarificationResult = { workflowId: string } | string | Record<string, unknown>;

@Tool({
  name: 'ask_clarification',
  description:
    'Ask the user a clarification question and wait for their answer. ' +
    'Use this when you need more information from the user before you can proceed. ' +
    'IMPORTANT: This must be the only tool call in your response.',
  schema: AskClarificationInputSchema,
})
export class AskClarificationTool extends BaseTool<AskClarificationInput, object, AskClarificationResult> {
  constructor(
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  protected async handle(
    args: AskClarificationInput,
    options?: ToolCallOptions,
  ): Promise<ToolResult<AskClarificationResult>> {
    const result = await this.orchestrator.queue(
      {
        question: args.question,
        mode: args.mode,
        options: args.options,
        allowCustomAnswer: args.allowCustomAnswer,
      },
      { workflowName: AskUserWorkflow.name, callback: options?.callback },
    );

    const workflowId = result.workflowId;

    await this.documentStore.save(
      LinkDocument,
      { status: 'pending', label: 'Waiting for user answer...', workflowId, embed: true, expanded: true },
      { id: `ask_clarification_link_${workflowId}` },
    );

    return {
      data: { workflowId },
      pending: { workflowId },
    };
  }

  async complete(result: Record<string, unknown>): Promise<ToolResult<AskClarificationResult>> {
    const data = result as { workflowId?: string; data?: { answer?: string } };

    await this.documentStore.save(
      LinkDocument,
      { status: 'success', label: 'User answered', workflowId: data.workflowId!, embed: true, expanded: false },
      { id: `ask_clarification_link_${data.workflowId}` },
    );

    return { data: data.data?.answer ?? result };
  }
}
