import { describe, expect, it } from 'vitest';
import { AgentModule } from '@loopstack/agent';
import { LlmGenerateTextTool, LlmProviderModule } from '@loopstack/llm-provider-module';
import { replay, runWorkflow } from '@loopstack/testing';
import { HitlExamplesModule } from '../../../hitl-examples.module';
import { AgentAskClarificationExampleWorkflow } from '../agent-ask-clarification-example.workflow';

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

const CLARIFICATION_TURN = llmTurn({
  id: 'msg_1',
  role: 'assistant',
  text: '',
  blocks: [
    {
      type: 'tool_call',
      id: 'toolu_1',
      name: 'ask_clarification',
      args: { question: 'What is your budget, and do you prefer a warm or cold climate?' },
    },
  ],
  stopReason: 'tool_use',
});

const RECOMMENDATION_TURN = llmTurn({
  id: 'msg_2',
  role: 'assistant',
  text: 'With €2000 and a warm climate in mind, I recommend Lisbon, Portugal.',
  blocks: [{ type: 'text', text: 'With €2000 and a warm climate in mind, I recommend Lisbon, Portugal.' }],
  stopReason: 'end_turn',
});

describe('AgentAskClarificationExampleWorkflow', () => {
  it('replays the LLM turns while the agent, clarification tool, and HITL child run live', async () => {
    const run = await runWorkflow(AgentAskClarificationExampleWorkflow, undefined, {
      imports: [LlmProviderModule, AgentModule, HitlExamplesModule],
      replayTools: [LlmGenerateTextTool],
      replay: replay({ version: 3, recordings: [CLARIFICATION_TURN, RECOMMENDATION_TURN] }),
      answers: { userAnswered: { answer: 'Budget €2000, warm climate please' } },
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['start', 'agentComplete']);
    expect(run.result).toEqual({ response: 'With €2000 and a warm climate in mind, I recommend Lisbon, Portugal.' });

    // The agent child ran the loop to completion — assert its outcome, not its internals.
    expect(run.children).toHaveLength(1);
    const agent = run.children[0];
    expect(agent.workflowName).toBe('agent');
    expect(agent.status).toBe('completed');
    expect(agent.result).toEqual({ response: 'With €2000 and a warm climate in mind, I recommend Lisbon, Portugal.' });
  });

  it('parks with the clarification question shown when no answer is scripted', async () => {
    const run = await runWorkflow(AgentAskClarificationExampleWorkflow, undefined, {
      imports: [LlmProviderModule, AgentModule, HitlExamplesModule],
      replayTools: [LlmGenerateTextTool],
      replay: replay({ version: 3, recordings: [CLARIFICATION_TURN] }),
    });

    expect(run.status).toBe('waiting');
    // The clarification prompt lives on the AskUserWorkflow launched by the agent's tool call,
    // several levels down. parkView() walks the tree and surfaces what the user would see —
    // no manual traversal of the stateless carrier.
    const view = run.parkView();
    expect(view).toMatchObject({
      workflowName: 'ask_user',
      widget: 'text-prompt',
      content: { question: expect.stringContaining('budget') },
      defaultTransition: 'userAnswered',
    });
  });
});
