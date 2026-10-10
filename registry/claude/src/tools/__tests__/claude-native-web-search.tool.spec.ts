import { describe, expect, it } from 'vitest';
import { getBlockName } from '@loopstack/common';
import { ClaudeNativeWebSearchTool } from '../claude-native-web-search.tool.js';

describe('ClaudeNativeWebSearchTool', () => {
  it('registers as claude_native_web_search', () => {
    expect(getBlockName(new ClaudeNativeWebSearchTool())).toBe('claude_native_web_search');
  });

  it('builds the Anthropic web_search server tool config', () => {
    const tool = new ClaudeNativeWebSearchTool();

    expect(tool.toServerToolConfig({ maxUses: 3, allowedDomains: ['a.com'] })).toEqual({
      type: 'web_search_20260209',
      name: 'web_search',
      max_uses: 3,
      allowed_domains: ['a.com'],
    });
  });
});
