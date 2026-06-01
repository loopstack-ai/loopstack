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
  WorkflowOrchestrator,
} from '@loopstack/common';
import type { DocumentStore, WorkflowContext } from '@loopstack/common';

const ExploreCallbackSchema = CallbackSchema.extend({
  data: z.object({ response: z.string() }),
});

type ExploreCallback = z.infer<typeof ExploreCallbackSchema>;

const EXPLORE_INSTRUCTIONS = `Find the entry-point module of this project and list the
top-level providers it registers. Return a short bulleted summary.`;

@Workflow({
  title: 'Code Agent Explore Example',
})
export class CodeAgentExampleWorkflow extends BaseWorkflow {
  constructor(
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  @Initial({ to: 'exploring' })
  async startExploration(
    ctx: WorkflowContext,
    args: Record<string, unknown>,
    state: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const result: QueueResult = await this.orchestrator.queue(
      {
        system: 'You are a codebase exploration agent. Search and read source code to answer the question thoroughly.',
        tools: ['glob', 'grep', 'read'],
        userMessage: EXPLORE_INSTRUCTIONS,
      },
      { workflowName: AgentWorkflow.name, callback: { transition: 'exploreComplete' } },
    );

    await this.documentStore.save(
      LinkDocument,
      { label: 'Exploring codebase...', workflowId: result.workflowId, embed: true, expanded: true },
      { id: `link_${result.workflowId}` },
    );
    return state;
  }

  @Final({
    from: 'exploring',
    wait: true,
    schema: ExploreCallbackSchema,
  })
  async exploreComplete(
    ctx: WorkflowContext,
    state: Record<string, unknown>,
    payload: ExploreCallback,
  ): Promise<unknown> {
    await this.documentStore.save(
      LinkDocument,
      { label: 'Exploration complete', status: 'success', workflowId: payload.workflowId },
      { id: `link_${payload.workflowId}` },
    );

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: payload.data.response,
    });
    return {};
  }
}
