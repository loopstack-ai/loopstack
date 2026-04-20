import { z } from 'zod';
import { ExploreAgentWorkflow } from '@loopstack/code-agent';
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
  uiConfig: __dirname + '/code-agent-explore-example.ui.yaml',
})
export class CodeAgentExploreExampleWorkflow extends BaseWorkflow {
  @InjectWorkflow() private exploreAgent: ExploreAgentWorkflow;

  @Initial({ to: 'exploring' })
  async startExploration() {
    const result: QueueResult = await this.exploreAgent.run(
      { instructions: EXPLORE_INSTRUCTIONS },
      { alias: 'exploreAgent', callback: { transition: 'exploreComplete' } },
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
