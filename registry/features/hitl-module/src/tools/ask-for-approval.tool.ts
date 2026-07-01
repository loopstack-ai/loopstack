import { z } from 'zod';
import { BaseTool, Tool, ToolCallOptions, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { ConfirmUserWorkflow } from '../workflows/confirm-user/confirm-user.workflow.js';

const AskForApprovalInputSchema = z
  .object({
    concept: z.string().describe('The final concept as a markdown string to present for user approval.'),
  })
  .strict();

type AskForApprovalInput = z.infer<typeof AskForApprovalInputSchema>;

/**
 * Result returned by `AskForApprovalTool` — the pending `workflowId` while waiting,
 * then the approved `concept` or a `denied` flag once the user decides.
 *
 * @public
 */
export type AskForApprovalResult = { workflowId: string } | { concept: string | undefined } | { denied: true };

/**
 * Tool that presents a concept to the user for approval and waits for their decision.
 *
 * Runs the {@link ConfirmUserWorkflow} as an inline sub-workflow, rendering the `concept`
 * markdown with a confirm button and pausing the agent loop until the user approves or
 * denies. Returns an {@link AskForApprovalResult}.
 *
 * @providedBy HitlModule
 * @public
 */
@Tool({
  name: 'ask_for_approval',
  description:
    'Present the final concept to the user for approval. The concept is shown as formatted markdown ' +
    'with a confirm button. Call this when the user indicates the concept is complete. ' +
    'IMPORTANT: This must be the only tool call in your response.',
  schema: AskForApprovalInputSchema,
})
export class AskForApprovalTool extends BaseTool<AskForApprovalInput, object, AskForApprovalResult> {
  constructor(private readonly confirmUserWorkflow: ConfirmUserWorkflow) {
    super();
  }

  protected async handle(
    args: AskForApprovalInput,
    ctx: RunContext,
    options?: ToolCallOptions,
  ): Promise<ToolEnvelope<AskForApprovalResult>> {
    const result = await this.confirmUserWorkflow.run(
      { markdown: args.concept },
      { callback: options?.callback, show: 'inline', label: 'Waiting for approval...' },
    );

    return {
      data: { workflowId: result.workflowId },
      pending: { workflowId: result.workflowId },
    };
  }

  async complete(result: Record<string, unknown>): Promise<ToolEnvelope<AskForApprovalResult>> {
    const data = result as { data?: { confirmed: boolean; markdown?: string } };
    const approved = data.data?.confirmed ?? false;
    return { data: approved ? { concept: data.data?.markdown } : { denied: true } };
  }
}
