import { z } from 'zod';
import { Tool, ToolCallOptions, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { McpToolConfigSchema } from '../config/mcp-tool-config.schema.js';
import type { McpToolConfig } from '../config/mcp-tool-config.schema.js';
import { McpConnectionArgsSchema } from './mcp-connection-args.schema.js';
import { McpToolBase } from './mcp-tool-base.js';

export const McpCallToolArgsSchema = McpConnectionArgsSchema.extend({
  toolName: z.string().min(1).describe('Name of the remote MCP tool to invoke.'),
  arguments: z.record(z.string(), z.unknown()).optional().default({}).describe('JSON object passed to the tool.'),
}).strict();

export type McpCallToolArgs = z.infer<typeof McpCallToolArgsSchema>;

@Tool({
  name: 'mcp_call',
  description:
    'Calls a tool on a remote MCP server over HTTPS (Streamable HTTP or legacy SSE). Requires `allowedHosts` and optional `headerEnv`/`hostHeaderEnv` via tool config.',
  schema: McpCallToolArgsSchema,
  configSchema: McpToolConfigSchema,
})
export class McpCallTool extends McpToolBase<McpCallToolArgs> {
  protected async handle(
    args: McpCallToolArgs,
    ctx: RunContext,
    options?: ToolCallOptions<McpToolConfig>,
  ): Promise<ToolEnvelope> {
    const cfg = this.requireConfig(options?.config);

    const result = await this.mcp.callTool(args.serverUrl, cfg, args.toolName, args.arguments, {
      timeoutMs: args.timeoutMs,
      transport: args.transport,
    });

    return { data: result };
  }
}
