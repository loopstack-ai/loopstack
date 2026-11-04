import { describe, expect, it, vi } from 'vitest';
import { ClaudeClientService, ClaudeModule, ClaudeNativeWebSearchTool } from '@loopstack/claude';
import { LlmProviderModule } from '@loopstack/llm-provider';
import { runWorkflow } from '@loopstack/testing';
import { NativeSearchExampleWorkflow } from '../native-search-example.workflow';

/** The reply Anthropic sends when Claude searched the web during the call. */
const REPLY = {
  id: 'msg_1',
  type: 'message',
  role: 'assistant',
  model: 'claude-test',
  stop_reason: 'end_turn',
  usage: { input_tokens: 10, output_tokens: 5 },
  content: [
    { type: 'text', text: 'Let me search for that.' },
    {
      type: 'server_tool_use',
      id: 'srvtoolu_1',
      name: 'web_search',
      input: { query: 'latest Node.js release' },
    },
    {
      type: 'web_search_tool_result',
      tool_use_id: 'srvtoolu_1',
      content: [
        {
          type: 'web_search_result',
          title: 'Node.js — Releases',
          url: 'https://nodejs.org/en/about/previous-releases',
          encrypted_content: 'enc_1',
          page_age: null,
        },
        {
          type: 'web_search_result',
          title: 'Node.js Blog',
          url: 'https://nodejs.org/en/blog',
          encrypted_content: 'enc_2',
          page_age: null,
        },
      ],
    },
    { type: 'text', text: 'The latest stable release is Node.js 26.' },
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

describe('NativeSearchExampleWorkflow', () => {
  it('sends the web search spec to Claude and reads the queries and sources from the reply blocks', async () => {
    const { stream, clientService } = fakeClaudeClient();

    const run = await runWorkflow(NativeSearchExampleWorkflow, undefined, {
      imports: [LlmProviderModule, ClaudeModule],
      overrides: [[ClaudeClientService, clientService]],
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');

    // The listed tool name became Claude's native web search spec, sent in the same request as the prompt.
    expect(stream).toHaveBeenCalledTimes(1);
    const request = (stream.mock.calls[0] as unknown[])[0] as { tools: unknown[] };
    expect(request.tools).toEqual([new ClaudeNativeWebSearchTool().toServerToolConfig()]);

    expect(run.result).toEqual({
      queries: ['latest Node.js release'],
      sources: [
        { title: 'Node.js — Releases', url: 'https://nodejs.org/en/about/previous-releases' },
        { title: 'Node.js Blog', url: 'https://nodejs.org/en/blog' },
      ],
      answer: 'Let me search for that.\nThe latest stable release is Node.js 26.',
    });

    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts).toContain(
      '**Sources**\n\n' +
        '- [Node.js — Releases](https://nodejs.org/en/about/previous-releases)\n' +
        '- [Node.js Blog](https://nodejs.org/en/blog)',
    );
  });
});
