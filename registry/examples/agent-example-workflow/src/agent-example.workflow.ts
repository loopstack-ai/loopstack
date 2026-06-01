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
  TEMPLATE_RENDERER,
  WORKFLOW_ORCHESTRATOR,
  Workflow,
  WorkflowOrchestrator,
} from '@loopstack/common';
import type { DocumentStore, TemplateRenderFn, WorkflowContext } from '@loopstack/common';

const AgentCallbackSchema = CallbackSchema.extend({
  data: z.object({ response: z.string() }),
});

type AgentCallback = z.infer<typeof AgentCallbackSchema>;

interface AgentExampleState {}

@Workflow({
  uiConfig: __dirname + '/agent-example.ui.yaml',
})
export class AgentExampleWorkflow extends BaseWorkflow<Record<string, unknown>, AgentExampleState> {
  constructor(
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
    @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
  ) {
    super();
  }

  @Initial({ to: 'running' })
  async start(
    ctx: WorkflowContext,
    args: Record<string, unknown>,
    state: AgentExampleState,
  ): Promise<AgentExampleState> {
    const result: QueueResult = await this.orchestrator.queue(
      {
        system: this.render(__dirname + '/templates/system.md'),
        tools: ['weather_lookup', 'calculator'],
        userMessage: "What's the weather in Tokyo? Also, what is 42 * 17?",
      },
      { workflowName: AgentWorkflow.name, callback: { transition: 'agentComplete' } },
    );

    await this.documentStore.save(
      LinkDocument,
      { label: 'Agent working...', workflowId: result.workflowId, embed: true, expanded: true },
      { id: `link_${result.workflowId}` },
    );
    return state;
  }

  @Final({
    from: 'running',
    wait: true,
    schema: AgentCallbackSchema,
  })
  async agentComplete(ctx: WorkflowContext, state: AgentExampleState, payload: AgentCallback): Promise<unknown> {
    await this.documentStore.save(
      LinkDocument,
      { label: 'Agent complete', status: 'success', workflowId: payload.workflowId },
      { id: `link_${payload.workflowId}` },
    );

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: payload.data.response,
    });
    return {};
  }
}
