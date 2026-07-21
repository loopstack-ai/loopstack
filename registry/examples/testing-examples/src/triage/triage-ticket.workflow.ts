import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext, TransitionInput } from '@loopstack/common';
import { ClassificationResult, ClassifyTicketTool } from './classify-ticket.tool';

const TriageTicketSchema = z.object({
  text: z.string(),
});

type TriageTicketArgs = z.infer<typeof TriageTicketSchema>;

interface TriageTicketState {
  severity?: 'high' | 'normal';
  reason?: string;
}

const ApprovalSchema = z.object({ approved: z.boolean() });

@Workflow({
  name: 'triage_ticket',
  title: 'Testing - Ticket Triage Example',
  description:
    'Classifies a support ticket with a tool, reports the severity as a document, and waits for a human approval — the example workflow behind the testing guide.',
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
      MessageDocument,
      { role: 'assistant', text: `Ticket severity: ${state.severity} (${state.reason})` },
      { key: 'triage_report' },
    );
  }

  @Transition({ from: 'awaiting_approval', to: 'end', wait: true, schema: ApprovalSchema })
  approve(state: TriageTicketState, input: TransitionInput<{ approved: boolean }>) {
    this.setResult({ severity: state.severity, approved: input.data.approved } as unknown as Record<string, unknown>);
  }
}
