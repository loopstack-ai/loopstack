import { z } from 'zod';
import { Tool, ToolCallOptions, ToolResult } from '@loopstack/common';
import { McpToolConfigSchema } from '../config/mcp-tool-config.schema';
import type { McpToolConfig } from '../config/mcp-tool-config.schema';
import { McpConnectionArgsSchema } from './mcp-connection-args.schema';
import { McpToolBase } from './mcp-tool-base';

export const McpListToolsArgsSchema = McpConnectionArgsSchema;

export type McpListToolsArgs = z.infer<typeof McpListToolsArgsSchema>;

@Tool({
  uiConfig: {
    description:
      'Lists tool definitions exposed by a remote MCP server (Streamable HTTP or legacy SSE). Requires `allowedHosts` (and optional auth headers) via `@InjectTool`.',
  },
  schema: McpListToolsArgsSchema,
  configSchema: McpToolConfigSchema,
})
export class McpListToolsTool extends McpToolBase<McpListToolsArgs> {
  async call(args: McpListToolsArgs, options?: ToolCallOptions<McpToolConfig>): Promise<ToolResult> {
    const cfg = this.requireConfig(options?.config);

    const result = await this.mcp.listTools(args.serverUrl, cfg, {
      timeoutMs: args.timeoutMs,
      transport: args.transport,
    });

    return { data: result as Record<string, unknown> };
  }
}
