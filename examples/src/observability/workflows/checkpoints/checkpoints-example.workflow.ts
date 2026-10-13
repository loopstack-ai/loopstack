import { z } from 'zod';
import { BaseWorkflow, Guard, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

interface CheckpointsState {
  amount: number;
}

const CheckpointsArgsSchema = z
  .object({
    amount: z.number().default(250),
  })
  .strict();

type CheckpointsArgs = z.infer<typeof CheckpointsArgsSchema>;

@Workflow({
  title: 'Observability - Checkpoints Example',
  description:
    'A short branching run whose checkpoint history you read afterwards — the places it passed, the transitions that moved it, and when. Read it with `loopstack runs <run-id>` or `client.workflows.checkpoints(id)`.',
  schema: CheckpointsArgsSchema,
})
export class CheckpointsExampleWorkflow extends BaseWorkflow<CheckpointsArgs> {
  @Transition({ to: 'received' })
  receive(_state: CheckpointsState, ctx: RunContext<CheckpointsArgs>) {
    this.assignState({ amount: ctx.args.amount });
  }

  // The branch taken is what the checkpoint history records: `approved` or `flagged`.

  @Transition({ from: 'received', to: 'approved', priority: 10 })
  @Guard('isWithinLimit')
  autoApprove() {}

  isWithinLimit(state: CheckpointsState): boolean {
    return state.amount <= 500;
  }

  @Transition({ from: 'received', to: 'flagged' })
  flagForReview() {}

  @Transition({ from: 'approved', to: 'end' })
  async finishApproved(state: CheckpointsState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Approved ${state.amount} automatically.`,
    });
  }

  @Transition({ from: 'flagged', to: 'end' })
  async finishFlagged(state: CheckpointsState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Flagged ${state.amount} for review — it is above the limit of 500.`,
    });
  }
}
