import { describe, expect, it } from 'vitest';
import { AgentModule } from '@loopstack/agent';
import { LlmGenerateTextTool, LlmProviderModule } from '@loopstack/llm-provider';
import { replay, runWorkflow } from '@loopstack/testing';
import { ToolErrorsExampleWorkflow } from '../tool-errors-example.workflow';
import { ToolErrorsFailingSubWorkflow } from '../tool-errors-failing-sub.workflow';
import { FailingSubWorkflowTool } from '../tools/failing-sub-workflow.tool';
import { RuntimeErrorTool } from '../tools/runtime-error.tool';
import { StrictSchemaTool } from '../tools/strict-schema.tool';

/**
 * Replays only the LLM, so the scripted model calls each failing tool, then corrects itself. The
 * three tools and the failing sub-workflow run for real inside AgentWorkflow, and each failure has
 * to come back to the model as an `is_error` tool result.
 */
const llmTurn = (message: { id: string; text: string; blocks: unknown[]; stopReason: string }) => ({
  tool: 'llm_generate_text',
  envelope: {
    data: { message: { role: 'assistant', ...message }, response: {} },
    metadata: { provider: 'claude', model: 'claude-sonnet-4-6' },
  },
});

const toolCall = (id: string, name: string, args: Record<string, unknown>) =>
  llmTurn({ id: `msg_${id}`, text: '', blocks: [{ type: 'tool_call', id, name, args }], stopReason: 'tool_use' });

const SUMMARY = 'Each tool failed once, and I corrected the call after reading the error.';

const RECORDINGS = [
  toolCall('t1', 'strict_schema', {}),
  toolCall('t2', 'strict_schema', { name: 'World' }),
  toolCall('t3', 'runtime_error', { shouldFail: true }),
  toolCall('t4', 'runtime_error', { shouldFail: false }),
  toolCall('t5', 'failing_sub_workflow', {}),
  llmTurn({ id: 'msg_final', text: SUMMARY, blocks: [{ type: 'text', text: SUMMARY }], stopReason: 'end_turn' }),
];

interface ToolResultBlock {
  type: 'tool_result';
  toolCallId: string;
  content: string;
  isError?: boolean;
}

describe('ToolErrorsExampleWorkflow', () => {
  it('returns every tool failure to the LLM as an is_error tool result', async () => {
    const run = await runWorkflow(ToolErrorsExampleWorkflow, undefined, {
      imports: [LlmProviderModule, AgentModule],
      providers: [StrictSchemaTool, RuntimeErrorTool, FailingSubWorkflowTool, ToolErrorsFailingSubWorkflow],
      replayTools: [LlmGenerateTextTool],
      replay: replay({ version: 3, recordings: RECORDINGS }),
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['start', 'agentComplete']);
    expect(run.result).toEqual({ response: SUMMARY });

    // The tool errors did not fail the agent: it completed its loop.
    const agent = run.children[0];
    expect(agent.workflowName).toBe('agent');
    expect(agent.status).toBe('completed');

    // The conversation the LLM saw: each failure as an is_error result, each corrected call as a success.
    const results = new Map(
      agent.documents
        .flatMap((d) => (d.content as { blocks?: { type: string }[] }).blocks ?? [])
        .filter((b): b is ToolResultBlock => b.type === 'tool_result')
        .map((b) => [b.toolCallId, b]),
    );
    expect([...results.keys()]).toEqual(['t1', 't2', 't3', 't4', 't5']);
    expect([...results.values()].map((r) => !!r.isError)).toEqual([true, false, true, false, true]);
    expect(results.get('t1')!.content).toContain('invalid_type');
    expect(results.get('t3')!.content).toContain('Simulated runtime error');
    expect(results.get('t5')!.content).toContain('Sub-workflow \\"failing_sub_workflow\\" failed.');

    // The sub-workflow behind failing_sub_workflow really failed.
    expect(agent.statelessState?.children?.map((c) => c.status)).toEqual(['failed']);
  });
});
