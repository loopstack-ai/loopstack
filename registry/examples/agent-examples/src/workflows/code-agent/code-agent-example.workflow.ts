import { type AgentResult, AgentResultSchema, AgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, MessageDocument, Transition, type TransitionInput, Workflow } from '@loopstack/common';
import { EnvironmentService } from '@loopstack/remote-client';

const EXPLORE_INSTRUCTIONS = `Find the entry-point module of this project and list the
top-level providers it registers. Return a short bulleted summary.`;

/**
 * Code-exploration agent powered by `AgentWorkflow` with `glob`, `grep`, and `read`
 * tools. These tools execute on a remote agent, so the workspace must have a
 * `sandbox` environment connected and the remote agent must be reachable.
 *
 * Setup (see `agent-examples/README.md` → Code Agent for the full snippet):
 */
@Workflow({
  title: 'Agent - Code Agent Example',
  description: 'Launches AgentWorkflow as a codebase-exploration agent with glob, grep, and read tools.',
})
export class CodeAgentExampleWorkflow extends BaseWorkflow {
  constructor(
    private readonly agentWorkflow: AgentWorkflow,
    private readonly environments: EnvironmentService,
  ) {
    super();
  }

  @Transition({ to: 'verified' })
  async verifyEnvironment() {
    await this.environments.assertReachable('sandbox');
  }

  @Transition({ from: 'verified', to: 'exploring' })
  async startExploration() {
    await this.agentWorkflow.run(
      {
        system: 'You are a codebase exploration agent. Search and read source code to answer the question thoroughly.',
        tools: ['glob', 'grep', 'read'],
        userMessage: EXPLORE_INSTRUCTIONS,
      },
      { callback: { transition: 'exploreComplete' }, show: 'inline', label: 'Exploring codebase...' },
    );
  }

  @Transition({
    from: 'exploring',
    to: 'end',
    wait: true,
    schema: AgentResultSchema,
  })
  async exploreComplete(_state: Record<string, unknown>, input: TransitionInput<AgentResult>) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: input.data.response,
    });
  }
}
