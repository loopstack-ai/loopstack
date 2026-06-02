import { Inject } from '@nestjs/common';
import { z } from 'zod';
import {
  BaseWorkflow,
  CallbackSchema,
  DOCUMENT_STORE,
  LinkDocument,
  MessageDocument,
  QueueResult,
  Transition,
  Workflow,
} from '@loopstack/common';
import type { DocumentStore } from '@loopstack/common';
import { RunSubWorkflowExampleSubWorkflow } from './run-sub-workflow-example-sub.workflow';

const SubWorkflowCallbackSchema = CallbackSchema.extend({
  data: z.object({ message: z.string() }),
});

type SubWorkflowCallback = z.infer<typeof SubWorkflowCallbackSchema>;

@Workflow({
  title: 'Run Sub Workflow Example',
})
export class RunSubWorkflowExampleParentWorkflow extends BaseWorkflow {
  constructor(
    private readonly subWorkflow: RunSubWorkflowExampleSubWorkflow,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  @Transition({ to: 'sub_workflow_started' })
  async runWorkflow(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result: QueueResult = await this.subWorkflow.run({}, { callback: { transition: 'subWorkflowCallback' } });

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
    state: Record<string, unknown>,
    payload: SubWorkflowCallback,
  ): Promise<Record<string, unknown>> {
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
  async runWorkflow2(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result: QueueResult = await this.subWorkflow.run({}, { callback: { transition: 'subWorkflow2Callback' } });

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

  @Transition({
    from: 'sub_workflow2_started',
    to: 'end',
    wait: true,
    schema: SubWorkflowCallbackSchema,
  })
  async subWorkflow2Callback(state: Record<string, unknown>, payload: SubWorkflowCallback): Promise<unknown> {
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
