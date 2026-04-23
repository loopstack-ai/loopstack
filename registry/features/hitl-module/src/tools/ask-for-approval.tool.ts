import { z } from 'zod';
import { BaseTool, InjectWorkflow, LinkDocument, Tool, ToolCallOptions, ToolResult } from '@loopstack/common';
import { ConfirmUserWorkflow } from '../workflows/confirm-user/confirm-user.workflow';

const AskForApprovalInputSchema = z
  .object({
    concept: z.string().describe('The final concept as a markdown string to present for user approval.'),
  })
  .strict();

type AskForApprovalInput = z.infer<typeof AskForApprovalInputSchema>;

@Tool({
  uiConfig: {
    description:
      'Present the final concept to the user for approval. The concept is shown as formatted markdown ' +
      'with a confirm button. Call this when the user indicates the concept is complete. ' +
      'IMPORTANT: This must be the only tool call in your response.',
  },
  schema: AskForApprovalInputSchema,
})
export class AskForApprovalTool extends BaseTool {
  @InjectWorkflow() private confirmUser: ConfirmUserWorkflow;

  async call(args: AskForApprovalInput, options?: ToolCallOptions): Promise<ToolResult> {
    const result = await this.confirmUser.run(
      { markdown: args.concept },
      { alias: 'confirmUser', callback: options?.callback },
    );

    const workflowId = result.workflowId;

    await this.repository.save(
      LinkDocument,
      { status: 'pending', label: 'Waiting for approval...', workflowId, embed: true, expanded: true },
      { id: `ask_for_approval_link_${workflowId}` },
    );

    return {
      data: { workflowId },
      pending: { workflowId },
    };
  }

  async complete(result: Record<string, unknown>): Promise<ToolResult> {
    const data = result as { workflowId?: string; data?: { confirmed: boolean; markdown?: string } };
    const approved = data.data?.confirmed ?? false;

    await this.repository.save(
      LinkDocument,
      {
        status: approved ? 'success' : 'failure',
        label: approved ? 'Concept approved' : 'Concept denied',
        workflowId: data.workflowId!,
        embed: true,
        expanded: false,
      },
      { id: `ask_for_approval_link_${data.workflowId}` },
    );

    return { data: approved ? { concept: data.data?.markdown } : { denied: true } };
  }
}
