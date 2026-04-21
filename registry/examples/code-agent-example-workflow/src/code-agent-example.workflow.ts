import { z } from 'zod';
import { AgentWorkflow } from '@loopstack/agent';
import {
  BaseWorkflow,
  CallbackSchema,
  Final,
  Initial,
  InjectWorkflow,
  LinkDocument,
  MessageDocument,
  QueueResult,
  Workflow,
} from '@loopstack/common';

const ExploreCallbackSchema = CallbackSchema.extend({
  data: z.object({ response: z.string() }),
});

type ExploreCallback = z.infer<typeof ExploreCallbackSchema>;

const EXPLORE_INSTRUCTIONS = `Find the entry-point module of this project and list the
top-level providers it registers. Return a short bulleted summary.`;

@Workflow({
  uiConfig: __dirname + '/code-agent-example.ui.yaml',
})
export class CodeAgentExampleWorkflow extends BaseWorkflow {
  @InjectWorkflow() private agent: AgentWorkflow;

  @Initial({ to: 'exploring' })
  async startExploration() {
    const result: QueueResult = await this.agent.run(
      {
        system: 'You are a codebase exploration agent. Search and read source code to answer the question thoroughly.',
        tools: ['glob', 'grep', 'read'],
        userMessage: EXPLORE_INSTRUCTIONS,
      },
      { alias: 'agent', callback: { transition: 'exploreComplete' } },
    );

    await this.repository.save(
      LinkDocument,
      { label: 'Exploring codebase...', workflowId: result.workflowId, embed: true, expanded: true },
      { id: `link_${result.workflowId}` },
    );
  }

  @Final({
    from: 'exploring',
    wait: true,
    schema: ExploreCallbackSchema,
  })
  async exploreComplete(payload: ExploreCallback) {
    await this.repository.save(
      LinkDocument,
      { label: 'Exploration complete', status: 'success', workflowId: payload.workflowId },
      { id: `link_${payload.workflowId}` },
    );

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: payload.data.response,
    });
  }
}
