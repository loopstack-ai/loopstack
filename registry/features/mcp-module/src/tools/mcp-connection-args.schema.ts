import { z } from 'zod';

export const McpConnectionArgsSchema = z
  .object({
    serverUrl: z.url().describe('MCP endpoint URL (https recommended).'),
    timeoutMs: z.number().int().positive().max(900_000).optional().describe('Per-request timeout (ms).'),
    transport: z
      .enum(['streamableHttp', 'sse'])
      .optional()
      .default('streamableHttp')
      .describe('Use `sse` only for legacy MCP servers that still expose SSE.'),
  })
  .strict();

export type McpConnectionArgs = z.infer<typeof McpConnectionArgsSchema>;
