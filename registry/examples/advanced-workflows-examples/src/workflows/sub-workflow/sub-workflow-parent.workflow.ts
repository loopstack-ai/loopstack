import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, type TransitionInput, Workflow } from '@loopstack/common';
import { RunSubWorkflowExampleSubWorkflow } from './sub-workflow-sub.workflow';

const SubWorkflowMessageSchema = z.object({ message: z.string() });

@Workflow({
  title: 'Advanced - Sub-Workflow Example',
  description:
    'Launches a child workflow via .run() and resumes when it completes — basic parent/child composition pattern.',
})
export class RunSubWorkflowExampleParentWorkflow extends BaseWorkflow {
  constructor(private readonly subWorkflow: RunSubWorkflowExampleSubWorkflow) {
    super();
  }

  @Transition({ to: 'sub_workflow_started' })
  async runWorkflow(_state: Record<string, unknown>) {
    await this.subWorkflow.run(
      {},
      { callback: { transition: 'subWorkflowCallback' }, show: 'link', label: 'Sub-Workflow' },
    );
  }

  @Transition({
    from: 'sub_workflow_started',
    to: 'sub_workflow_ended',
    wait: true,
    schema: SubWorkflowMessageSchema,
  })
  async subWorkflowCallback(state: Record<string, unknown>, input: TransitionInput<{ message: string }>) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `A message from sub workflow 1: ${input.data.message}`,
    });
  }

  @Transition({ from: 'sub_workflow_ended', to: 'sub_workflow2_started' })
  async runWorkflow2(_state: Record<string, unknown>) {
    await this.subWorkflow.run(
      {},
      { callback: { transition: 'subWorkflow2Callback' }, show: 'link', label: 'Sub-Workflow 2' },
    );
  }

  @Transition({
    from: 'sub_workflow2_started',
    to: 'end',
    wait: true,
    schema: SubWorkflowMessageSchema,
  })
  async subWorkflow2Callback(state: Record<string, unknown>, input: TransitionInput<{ message: string }>) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `A message from sub workflow 2: ${input.data.message}`,
    });
  }
}
