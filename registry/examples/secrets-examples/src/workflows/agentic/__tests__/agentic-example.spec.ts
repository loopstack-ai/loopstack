import { describe, expect, it } from 'vitest';
import { LlmGenerateTextTool, LlmProviderModule } from '@loopstack/llm-provider-module';
import { SecretsModule } from '@loopstack/secrets-module';
import { type TestRun, replay, runWorkflow } from '@loopstack/testing';
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
    metadata: { provider: 'claude', model: 'claude-haiku-4-5-20251001' },
    documents: [{ documentName: 'llm_message', content: message, options: { meta: { provider: 'claude' } } }],
  },
});

const VARIABLES = [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }];

const toolCallTurn = (name: string) =>
  llmTurn({
    id: 'msg_1',
    role: 'assistant',
    text: '',
    blocks: [{ type: 'tool_call', id: 'toolu_1', name, args: { variables: VARIABLES } }],
    stopReason: 'tool_use',
  });

const SUMMARY_TURN = llmTurn({
  id: 'msg_2',
  role: 'assistant',
  text: 'EXAMPLE_API_KEY and EXAMPLE_SECRET are stored.',
  blocks: [{ type: 'text', text: 'EXAMPLE_API_KEY and EXAMPLE_SECRET are stored.' }],
  stopReason: 'end_turn',
});

/** The `tool_result` blocks fed back to the LLM, in order. */
function toolResults(run: TestRun) {
  type Block = { type: string; content?: string; isError?: boolean };
  return run.documents.flatMap((d) =>
    ((d.content as { blocks?: Block[] }).blocks ?? []).filter((b) => b.type === 'tool_result'),
  );
}

/**
 * The LLM is the replay boundary. `request_secrets_task`, its `SecretsRequestWorkflow` child and the
 * delegation loop run live; the user's form submission is scripted via `answers`.
 */
describe('AgenticExampleWorkflow', () => {
  const imports = [LlmProviderModule, SecretsModule.forFeature(), SecretsExamplesModule];

  it('requests the secrets through the form and hands the confirmation back to the LLM', async () => {
    const run = await runWorkflow(AgenticExampleWorkflow, undefined, {
      imports,
      replayTools: [LlmGenerateTextTool],
      replay: replay({ version: 3, recordings: [toolCallTurn('request_secrets_task'), SUMMARY_TURN] }),
      answers: { secretsSubmitted: {} },
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('waiting');
    expect(run.place).toBe('waiting_for_user');
    expect(run.children).toHaveLength(1);
    expect(run.children[0].workflowName).toBe('secrets_request');
    expect(toolResults(run)).toEqual([
      expect.objectContaining({ content: JSON.stringify('Secrets have been stored securely by the user.', null, 2) }),
    ]);
  });

  it('parks on the secrets form when the user has not submitted', async () => {
    const run = await runWorkflow(AgenticExampleWorkflow, undefined, {
      imports,
      replayTools: [LlmGenerateTextTool],
      replay: replay({ version: 3, recordings: [toolCallTurn('request_secrets_task')] }),
    });

    expect(run.status).toBe('waiting');
    expect(run.parkView()).toMatchObject({
      workflowName: 'secrets_request',
      widget: 'secret-input',
      documentName: 'secret_request',
      content: { variables: VARIABLES },
      defaultTransition: 'secretsSubmitted',
    });
  });

  // `llm_generate_object` is registered app-wide but not offered to this agent; `request_secrets` is a
  // plausible guess at a secrets tool name. Neither may run — the LLM gets an error result instead.
  it.each(['llm_generate_object', 'request_secrets'])(
    'refuses %s, a tool outside its tools list, and reports the error to the LLM',
    async (toolName) => {
      const run = await runWorkflow(AgenticExampleWorkflow, undefined, {
        imports,
        replayTools: [LlmGenerateTextTool],
        replay: replay({ version: 3, recordings: [toolCallTurn(toolName), SUMMARY_TURN] }),
      });

      expect(run.error).toBeUndefined();
      expect(run.place).toBe('waiting_for_user');
      expect(run.toolCalls.map((c) => c.toolName)).not.toContain(toolName);
      expect(toolResults(run)).toEqual([
        expect.objectContaining({ isError: true, content: expect.stringContaining('not available') }),
      ]);
    },
  );
});
