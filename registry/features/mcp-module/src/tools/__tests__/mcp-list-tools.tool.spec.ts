import { describe, expect, it, vi } from 'vitest';
import { McpToolConfig, McpToolConfigSchema } from '../../config/mcp-tool-config.schema.js';
import type { McpClientService } from '../../services/mcp-client.service.js';
import { McpListToolsTool } from '../mcp-list-tools.tool.js';

function makeTool(mcp: Partial<McpClientService>): McpListToolsTool {
  const tool = new McpListToolsTool();
  (tool as unknown as { mcp: Partial<McpClientService> }).mcp = mcp;
  return tool;
}

function cfg(allowedHosts: string[]): McpToolConfig {
  return McpToolConfigSchema.parse({ allowedHosts });
}

describe('McpListToolsTool', () => {
  it('throws when config is missing allowedHosts', async () => {
    const tool = makeTool({ listTools: vi.fn() });
    await expect(
      (tool as any).handle(
        { serverUrl: 'https://mcp.linear.app/sse', transport: 'streamableHttp' },
        { config: { allowedHosts: [] } as unknown as McpToolConfig },
      ),
    ).rejects.toThrow(/requires config with allowedHosts/);
  });

  it('forwards args to McpClientService.listTools', async () => {
    const listTools = vi.fn().mockResolvedValue({ tools: [{ name: 'createIssue' }] });
    const tool = makeTool({ listTools });

    const result = await (tool as any).handle(
      { serverUrl: 'https://mcp.linear.app/sse', transport: 'sse', timeoutMs: 1234 },
      { config: cfg(['mcp.linear.app']) },
    );

    expect(listTools).toHaveBeenCalledWith(
      'https://mcp.linear.app/sse',
      expect.objectContaining({ allowedHosts: ['mcp.linear.app'] }),
      { timeoutMs: 1234, transport: 'sse' },
    );
    expect(result).toEqual({ data: { tools: [{ name: 'createIssue' }] } });
  });
});
