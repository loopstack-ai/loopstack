import { describe, expect, it } from 'vitest';
import { AgentModule } from '@loopstack/agent';
import type { StatelessChildRecord } from '@loopstack/common';
import { LlmGenerateTextTool, LlmProviderModule } from '@loopstack/llm-provider';
import { queue, replay, runWorkflow } from '@loopstack/testing';
import { CalculatorTool } from '../../../tools/calculator.tool';
import { WeatherLookupTool } from '../../../tools/weather-lookup.tool';
import { ChatAgentExampleWorkflow } from '../chat-agent-example.workflow';

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

const toolCallTurn = (id: string, name: string, args: Record<string, unknown>) =>
  llmTurn({
    id,
    role: 'assistant',
    text: '',
    blocks: [{ type: 'tool_call', id: `toolu_${id}`, name, args }],
    stopReason: 'tool_use',
  });

const textTurn = (id: string, text: string) =>
  llmTurn({ id, role: 'assistant', text, blocks: [{ type: 'text', text }], stopReason: 'end_turn' });

const WEATHER_ANSWER = 'Tokyo is 22°C and sunny.';
const FOLLOW_UP = 'And what is 22 * 3?';
const CALCULATOR_ANSWER = '22 * 3 = 66.';

/** The `tool_result` blocks the chat agent fed back to the LLM, in order. */
function toolResults(agent: StatelessChildRecord) {
  type Block = { type: string; content?: string; isError?: boolean };
  return agent.documents.flatMap((d) =>
    ((d.content as { blocks?: Block[] }).blocks ?? []).filter((b) => b.type === 'tool_result'),
  );
}

/** The text of every message in the chat agent's conversation, in order. */
function texts(agent: StatelessChildRecord) {
  return agent.documents.map((d) => (d.content as { text?: string }).text ?? '').filter(Boolean);
}

/**
 * The LLM is the replay boundary. The `chat_agent` child and the real `weather_lookup` /
 * `calculator` tools run live; the user's next message is scripted via `answers`.
 */
describe('ChatAgentExampleWorkflow', () => {
  const imports = [LlmProviderModule, AgentModule];
  const providers = [WeatherLookupTool, CalculatorTool];

  it('answers, waits for the user, and answers the next message with the same conversation', async () => {
    const run = await runWorkflow(ChatAgentExampleWorkflow, undefined, {
      imports,
      providers,
      replayTools: [LlmGenerateTextTool],
      replay: replay({
        version: 3,
        recordings: [
          toolCallTurn('1', 'weather_lookup', { city: 'Tokyo' }),
          textTurn('2', WEATHER_ANSWER),
          toolCallTurn('3', 'calculator', { operation: 'multiply', a: 22, b: 3 }),
          textTurn('4', CALCULATOR_ANSWER),
        ],
      }),
      answers: { userMessage: queue(FOLLOW_UP) },
    });

    expect(run.error).toBeUndefined();
    // The chat agent never ends on its own: after the second answer it waits for the next message.
    expect(run.status).toBe('waiting');
    expect(run.path).toEqual(['start']);

    const agent = run.children[0];
    expect(agent.workflowName).toBe('chat_agent');
    expect(agent.availableTransitions.map((t) => t.id)).toContain('userMessage');

    expect(texts(agent)).toEqual(["What's the weather in Tokyo?", WEATHER_ANSWER, FOLLOW_UP, CALCULATOR_ANSWER]);

    const [weather, calculator] = toolResults(agent);
    expect(weather.isError).toBeFalsy();
    expect(weather.content).toContain('22°C');
    expect(calculator.isError).toBeFalsy();
    expect(calculator.content).toContain('22 multiply 3 = 66');
  });

  it('waits for the user after the first answer when no message is scripted', async () => {
    const run = await runWorkflow(ChatAgentExampleWorkflow, undefined, {
      imports,
      providers,
      replayTools: [LlmGenerateTextTool],
      replay: replay({
        version: 3,
        recordings: [toolCallTurn('1', 'weather_lookup', { city: 'Tokyo' }), textTurn('2', WEATHER_ANSWER)],
      }),
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('waiting');
    expect(run.parkView()).toMatchObject({ workflowName: 'chat_agent', defaultTransition: 'userMessage' });
  });
});
