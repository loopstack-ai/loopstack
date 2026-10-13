import { describe, expect, it, vi } from 'vitest';
import { ClaudeClientService, ClaudeModule } from '@loopstack/claude';
import { LlmProviderModule } from '@loopstack/llm-provider';
import { runWorkflow } from '@loopstack/testing';
import { ServerToolExampleWorkflow } from '../server-tool-example.workflow';
import { CodeExecutionTool } from '../tools/code-execution.tool';

/** The reply Anthropic sends when Claude ran code in its sandbox during the call. */
const REPLY = {
  id: 'msg_1',
  type: 'message',
  role: 'assistant',
  model: 'claude-test',
  stop_reason: 'end_turn',
  usage: { input_tokens: 10, output_tokens: 5 },
  content: [
    { type: 'text', text: 'Let me compute that.' },
    {
      type: 'server_tool_use',
      id: 'srvtoolu_1',
      name: 'bash_code_execution',
      input: { command: 'python3 -c "print(sum(primes(100)))"' },
    },
    {
      type: 'bash_code_execution_tool_result',
      tool_use_id: 'srvtoolu_1',
      content: { type: 'bash_code_execution_result', stdout: '24133\n', stderr: '', return_code: 0, content: [] },
    },
    { type: 'text', text: 'The sum of the first 100 primes is 24133.' },
  ],
};

/**
 * Fakes only the Anthropic client. `llm_generate_text`, the tool's `toServerToolConfig()` and the Claude provider
 * run for real, so the test sees the request Claude would get and the reply as the workflow reads it.
 */
const fakeClaudeClient = () => {
  const stream = vi.fn(() => ({ on: vi.fn(), finalMessage: () => Promise.resolve(REPLY) }));
  const clientService = { getClient: () => ({ messages: { stream } }), getModel: () => 'claude-test' };
  return { stream, clientService };
};

describe('ServerToolExampleWorkflow', () => {
  it('sends the server tool spec to Claude and reads the code and its output from the reply blocks', async () => {
    const { stream, clientService } = fakeClaudeClient();

    const run = await runWorkflow(
      ServerToolExampleWorkflow,
      {},
      {
        imports: [LlmProviderModule, ClaudeModule],
        providers: [CodeExecutionTool],
        overrides: [[ClaudeClientService, clientService]],
      },
    );

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');

    // The listed tool name became the provider-native spec from toServerToolConfig().
    const request = (stream.mock.calls[0] as unknown[])[0] as { tools: unknown[] };
    expect(request.tools).toEqual([new CodeExecutionTool().toServerToolConfig()]);

    expect(run.result).toEqual({
      code: { command: 'python3 -c "print(sum(primes(100)))"' },
      output: '24133\n',
      answer: 'Let me compute that.\nThe sum of the first 100 primes is 24133.',
    });
  });
});
