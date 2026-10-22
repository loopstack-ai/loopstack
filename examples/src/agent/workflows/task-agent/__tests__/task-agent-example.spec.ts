import { describe, expect, it } from 'vitest';
import { AgentModule } from '@loopstack/agent';
import type { StatelessChildRecord } from '@loopstack/common';
import { LlmGenerateTextTool, LlmProviderModule } from '@loopstack/llm-provider';
import { queue, replay, runWorkflow } from '@loopstack/testing';
import { CalculatorTool } from '../../../tools/calculator.tool';
import { WeatherLookupTool } from '../../../tools/weather-lookup.tool';
import { TaskAgentExampleWorkflow } from '../task-agent-example.workflow';

/**
 * A scripted agent LLM turn in the shape `llm_generate_text` returns — including the
 * `documents` declaration the live tool emits, so replay materializes the assistant message
 * as a conversation document exactly like a real call would.
 */
const llmTurn = (message: { id: string; role: string; text: string; blocks: unknown[]; stopReason: string }) => ({
  tool: 'llm_generate_text',
  envelope: {
    data: { message, response: {} },
    metadata: { provider: 'claude', model: 'claude-sonnet-4-6' },
    documents: [{ documentName: 'llm_message', content: message, options: { meta: { provider: 'claude' } } }],
  },
});

const toolCallTurn = (id: string, calls: Array<{ name: string; args: Record<string, unknown> }>) =>
  llmTurn({
    id,
    role: 'assistant',
    text: '',
    blocks: calls.map((call, i) => ({ type: 'tool_call', id: `toolu_${id}_${i}`, ...call })),
    stopReason: 'tool_use',
  });

const RESULT = { warmerCity: 'Tokyo', differenceCelsius: 8 };

const WEATHER_TURN = toolCallTurn('1', [
  { name: 'weather_lookup', args: { city: 'London' } },
  { name: 'weather_lookup', args: { city: 'Tokyo' } },
]);

const CALCULATOR_TURN = toolCallTurn('2', [{ name: 'calculator', args: { operation: 'subtract', a: 22, b: 14 } }]);

const FINISH_TURN = toolCallTurn('3', [{ name: 'agent_finish', args: { result: RESULT } }]);

const QUESTION = 'Tokyo is 22°C and London is 14°C. Should I also compute the difference?';

const QUESTION_TURN = llmTurn({
  id: '2',
  role: 'assistant',
  text: QUESTION,
  blocks: [{ type: 'text', text: QUESTION }],
  stopReason: 'end_turn',
});

/** The `tool_result` blocks the chat agent fed back to the LLM, in order. */
function toolResults(agent: StatelessChildRecord) {
  type Block = { type: string; content?: string; isError?: boolean };
  return agent.documents.flatMap((d) =>
    ((d.content as { blocks?: Block[] }).blocks ?? []).filter((b) => b.type === 'tool_result'),
  );
}

/**
 * The LLM is the replay boundary. The `chat_agent` child, the real `weather_lookup` / `calculator`
 * tools and `agent_finish` run live, so the result the parent receives is what `agent_finish` returned.
 */
describe('TaskAgentExampleWorkflow', () => {
  const imports = [LlmProviderModule, AgentModule];
  const providers = [WeatherLookupTool, CalculatorTool];

  it('ends when the agent calls agent_finish, and the parent receives its result', async () => {
    const run = await runWorkflow(TaskAgentExampleWorkflow, undefined, {
      imports,
      providers,
      replayTools: [LlmGenerateTextTool],
      replay: replay({ version: 3, recordings: [WEATHER_TURN, CALCULATOR_TURN, FINISH_TURN] }),
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['start', 'agentFinished']);
    expect(run.result).toEqual(RESULT);

    const agent = run.children[0];
    expect(agent.workflowName).toBe('chat_agent');
    expect(agent.status).toBe('completed');
    expect(toolResults(agent).map((r) => r.content)).toEqual([
      expect.stringContaining('14°C'),
      expect.stringContaining('22°C'),
      expect.stringContaining('22 subtract 14 = 8'),
      expect.stringContaining('__agentFinish'),
    ]);
  });

  it('answers in text, waits for the user, then finishes on the next message', async () => {
    const run = await runWorkflow(TaskAgentExampleWorkflow, undefined, {
      imports,
      providers,
      replayTools: [LlmGenerateTextTool],
      replay: replay({ version: 3, recordings: [WEATHER_TURN, QUESTION_TURN, CALCULATOR_TURN, FINISH_TURN] }),
      answers: { userMessage: queue('Yes, compute it.') },
    });

    expect(run.error).toBeUndefined();
    // A text answer does not end a task agent: it waited for the user, and only agent_finish ended it.
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['start', 'agentFinished']);
    expect(run.result).toEqual(RESULT);

    const texts = run.children[0].documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts).toContain(QUESTION);
    expect(texts).toContain('Yes, compute it.');
  });
});
