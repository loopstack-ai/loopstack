import { describe, expect, it } from 'vitest';
import { LlmGenerateTextTool, LlmProviderModule } from '@loopstack/llm-provider-module';
import { replay, runWorkflow } from '@loopstack/testing';
import { CalculatorTool } from '../../../tools/calculator.tool';
import { WeatherLookupTool } from '../../../tools/weather-lookup.tool';
import { CustomAgentExampleWorkflow } from '../custom-agent-example.workflow';

/**
 * A hand-rolled agent loop with a deterministic turn budget. Scripting the LLM turns lets a
 * test drive the loop *past* its budget and assert the control flow the generic AgentWorkflow
 * can't express: after MAX_TURNS tool-using turns the workflow forces a no-tools wrap-up turn.
 * The LLM is replayed; the delegation and the real weather tool run live.
 */
const toolUse = (id: string, city: string) => ({
  tool: 'llm_generate_text',
  envelope: {
    data: {
      message: {
        id,
        role: 'assistant',
        text: '',
        blocks: [{ type: 'tool_call', id: `w_${id}`, name: 'weather_lookup', args: { city } }],
        stopReason: 'tool_use',
      },
      response: {},
    },
  },
});

const wrapUp = () => ({
  tool: 'llm_generate_text',
  envelope: {
    data: {
      message: {
        id: 'final',
        role: 'assistant',
        text: 'Budget reached — none of the cities I checked were warm enough.',
        blocks: [{ type: 'text', text: 'Budget reached — none of the cities I checked were warm enough.' }],
        stopReason: 'end_turn',
      },
      response: {},
    },
  },
});

describe('CustomAgentExampleWorkflow', () => {
  it('runs two tool-using turns then forces a no-tools wrap-up when the budget is spent', async () => {
    const run = await runWorkflow(CustomAgentExampleWorkflow, undefined, {
      imports: [LlmProviderModule],
      providers: [WeatherLookupTool, CalculatorTool],
      replayTools: [LlmGenerateTextTool],
      // Two tool-using turns exhaust the 2-turn budget, then the wrap-up turn (no tools).
      replay: replay({ version: 3, recordings: [toolUse('t1', 'London'), toolUse('t2', 'New York'), wrapUp()] }),
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.place).toBe('end');

    // The budget guard fired: exactly two tool-using turns, then the forced wrap-up path.
    expect(run.path.filter((t) => t === 'llmTurn')).toHaveLength(2);
    expect(run.path).toContain('notifyOverBudget');
    expect(run.path).toContain('wrapUp');

    // The over-budget notice was shown to the model before the wrap-up turn.
    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts.some((t) => t.includes('used your full turn budget'))).toBe(true);
  });
});
