import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { AgentWorkflow } from '@loopstack/agent';
import {
  BaseWorkflow,
  CallbackSchema,
  LinkDocument,
  MessageDocument,
  QueueResult,
  TEMPLATE_RENDERER,
  Transition,
  Workflow,
} from '@loopstack/common';
import type { TemplateRenderFn } from '@loopstack/common';

const AgentCallbackSchema = CallbackSchema.extend({
  data: z.object({ response: z.string() }),
});

type AgentCallback = z.infer<typeof AgentCallbackSchema>;

@Workflow({
  title: 'Agent Example',
  description: 'Launches a generic agent sub-workflow with weather and calculator tools.',
})
export class AgentExampleWorkflow extends BaseWorkflow {
  constructor(
    private readonly agentWorkflow: AgentWorkflow,
    @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
  ) {
    super();
  }

  @Transition({ to: 'running' })
  async start(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result: QueueResult = await this.agentWorkflow.run(
      {
        system: this.render(__dirname + '/templates/system.md'),
        tools: ['weather_lookup', 'calculator'],
        userMessage: "What's the weather in Tokyo? Also, what is 42 * 17?",
      },
      { callback: { transition: 'agentComplete' } },
    );

    await this.documentStore.save(
      LinkDocument,
      { label: 'Agent working...', workflowId: result.workflowId, embed: true, expanded: true },
      { id: `link_${result.workflowId}` },
    );
    return state;
  }

  @Transition({
    from: 'running',
    to: 'end',
    wait: true,
    schema: AgentCallbackSchema,
  })
  async agentComplete(state: Record<string, unknown>, payload: AgentCallback): Promise<unknown> {
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
