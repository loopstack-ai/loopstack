import { describe, expect, it } from 'vitest';
import { AgentModule } from '@loopstack/agent';
import { LlmGenerateTextTool, LlmProviderModule } from '@loopstack/llm-provider-module';
import { replay, runWorkflow } from '@loopstack/testing';
import { HitlExamplesModule } from '../../../hitl-examples.module';
import { AgentAskClarificationExampleWorkflow } from '../agent-ask-clarification-example.workflow';

/** A scripted agent LLM turn in the shape `llm_generate_text` returns. */
const llmTurn = (message: object) => ({
  tool: 'llm_generate_text',
  envelope: { data: { message, response: {} }, metadata: { provider: 'claude', model: 'claude-sonnet-4-6' } },
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

    // The agent child really ran the loop: clarification asked, answered, second turn taken
    expect(run.children).toHaveLength(1);
    const agent = run.children[0];
    expect(agent.workflowName).toBe('agent');
    expect(agent.status).toBe('completed');
    expect(agent.result).toEqual({ response: 'With €2000 and a warm climate in mind, I recommend Lisbon, Portugal.' });

    // The real AskUserWorkflow grandchild was launched and answered
    const grandchildren = agent.statelessState?.children ?? [];
    expect(grandchildren.some((c) => c.workflowName === 'ask_user' && c.status === 'completed')).toBe(true);
  });

  it('parks with the clarification question shown when no answer is scripted', async () => {
    const run = await runWorkflow(AgentAskClarificationExampleWorkflow, undefined, {
      imports: [LlmProviderModule, AgentModule, HitlExamplesModule],
      replayTools: [LlmGenerateTextTool],
      replay: replay({ version: 3, recordings: [CLARIFICATION_TURN] }),
    });

    expect(run.status).toBe('waiting');
    const agent = run.children[0];
    expect(agent.status).toBe('waiting');
    const askUser = (agent.statelessState?.children ?? []).find((c) => c.workflowName === 'ask_user');
    expect(askUser?.status).toBe('waiting');
    expect(
      askUser?.documents.some((d) => ((d.content as { question?: string }).question ?? '').includes('budget')),
    ).toBe(true);
  });
});
