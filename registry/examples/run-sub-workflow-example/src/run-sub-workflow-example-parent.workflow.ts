import { Inject } from '@nestjs/common';
import { z } from 'zod';
import {
  BaseWorkflow,
  CallbackSchema,
  DOCUMENT_STORE,
  Final,
  Initial,
  LinkDocument,
  MessageDocument,
  QueueResult,
  Transition,
  WORKFLOW_ORCHESTRATOR,
  Workflow,
  WorkflowOrchestrator,
} from '@loopstack/common';
import type { DocumentStore, WorkflowContext } from '@loopstack/common';
import { RunSubWorkflowExampleSubWorkflow } from './run-sub-workflow-example-sub.workflow';

const SubWorkflowCallbackSchema = CallbackSchema.extend({
  data: z.object({ message: z.string() }),
});

type SubWorkflowCallback = z.infer<typeof SubWorkflowCallbackSchema>;

interface SubWorkflowParentState {}

@Workflow({
  uiConfig: __dirname + '/run-sub-workflow-example-parent.ui.yaml',
})
export class RunSubWorkflowExampleParentWorkflow extends BaseWorkflow<Record<string, unknown>, SubWorkflowParentState> {
  constructor(
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  @Initial({ to: 'sub_workflow_started' })
  async runWorkflow(
    ctx: WorkflowContext,
    args: Record<string, unknown>,
    state: SubWorkflowParentState,
  ): Promise<SubWorkflowParentState> {
    const result: QueueResult = await this.orchestrator.queue(
      {},
      {
        workflowName: RunSubWorkflowExampleSubWorkflow.name,
        callback: { transition: 'subWorkflowCallback' },
      },
    );

    await this.documentStore.save(
      LinkDocument,
      {
        label: 'Executing Sub-Workflow...',
        workflowId: result.workflowId,
      },
      { id: `link_${result.workflowId}` },
    );
    return state;
  }

  @Transition({
    from: 'sub_workflow_started',
    to: 'sub_workflow_ended',
    wait: true,
    schema: SubWorkflowCallbackSchema,
  })
  async subWorkflowCallback(
    ctx: WorkflowContext,
    state: SubWorkflowParentState,
    payload: SubWorkflowCallback,
  ): Promise<SubWorkflowParentState> {
    await this.documentStore.save(
      LinkDocument,
      {
        label: 'Sub-Workflow',
        status: 'success',
        workflowId: payload.workflowId,
      },
      { id: `link_${payload.workflowId}` },
    );

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `A message from sub workflow 1: ${payload.data.message}`,
    });
    return state;
  }

  @Transition({ from: 'sub_workflow_ended', to: 'sub_workflow2_started' })
  async runWorkflow2(ctx: WorkflowContext, state: SubWorkflowParentState): Promise<SubWorkflowParentState> {
    const result: QueueResult = await this.orchestrator.queue(
      {},
      {
        workflowName: RunSubWorkflowExampleSubWorkflow.name,
        callback: { transition: 'subWorkflow2Callback' },
      },
    );

    await this.documentStore.save(
      LinkDocument,
      {
        label: 'Executing Sub-Workflow 2...',
        workflowId: result.workflowId,
      },
      { id: `link_${result.workflowId}` },
    );
    return state;
  }

  @Final({
    from: 'sub_workflow2_started',
    wait: true,
    schema: SubWorkflowCallbackSchema,
  })
  async subWorkflow2Callback(
    ctx: WorkflowContext,
    state: SubWorkflowParentState,
    payload: SubWorkflowCallback,
  ): Promise<unknown> {
    await this.documentStore.save(
      LinkDocument,
      {
        label: 'Sub-Workflow 2',
        status: 'success',
        workflowId: payload.workflowId,
      },
      { id: `link_${payload.workflowId}` },
    );

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `A message from sub workflow 2: ${payload.data.message}`,
    });
    return {};
  }
}
