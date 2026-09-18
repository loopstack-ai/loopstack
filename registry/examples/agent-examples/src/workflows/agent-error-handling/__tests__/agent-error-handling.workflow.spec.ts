import { describe, expect, it } from 'vitest';
import { LlmGenerateTextTool, LlmProviderModule } from '@loopstack/llm-provider-module';
import { replay, runWorkflow } from '@loopstack/testing';
import { AgentErrorHandlingFailingSubWorkflow } from '../agent-error-handling-failing-sub.workflow';
import { AgentErrorHandlingWorkflow } from '../agent-error-handling.workflow';
import { FailingSubWorkflowTool } from '../tools/failing-sub-workflow.tool';
import { RuntimeErrorTool } from '../tools/runtime-error.tool';
import { StrictSchemaTool } from '../tools/strict-schema.tool';

/**
 * The concept under test: whatever *kind* of thing goes wrong in a delegated tool call — bad
 * arguments, a thrown exception, a sub-workflow that fails — the agent loop hands the LLM the same
 * artefact: a `tool_result` block flagged `isError: true`, carrying the reason. The model is
 * replayed (`replayTools: [LlmGenerateTextTool]`) so the scripted turn triggers all three failures
 * at once; delegation and the failing tools themselves run for real.
 *
 * Acceptance criteria:
 *   C1 — a schema-validation failure comes back as an is_error tool_result naming the bad argument.
 *   C2 — a thrown runtime error comes back as an is_error tool_result carrying the message.
 *   C3 — a failed sub-workflow comes back as an is_error tool_result, like the other two.
 *   C4 — the loop survives all three and reaches its final answer.
 */
const llmTurn = (message: object) => ({
  tool: 'llm_generate_text',
  envelope: {
    data: { message, response: {} },
    metadata: { provider: 'claude', model: 'claude-sonnet-4-6' },
    documents: [{ documentName: 'llm_message', content: message, options: { meta: { provider: 'claude' } } }],
  },
});

const FAILING_TURN = llmTurn({
  id: 'msg_1',
  role: 'assistant',
  text: '',
  blocks: [
    // 1. Missing required `name` — rejected by the tool's args schema before handle() runs.
    { type: 'tool_call', id: 'schema', name: 'strict_schema', args: {} },
    // 2. Valid args, but handle() throws.
    { type: 'tool_call', id: 'runtime', name: 'runtime_error', args: { shouldFail: true } },
    // 3. Launches a sub-workflow that fails — the failure arrives later, via the callback.
    { type: 'tool_call', id: 'child', name: 'failing_sub_workflow', args: {} },
  ],
  stopReason: 'tool_use',
});

const FINAL_TURN = llmTurn({
  id: 'msg_2',
  role: 'assistant',
  text: 'All three calls failed, as expected.',
  blocks: [{ type: 'text', text: 'All three calls failed, as expected.' }],
  stopReason: 'end_turn',
});

interface ToolResultBlock {
  type: string;
  toolCallId: string;
  content: string;
  isError?: boolean;
}

describe('AgentErrorHandlingWorkflow', () => {
  const run = () =>
    runWorkflow(AgentErrorHandlingWorkflow, undefined, {
      imports: [LlmProviderModule],
      providers: [StrictSchemaTool, RuntimeErrorTool, FailingSubWorkflowTool, AgentErrorHandlingFailingSubWorkflow],
      replayTools: [LlmGenerateTextTool],
      replay: replay({ version: 3, recordings: [FAILING_TURN, FINAL_TURN] }),
    });

  it('C1-C3: reports every failure kind back to the model as an is_error tool_result', async () => {
    const result = await run();

    const toolResults = result.documents
      .flatMap((d) => (d.content as { blocks?: ToolResultBlock[] }).blocks ?? [])
      .filter((b) => b.type === 'tool_result');
    const byId = Object.fromEntries(toolResults.map((b) => [b.toolCallId, b]));

    expect(Object.keys(byId).sort()).toEqual(['child', 'runtime', 'schema']);
    // The uniformity is the point: three different failure kinds, one contract.
    expect(toolResults.every((b) => b.isError === true)).toBe(true);

    expect(byId.schema.content).toContain('expected string, received undefined');
    expect(byId.runtime.content).toContain('Simulated runtime error: external service unavailable.');
    expect(byId.child.content).toContain('Sub-workflow \\"failing_sub_workflow\\" failed.');
  });

  it('C4: keeps the agent loop alive and reaches a final answer', async () => {
    const result = await run();

    expect(result.error).toBeUndefined();
    expect(result.status).toBe('completed');
    expect(result.path).toEqual([
      'setup',
      'llmTurn',
      'executeToolCalls',
      'toolResultReceived',
      'toolsComplete',
      'llmTurn',
      'respond',
    ]);
  });
});
