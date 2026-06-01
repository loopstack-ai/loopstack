import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { AgentWorkflow } from '@loopstack/agent';
import {
  BaseWorkflow,
  CallbackSchema,
  DOCUMENT_STORE,
  Final,
  Initial,
  LinkDocument,
  MessageDocument,
  QueueResult,
  WORKFLOW_ORCHESTRATOR,
  Workflow,
} from '@loopstack/common';
import type {
  DocumentStore,
  WorkflowContext,
  WorkflowOrchestrator,
} from '@loopstack/common';

const AgentCallbackSchema = CallbackSchema.extend({
  data: z.object({ response: z.string() }),
});

type AgentCallback = z.infer<typeof AgentCallbackSchema>;

@Workflow({ name: 'agent_test', title: 'Agent Test' })
export class AgentTestWorkflow extends BaseWorkflow<
  Record<string, unknown>,
  Record<string, unknown>
> {
  constructor(
    @Inject(WORKFLOW_ORCHESTRATOR)
    private readonly orchestrator: WorkflowOrchestrator,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  @Initial({ to: 'running' })
  async start(
    ctx: WorkflowContext,
    args: Record<string, unknown>,
    state: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const result: QueueResult = await this.orchestrator.queue(
      {
        system:
          'You are a helpful assistant. Always start your response with your exact model identifier.',
        tools: [],
        userMessage: 'What model are you?',
      },
      {
        workflowName: AgentWorkflow.name,
        callback: { transition: 'agentComplete' },
      },
    );

    await this.documentStore.save(
      LinkDocument,
      {
        label: 'Agent working...',
        workflowId: result.workflowId,
        embed: true,
        expanded: true,
      },
      { id: `link_${result.workflowId}` },
    );
    return state;
  }

  @Final({ from: 'running', wait: true, schema: AgentCallbackSchema })
  async agentComplete(
    ctx: WorkflowContext,
    state: Record<string, unknown>,
    payload: AgentCallback,
  ): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: payload.data.response,
    });
    return {};
  }
}
