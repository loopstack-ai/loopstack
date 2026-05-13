import { z } from 'zod';
import { Tool, ToolCallOptions, ToolResult } from '@loopstack/common';
import { McpToolConfigSchema } from '../config/mcp-tool-config.schema';
import type { McpToolConfig } from '../config/mcp-tool-config.schema';
import { McpConnectionArgsSchema } from './mcp-connection-args.schema';
import { McpToolBase } from './mcp-tool-base';

export const McpCallToolArgsSchema = McpConnectionArgsSchema.extend({
  toolName: z.string().min(1).describe('Name of the remote MCP tool to invoke.'),
  arguments: z.record(z.string(), z.unknown()).optional().default({}).describe('JSON object passed to the tool.'),
}).strict();

export type McpCallToolArgs = z.infer<typeof McpCallToolArgsSchema>;

@Tool({
  uiConfig: {
    description:
      'Calls a tool on a remote MCP server over HTTPS (Streamable HTTP or legacy SSE). Requires `allowedHosts` and optional `headerEnv`/`hostHeaderEnv` via `@InjectTool`.',
  },
  schema: McpCallToolArgsSchema,
  configSchema: McpToolConfigSchema,
})
export class McpCallTool extends McpToolBase<McpCallToolArgs> {
  async call(args: McpCallToolArgs, options?: ToolCallOptions<McpToolConfig>): Promise<ToolResult> {
    const cfg = this.requireConfig(options?.config);

    const result = await this.mcp.callTool(args.serverUrl, cfg, args.toolName, args.arguments ?? {}, {
      timeoutMs: args.timeoutMs,
      transport: args.transport,
    });

    return { data: result };
  }
}
