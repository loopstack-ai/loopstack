import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';

interface WorkflowResultState {
  name?: string;
}

@Workflow({
  title: 'Advanced - Workflow Result Example',
  description:
    'Publishing a result with assignResult() for callers and parent workflows, kept apart from private workflow state.',
})
export class WorkflowResultWorkflow extends BaseWorkflow {
  @Transition({ to: 'greeted' })
  greet() {
    const name = 'World';

    // State is private working data: only this workflow's transitions read it.
    this.assignState({ name });

    // The result is published: WorkflowRunner callers, parent callbacks and the API see it.
    this.assignResult({ greeting: `Hello ${name}.` });
  }

  @Transition({ from: 'greeted', to: 'end' })
  async shout(state: WorkflowResultState) {
    // assignResult() merges, so `greeting` from the first transition stays in the result.
    this.assignResult({ shout: `HELLO ${state.name!.toUpperCase()}!` });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Published result: { greeting, shout }. The name "${state.name}" stays in state and is not published.`,
    });
  }
}
