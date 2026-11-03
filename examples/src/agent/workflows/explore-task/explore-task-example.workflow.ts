import { join } from 'node:path';
import { type AgentResult, AgentResultSchema, AgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, Transition, type TransitionInput, Workflow } from '@loopstack/common';
import { LlmMessageDocument } from '@loopstack/llm-provider';
import { EnvironmentService } from '@loopstack/remote-client';

/**
 * A main agent that delegates codebase exploration to a sub-agent through the `explore_task` tool
 * from `@loopstack/code-agent`. The sub-agent searches and reads the code with `glob`, `grep` and
 * `read` in its own conversation and returns only its synthesized answer, which becomes the
 * `explore_task` tool result. The main agent's context holds that answer, not the files it came from.
 *
 * The `glob`/`grep`/`read` tools execute on a remote agent, so the workspace must have a `sandbox`
 * environment connected (see `agent/README.md` → Code Agent → Setup).
 */
@Workflow({
  title: 'Agent - Explore Task Example',
  description:
    'Launches AgentWorkflow with the explore_task tool. The agent delegates codebase exploration to a sub-agent with glob, grep, and read tools, then answers from its findings.',
})
export class ExploreTaskExampleWorkflow extends BaseWorkflow {
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

  @Transition({ from: 'verified', to: 'running' })
  async start() {
    await this.agentWorkflow.run(
      {
        system: this.render(join(__dirname, 'templates', 'system.md')),
        tools: ['explore_task'],
        userMessage: 'Which modules does the root module of this project import? Name the one to read first.',
      },
      { onSuccess: { transition: 'agentComplete' }, show: 'inline', label: 'Main agent' },
    );
  }

  @Transition({
    from: 'running',
    to: 'end',
    wait: true,
    schema: AgentResultSchema,
  })
  async agentComplete(_state: Record<string, unknown>, input: TransitionInput<AgentResult>) {
    await this.documentStore.save(LlmMessageDocument, {
      role: 'assistant',
      text: input.data.response,
    });
    this.setResult(input.data);
  }
}
