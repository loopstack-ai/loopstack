import {
  Final,
  Initial,
  InjectDocument,
  InjectTool,
  InjectWorkflow,
  ToolResult,
  Transition,
  Workflow,
  WorkflowMetadataInterface,
} from '@loopstack/common';
import { LinkDocument, Task } from '@loopstack/core';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
import { RunSubWorkflowExampleSubWorkflow } from './run-sub-workflow-example-sub.workflow';

interface TaskRunResult {
  mode: string;
  correlationId: string;
  workflowId: string;
  eventName: string;
}

interface SubWorkflowCallbackPayload {
  workflowId: string;
  status: string;
  result: { message: string };
}

@Workflow({
  uiConfig: __dirname + '/run-sub-workflow-example-parent.workflow.yaml',
})
export class RunSubWorkflowExampleParentWorkflow {
  @InjectTool() private createChatMessage: CreateChatMessage;
  @InjectTool() private task: Task;
  @InjectDocument() private linkDocument: LinkDocument;
  @InjectWorkflow() private runSubWorkflowExampleSub: RunSubWorkflowExampleSubWorkflow;

  private runtime: WorkflowMetadataInterface;

  private subWorkflow1Id?: string;
  private subWorkflow2Id?: string;

  @Initial({ to: 'sub_workflow_started' })
  async runWorkflow() {
    const result: ToolResult<TaskRunResult> = await this.task.run({
      workflow: 'runSubWorkflowExampleSub',
      args: {},
      callback: { transition: 'subWorkflowCallback' },
    });

    this.subWorkflow1Id = result.data!.workflowId;

    await this.linkDocument.create({
      id: 'subWorkflow_link',
      content: {
        label: 'Executing Sub-Workflow...',
        href: `/workflows/${this.subWorkflow1Id}`,
      },
    });
  }

  @Transition({ from: 'sub_workflow_started', to: 'sub_workflow_ended', wait: true })
  async subWorkflowCallback() {
    const payload = this.runtime.transition!.payload as SubWorkflowCallbackPayload;

    await this.linkDocument.create({
      id: 'subWorkflow_link',
      content: {
        label: `Sub-Workflow ${payload.status}`,
        href: `/workflows/${payload.workflowId}`,
      },
    });

    await this.createChatMessage.run({
      role: 'assistant',
      content: `A message from sub workflow 1: ${payload.result.message}`,
    });
  }

  @Transition({ from: 'sub_workflow_ended', to: 'sub_workflow2_started' })
  async runWorkflow2() {
    const result: ToolResult<TaskRunResult> = await this.task.run({
      workflow: 'runSubWorkflowExampleSub',
      args: {},
      callback: { transition: 'subWorkflow2Callback' },
    });

    this.subWorkflow2Id = result.data!.workflowId;

    await this.linkDocument.create({
      id: 'subWorkflow2_link',
      content: {
        label: 'Executing Stateless Sub-Workflow...',
      },
    });
  }

  @Final({ from: 'sub_workflow2_started', wait: true })
  async subWorkflow2Callback() {
    const payload = this.runtime.transition!.payload as SubWorkflowCallbackPayload;

    await this.linkDocument.create({
      id: 'subWorkflow2_link',
      content: {
        label: `Stateless Sub-Workflow ${payload.status}`,
      },
    });

    await this.createChatMessage.run({
      role: 'assistant',
      content: `A message from sub workflow 2: ${payload.result.message}`,
    });
  }
}
