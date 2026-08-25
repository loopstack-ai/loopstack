import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext, TransitionInput } from '@loopstack/common';
import { ApprovalPromptDocument } from './approval-prompt.document';
import { ClassificationResult, ClassifyTicketTool } from './classify-ticket.tool';

const TriageTicketSchema = z.object({
  text: z.string(),
});

type TriageTicketArgs = z.infer<typeof TriageTicketSchema>;

interface TriageTicketState {
  severity?: 'high' | 'normal';
  reason?: string;
}

const ApprovalSchema = z.object({ answer: z.enum(['yes', 'no']) });

@Workflow({
  name: 'triage_ticket',
  title: 'Testing - Ticket Triage Example',
  description:
    'Classifies a support ticket with a tool, presents the severity as a yes/no approval prompt, and waits for the human decision — the example workflow behind the testing guide.',
  schema: TriageTicketSchema,
})
export class TriageTicketWorkflow extends BaseWorkflow<TriageTicketArgs> {
  constructor(private readonly classifyTicket: ClassifyTicketTool) {
    super();
  }

  @Transition({ to: 'classified' })
  async classify(state: TriageTicketState, ctx: RunContext<TriageTicketArgs>) {
    const result = await this.classifyTicket.call({ text: ctx.args.text });
    const { severity, reason } = result.data as ClassificationResult;
    this.assignState({ severity, reason });
  }

  @Transition({ from: 'classified', to: 'awaiting_approval' })
  async report(state: TriageTicketState) {
    await this.documentStore.save(
      ApprovalPromptDocument,
      {
        severity: state.severity!,
        question: `Ticket severity: ${state.severity} (${state.reason}). Approve this classification?`,
      },
      { key: 'approval_prompt' },
    );
  }

  @Transition({ from: 'awaiting_approval', to: 'end', wait: true, schema: ApprovalSchema })
  approve(state: TriageTicketState, input: TransitionInput<{ answer: 'yes' | 'no' }>) {
    this.setResult({ severity: state.severity, approved: input.data.answer === 'yes' } as unknown as Record<
      string,
      unknown
    >);
  }
}
