import { describe, expect, it } from 'vitest';
import { AgentModule } from '@loopstack/agent';
import { LlmGenerateTextTool, LlmProviderModule } from '@loopstack/llm-provider-module';
import { replay, runWorkflow } from '@loopstack/testing';
import { CalculatorTool } from '../../../tools/calculator.tool';
import { WeatherLookupTool } from '../../../tools/weather-lookup.tool';
import { AgentExampleWorkflow } from '../agent-example.workflow';

/**
 * The canonical agent test: replay only the LLM (`replayTools: [LlmGenerateTextTool]`) so the
 * model turns are scripted, while the delegation machinery and the real `weather_lookup` /
 * `calculator` tools run live. The scripted turns drive one tool-use round then a final answer.
 */
const llmTurn = (message: { id: string; role: string; text: string; blocks: unknown[]; stopReason: string }) => ({
  tool: 'llm_generate_text',
  envelope: {
    data: { message, response: {} },
    metadata: { provider: 'claude', model: 'claude-sonnet-4-6' },
    documents: [{ documentName: 'llm_message', content: message, options: { meta: { provider: 'claude' } } }],
  },
});

const TOOL_TURN = llmTurn({
  id: 'msg_1',
  role: 'assistant',
  text: '',
  blocks: [
    { type: 'tool_call', id: 'w1', name: 'weather_lookup', args: { city: 'Tokyo' } },
    { type: 'tool_call', id: 'c1', name: 'calculator', args: { operation: 'multiply', a: 42, b: 17 } },
  ],
  stopReason: 'tool_use',
});

const FINAL_TURN = llmTurn({
  id: 'msg_2',
  role: 'assistant',
  text: 'Tokyo is sunny, and 42 * 17 = 714.',
  blocks: [{ type: 'text', text: 'Tokyo is sunny, and 42 * 17 = 714.' }],
  stopReason: 'end_turn',
});

describe('AgentExampleWorkflow', () => {
  it('replays the LLM while the real tools run in the live delegation', async () => {
    const run = await runWorkflow(AgentExampleWorkflow, undefined, {
      imports: [LlmProviderModule, AgentModule],
      providers: [WeatherLookupTool, CalculatorTool],
      replayTools: [LlmGenerateTextTool],
      replay: replay({ version: 3, recordings: [TOOL_TURN, FINAL_TURN] }),
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['start', 'agentComplete']);
    expect(run.result).toEqual({ response: 'Tokyo is sunny, and 42 * 17 = 714.' });

    // The agent sub-workflow ran the loop to completion (outcome, not internals).
    expect(run.children[0].workflowName).toBe('agent');
    expect(run.children[0].status).toBe('completed');
  });
});
