import type { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockName } from '@loopstack/common';
import { LlmGenerateTextTool } from '@loopstack/llm-provider';
import { createToolTest } from '@loopstack/testing';
import { ClaudeWebSearchStepTool } from '../claude-web-search-step.tool.js';

const response = {
  content: [
    { type: 'text', text: 'Searching.' },
    { type: 'server_tool_use', id: 'srv_1', name: 'web_search', input: { query: 'loopstack' } },
    {
      type: 'web_search_tool_result',
      tool_use_id: 'srv_1',
      content: [
        { type: 'web_search_result', title: 'Loopstack', url: 'https://loopstack.ai', encrypted_content: 'x' },
        { type: 'web_search_result', title: 'Docs', url: 'https://loopstack.ai/docs', encrypted_content: 'y' },
      ],
    },
    { type: 'text', text: 'Loopstack is a workflow framework.' },
  ],
};

describe('ClaudeWebSearchStepTool', () => {
  let module: TestingModule;
  let tool: ClaudeWebSearchStepTool;

  const mockLlmGenerateText = {
    call: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockLlmGenerateText.call.mockResolvedValue({ data: { response }, metadata: { provider: 'claude' } });

    module = await createToolTest()
      .forTool(ClaudeWebSearchStepTool)
      .withMock(LlmGenerateTextTool, mockLlmGenerateText)
      .compile();

    tool = module.get(ClaudeWebSearchStepTool);
  });

  afterEach(async () => {
    await module.close();
  });

  it('registers as claude_web_search_step', () => {
    expect(getBlockName(tool)).toBe('claude_web_search_step');
  });

  it('runs the nested Claude call with the native search tool and without saving its reply', async () => {
    await tool.call({ query: 'loopstack' });

    expect(mockLlmGenerateText.call).toHaveBeenCalledTimes(1);
    const [, options] = mockLlmGenerateText.call.mock.calls[0];
    expect(options.config).toMatchObject({
      provider: 'claude',
      save: false,
      tools: ['claude_native_web_search'],
    });
  });

  it('parses hits and commentary from the nested reply', async () => {
    const result = await tool.call({ query: 'loopstack' });

    expect(result.data.query).toBe('loopstack');
    expect(result.data.results).toEqual([
      'Searching.',
      {
        tool_use_id: 'srv_1',
        content: [
          { title: 'Loopstack', url: 'https://loopstack.ai' },
          { title: 'Docs', url: 'https://loopstack.ai/docs' },
        ],
      },
      'Loopstack is a workflow framework.',
    ]);
  });
});
