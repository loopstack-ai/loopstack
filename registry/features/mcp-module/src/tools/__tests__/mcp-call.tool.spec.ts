import { McpToolConfig, McpToolConfigSchema } from '../../config/mcp-tool-config.schema';
import type { McpClientService } from '../../services/mcp-client.service';
import { McpCallTool, McpCallToolArgsSchema } from '../mcp-call.tool';

function makeTool(mcp: Partial<McpClientService>): McpCallTool {
  const tool = new McpCallTool();
  (tool as unknown as { mcp: Partial<McpClientService> }).mcp = mcp;
  return tool;
}

function cfg(allowedHosts: string[]): McpToolConfig {
  return McpToolConfigSchema.parse({ allowedHosts });
}

describe('McpCallTool', () => {
  it('throws when config is missing allowedHosts', async () => {
    const tool = makeTool({ callTool: jest.fn() });
    await expect(
      tool.call(
        {
          serverUrl: 'https://mcp.linear.app/sse',
          toolName: 'createIssue',
          arguments: {},
          transport: 'streamableHttp',
        },
        // Schema would reject this, but we feed the tool directly to test the guard.
        { config: { allowedHosts: [] } as unknown as McpToolConfig },
      ),
    ).rejects.toThrow(/requires @InjectTool/);
  });

  it('forwards args to McpClientService.callTool and returns the data', async () => {
    const callTool = jest.fn().mockResolvedValue({ kind: 'callToolResult', content: [{ x: 1 }] });
    const tool = makeTool({ callTool });

    const result = await tool.call(
      {
        serverUrl: 'https://mcp.linear.app/sse',
        toolName: 'createIssue',
        arguments: { title: 'hi' },
        transport: 'sse',
        timeoutMs: 5000,
      },
      { config: cfg(['mcp.linear.app']) },
    );

    expect(callTool).toHaveBeenCalledWith(
      'https://mcp.linear.app/sse',
      expect.objectContaining({ allowedHosts: ['mcp.linear.app'] }),
      'createIssue',
      { title: 'hi' },
      { timeoutMs: 5000, transport: 'sse' },
    );
    expect(result).toEqual({ data: { kind: 'callToolResult', content: [{ x: 1 }] } });
  });

  it('defaults arguments to {} via the schema when omitted', async () => {
    const callTool = jest.fn().mockResolvedValue({ kind: 'callToolResult' });
    const tool = makeTool({ callTool });

    const parsed = McpCallToolArgsSchema.parse({
      serverUrl: 'https://mcp.linear.app/sse',
      toolName: 'noop',
    });

    await tool.call(parsed, { config: cfg(['mcp.linear.app']) });

    expect(callTool).toHaveBeenCalledWith(expect.any(String), expect.any(Object), 'noop', {}, expect.any(Object));
  });
});
