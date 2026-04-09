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
  uiConfig: __dirname + '/run-sub-workflow-example-parent.ui.yaml',
})
export class RunSubWorkflowExampleParentWorkflow extends BaseWorkflow {
  @InjectTool() private createChatMessage: CreateChatMessage;
  @InjectWorkflow() private runSubWorkflowExampleSub: RunSubWorkflowExampleSubWorkflow;

  @Initial({ to: 'sub_workflow_started' })
  async runWorkflow() {
    const result: QueueResult = await this.runSubWorkflowExampleSub.run(
      {},
      { alias: 'runSubWorkflowExampleSub', callback: { transition: 'subWorkflowCallback' } },
    );

    await this.repository.save(
      LinkDocument,
      {
        label: 'Executing Sub-Workflow...',
        workflowId: result.workflowId,
      },
      { id: `link_${result.workflowId}` },
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
        label: 'Sub-Workflow',
        status: 'success',
        workflowId: payload.workflowId,
      },
      { id: `link_${payload.workflowId}` },
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

    await this.repository.save(
      LinkDocument,
      {
        label: 'Executing Sub-Workflow 2...',
        workflowId: result.workflowId,
      },
      { id: `link_${result.workflowId}` },
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
        label: 'Sub-Workflow 2',
        status: 'success',
        workflowId: payload.workflowId,
      },
      { id: `link_${payload.workflowId}` },
    );

    await this.createChatMessage.call({
      role: 'assistant',
      content: `A message from sub workflow 2: ${payload.data.message}`,
    });
  }
}
