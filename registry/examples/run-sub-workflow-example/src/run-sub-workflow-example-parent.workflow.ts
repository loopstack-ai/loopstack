import { z } from 'zod';
import {
  BaseWorkflow,
  CallbackSchema,
  Final,
  Initial,
  InjectTool,
  InjectWorkflow,
  QueueResult,
  Transition,
  Workflow,
} from '@loopstack/common';
import { LinkDocument } from '@loopstack/core';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
import { RunSubWorkflowExampleSubWorkflow } from './run-sub-workflow-example-sub.workflow';

const SubWorkflowCallbackSchema = CallbackSchema.extend({
  data: z.object({ message: z.string() }),
});

type SubWorkflowCallback = z.infer<typeof SubWorkflowCallbackSchema>;

@Workflow({
  uiConfig: __dirname + '/run-sub-workflow-example-parent.workflow.yaml',
})
export class RunSubWorkflowExampleParentWorkflow extends BaseWorkflow {
  @InjectTool() private createChatMessage: CreateChatMessage;
  @InjectWorkflow() private runSubWorkflowExampleSub: RunSubWorkflowExampleSubWorkflow;

  private subWorkflow1Id?: string;
  private subWorkflow2Id?: string;

  @Initial({ to: 'sub_workflow_started' })
  async runWorkflow() {
    const result: QueueResult = await this.runSubWorkflowExampleSub.run(
      {},
      { alias: 'runSubWorkflowExampleSub', callback: { transition: 'subWorkflowCallback' } },
    );

    this.subWorkflow1Id = result.workflowId;

    await this.repository.save(
      LinkDocument,
      {
        label: 'Executing Sub-Workflow...',
        href: `/workflows/${this.subWorkflow1Id}`,
      },
      { id: 'subWorkflow_link' },
    );
  }

  @Transition({
    from: 'sub_workflow_started',
    to: 'sub_workflow_ended',
    wait: true,
    schema: SubWorkflowCallbackSchema,
  })
  async subWorkflowCallback(payload: SubWorkflowCallback) {
    await this.repository.save(
      LinkDocument,
      {
        label: `Sub-Workflow ${payload.status}`,
        href: `/workflows/${payload.workflowId}`,
      },
      { id: 'subWorkflow_link' },
    );

    await this.createChatMessage.call({
      role: 'assistant',
      content: `A message from sub workflow 1: ${payload.data.message}`,
    });
  }

  @Transition({ from: 'sub_workflow_ended', to: 'sub_workflow2_started' })
  async runWorkflow2() {
    const result: QueueResult = await this.runSubWorkflowExampleSub.run(
      {},
      { alias: 'runSubWorkflowExampleSub', callback: { transition: 'subWorkflow2Callback' } },
    );

    this.subWorkflow2Id = result.workflowId;

    await this.repository.save(
      LinkDocument,
      {
        label: 'Executing Sub-Workflow 2...',
      },
      { id: 'subWorkflow2_link' },
    );
  }

  @Final({
    from: 'sub_workflow2_started',
    wait: true,
    schema: SubWorkflowCallbackSchema,
  })
  async subWorkflow2Callback(payload: SubWorkflowCallback) {
    await this.repository.save(
      LinkDocument,
      {
        label: `Sub-Workflow 2 ${payload.status}`,
      },
      { id: 'subWorkflow2_link' },
    );

    await this.createChatMessage.call({
      role: 'assistant',
      content: `A message from sub workflow 2: ${payload.data.message}`,
    });
  }
}
