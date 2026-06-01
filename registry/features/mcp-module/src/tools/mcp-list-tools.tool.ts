import { z } from 'zod';
import { Tool, ToolCallOptions, ToolResult } from '@loopstack/common';
import { McpToolConfigSchema } from '../config/mcp-tool-config.schema.js';
import type { McpToolConfig } from '../config/mcp-tool-config.schema.js';
import { McpConnectionArgsSchema } from './mcp-connection-args.schema.js';
import { McpToolBase } from './mcp-tool-base.js';

export const McpListToolsArgsSchema = McpConnectionArgsSchema;

export type McpListToolsArgs = z.infer<typeof McpListToolsArgsSchema>;

@Tool({
  name: 'mcp_list_tools',
  uiConfig: {
    description:
      'Lists tool definitions exposed by a remote MCP server (Streamable HTTP or legacy SSE). Requires `allowedHosts` (and optional auth headers) via tool config.',
  },
  schema: McpListToolsArgsSchema,
  configSchema: McpToolConfigSchema,
})
export class McpListToolsTool extends McpToolBase<McpListToolsArgs> {
  protected async handle(args: McpListToolsArgs, options?: ToolCallOptions<McpToolConfig>): Promise<ToolResult> {
    const cfg = this.requireConfig(options?.config);

    const result = await this.mcp.listTools(args.serverUrl, cfg, {
      timeoutMs: args.timeoutMs,
      transport: args.transport,
    });

    return { data: result as Record<string, unknown> };
  }
}
