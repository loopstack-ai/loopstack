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

const AgentCallbackSchema = CallbackSchema.extend({
  data: z.object({ response: z.string() }),
});

type AgentCallback = z.infer<typeof AgentCallbackSchema>;

@Workflow({
  uiConfig: __dirname + '/agent-example.ui.yaml',
})
export class AgentExampleWorkflow extends BaseWorkflow {
  @InjectWorkflow() private agent: AgentWorkflow;

  @Initial({ to: 'running' })
  async start() {
    const result: QueueResult = await this.agent.run(
      {
        system: this.render(__dirname + '/templates/system.md'),
        tools: ['weatherLookup', 'calculator'],
        userMessage: "What's the weather in Tokyo? Also, what is 42 * 17?",
      },
      { alias: 'agent', callback: { transition: 'agentComplete' } },
    );

    await this.repository.save(
      LinkDocument,
      { label: 'Agent working...', workflowId: result.workflowId, embed: true, expanded: true },
      { id: `link_${result.workflowId}` },
    );
  }

  @Final({
    from: 'running',
    wait: true,
    schema: AgentCallbackSchema,
  })
  async agentComplete(payload: AgentCallback) {
    await this.repository.save(
      LinkDocument,
      { label: 'Agent complete', status: 'success', workflowId: payload.workflowId },
      { id: `link_${payload.workflowId}` },
    );

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: payload.data.response,
    });
  }
}
