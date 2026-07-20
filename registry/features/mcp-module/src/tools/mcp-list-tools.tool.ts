import { z } from 'zod';
import { Tool, ToolCallOptions, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { McpToolConfigSchema } from '../config/mcp-tool-config.schema.js';
import type { McpToolConfig } from '../config/mcp-tool-config.schema.js';
import { McpConnectionArgsSchema } from './mcp-connection-args.schema.js';
import { McpToolBase } from './mcp-tool-base.js';

/**
 * Zod schema for `mcp_list_tools` tool arguments.
 *
 * @public
 */
export const McpListToolsArgsSchema = McpConnectionArgsSchema;

/**
 * Args for `McpListToolsTool` (`mcp_list_tools`).
 *
 * @public
 */
export type McpListToolsArgs = z.infer<typeof McpListToolsArgsSchema>;

/**
 * Tool that lists the tool definitions exposed by a remote MCP server.
 *
 * @providedBy McpModule
 * @public
 */
@Tool({
  name: 'mcp_list_tools',
  description:
    'Lists tool definitions exposed by a remote MCP server (Streamable HTTP or legacy SSE). Requires `allowedHosts` (and optional auth headers) via tool config.',
  schema: McpListToolsArgsSchema,
  configSchema: McpToolConfigSchema,
})
export class McpListToolsTool extends McpToolBase<McpListToolsArgs> {
  protected async handle(
    args: McpListToolsArgs,
    ctx: RunContext,
    options?: ToolCallOptions<McpToolConfig>,
  ): Promise<ToolEnvelope> {
    const cfg = this.requireConfig(options?.config);

    const result = await this.mcp.listTools(args.serverUrl, cfg, {
      timeoutMs: args.timeoutMs,
      transport: args.transport,
    });

    return { data: result as Record<string, unknown> };
  }
}
