import { join } from 'node:path';
import { type AgentResult, AgentResultSchema, AgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, Transition, type TransitionInput, Workflow } from '@loopstack/common';
import { LlmMessageDocument } from '@loopstack/llm-provider';

/**
 * Launches `AgentWorkflow` with three tools that fail in different ways: `strict_schema` rejects
 * invalid args, `runtime_error` throws, and `failing_sub_workflow` starts a sub-workflow that fails.
 * The agent loop returns each failure to the LLM as an `is_error` tool result, so the model can
 * read the error and correct its next call. This workflow needs no error handling of its own.
 */
@Workflow({
  title: 'Agent - Tool Errors Example',
  description:
    'Launches AgentWorkflow with tools that fail by schema validation, by a thrown error and by a failed sub-workflow. Each failure reaches the LLM as an is_error tool result, and the LLM corrects course.',
})
export class ToolErrorsExampleWorkflow extends BaseWorkflow {
  constructor(private readonly agentWorkflow: AgentWorkflow) {
    super();
  }

  @Transition({ to: 'running' })
  async start() {
    await this.agentWorkflow.run(
      {
        system: this.render(join(__dirname, 'templates', 'system.md')),
        tools: ['strict_schema', 'runtime_error', 'failing_sub_workflow'],
        userMessage: 'Follow the steps in your system prompt, starting with step 1.',
      },
      { onSuccess: { transition: 'agentComplete' }, show: 'inline', label: 'Subagent' },
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
