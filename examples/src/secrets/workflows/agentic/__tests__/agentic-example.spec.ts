import { describe, expect, it } from 'vitest';
import { AgentModule } from '@loopstack/agent';
import type { StatelessChildRecord } from '@loopstack/common';
import { LlmGenerateTextTool, LlmProviderModule } from '@loopstack/llm-provider';
import { SecretsModule } from '@loopstack/secrets';
import { replay, runWorkflow } from '@loopstack/testing';
import { SecretsExamplesModule } from '../../../secrets-examples.module';
import { AgenticExampleWorkflow } from '../agentic-example.workflow';

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

const VARIABLES = [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }];

const SUMMARY = 'EXAMPLE_API_KEY and EXAMPLE_SECRET are stored.';

const toolCallTurn = (name: string) =>
  llmTurn({
    id: 'msg_1',
    role: 'assistant',
    text: '',
    blocks: [{ type: 'tool_call', id: 'toolu_1', name, args: { variables: VARIABLES } }],
    stopReason: 'tool_use',
  });

const FINISH_TURN = llmTurn({
  id: 'msg_2',
  role: 'assistant',
  text: '',
  blocks: [{ type: 'tool_call', id: 'toolu_2', name: 'agent_finish', args: { result: { summary: SUMMARY } } }],
  stopReason: 'tool_use',
});

const TEXT_TURN = llmTurn({
  id: 'msg_2',
  role: 'assistant',
  text: SUMMARY,
  blocks: [{ type: 'text', text: SUMMARY }],
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
 * The LLM is the replay boundary. The `chat_agent` child, `request_secrets_task`, its `secrets_request`
 * child and `agent_finish` run live; the user's form submission is scripted via `answers`.
 */
describe('AgenticExampleWorkflow', () => {
  const imports = [LlmProviderModule, AgentModule, SecretsModule.forFeature(), SecretsExamplesModule];

  it('requests the secrets through the form and ends when the agent finishes', async () => {
    const run = await runWorkflow(AgenticExampleWorkflow, undefined, {
      imports,
      replayTools: [LlmGenerateTextTool],
      replay: replay({ version: 3, recordings: [toolCallTurn('request_secrets_task'), FINISH_TURN] }),
      answers: { secretsSubmitted: {} },
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['start', 'agentFinished']);
    expect(run.result).toEqual({ summary: SUMMARY });

    expect(run.children).toHaveLength(1);
    const agent = run.children[0];
    expect(agent.workflowName).toBe('chat_agent');
    expect(agent.status).toBe('completed');
    expect(agent.statelessState?.children?.map((c) => c.workflowName)).toEqual(['secrets_request']);
    expect(toolResults(agent)[0]).toEqual(
      expect.objectContaining({ content: JSON.stringify('Secrets have been stored securely by the user.', null, 2) }),
    );
  });

  it('parks on the secrets form when the user has not submitted', async () => {
    const run = await runWorkflow(AgenticExampleWorkflow, undefined, {
      imports,
      replayTools: [LlmGenerateTextTool],
      replay: replay({ version: 3, recordings: [toolCallTurn('request_secrets_task')] }),
    });

    expect(run.status).toBe('waiting');

    // The secrets form waits on the `secrets_request` child the tool launched inside the chat agent.
    const form = run.children[0].statelessState?.children?.[0];
    expect(form?.workflowName).toBe('secrets_request');
    expect(form?.availableTransitions.map((t) => t.id)).toEqual(['secretsSubmitted']);
    expect(form?.documents.find((d) => d.documentName === 'secret_request')?.content).toEqual({
      variables: VARIABLES,
    });

    // The chat agent's "Cancel pending tools" button sits one level higher, so it is the first prompt.
    expect(run.parkView()).toMatchObject({ workflowName: 'chat_agent', defaultTransition: 'cancelPendingTools' });
  });

  // `llm_generate_object` is registered app-wide but not offered to this agent; `request_secrets` is a
  // plausible guess at a secrets tool name. Neither may run — the LLM gets an error result instead.
  it.each(['llm_generate_object', 'request_secrets'])(
    'refuses %s, a tool outside its tools list, and reports the error to the LLM',
    async (toolName) => {
      const run = await runWorkflow(AgenticExampleWorkflow, undefined, {
        imports,
        replayTools: [LlmGenerateTextTool],
        replay: replay({ version: 3, recordings: [toolCallTurn(toolName), TEXT_TURN] }),
      });

      expect(run.error).toBeUndefined();
      expect(run.status).toBe('waiting');
      const agent = run.children[0];
      // The chat agent answered in text instead of finishing, so it waits for the user's next message.
      expect(agent.availableTransitions.map((t) => t.id)).toContain('userMessage');
      expect(agent.statelessState?.children ?? []).toEqual([]);
      expect(toolResults(agent)).toEqual([
        expect.objectContaining({ isError: true, content: expect.stringContaining('not available') }),
      ]);
    },
  );
});
