import { z } from 'zod';
import { AgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, MessageDocument, Transition, type TransitionInput, Workflow } from '@loopstack/common';

const ExploreResponseSchema = z.object({ response: z.string() });

const EXPLORE_INSTRUCTIONS = `Find the entry-point module of this project and list the
top-level providers it registers. Return a short bulleted summary.`;

@Workflow({
  title: 'Code Agent Explore Example',
})
export class CodeAgentExampleWorkflow extends BaseWorkflow {
  constructor(private readonly agentWorkflow: AgentWorkflow) {
    super();
  }

  @Transition({ to: 'exploring' })
  async startExploration(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.agentWorkflow.run(
      {
        system: 'You are a codebase exploration agent. Search and read source code to answer the question thoroughly.',
        tools: ['glob', 'grep', 'read'],
        userMessage: EXPLORE_INSTRUCTIONS,
      },
      { callback: { transition: 'exploreComplete' }, show: 'inline', label: 'Exploring codebase...' },
    );
    return state;
  }

  @Transition({
    from: 'exploring',
    to: 'end',
    wait: true,
    schema: ExploreResponseSchema,
  })
  async exploreComplete(
    state: Record<string, unknown>,
    input: TransitionInput<{ response: string }>,
  ): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: input.data.response,
    });
    return {};
  }
}
