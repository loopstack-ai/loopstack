import { type DynamicModule, Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { McpToolConfigSchema } from './config/mcp-tool-config.schema.js';
import type { McpToolConfigInput } from './config/mcp-tool-config.schema.js';
import { MCP_ENV_READER, ProcessEnvReader } from './services/env-reader.js';
import { McpClientService } from './services/index.js';
import { MCP_METRICS, NoopMcpMetrics } from './services/metrics-port.js';
import { MCP_DEFAULT_CONFIG } from './tokens.js';
import { McpCallTool, McpListToolsTool } from './tools/index.js';

/**
 * NestJS module that provides remote MCP client tools — `mcp_list_tools` (`McpListToolsTool`),
 * `mcp_call` (`McpCallTool`), and the `McpClientService` that connects to remote Model Context
 * Protocol servers.
 *
 * Registration:
 * - `McpModule.forRoot(McpToolConfigInput)` — the only entry point; registers the module globally and
 *   co-imports `LoopCoreModule`. Pass config (allowlist, auth header mappings) to apply it to every
 *   tool call; config is optional here, in which case each call must supply config via `options.config`.
 *
 * Requires: an `allowedHosts` allowlist supplied either at the module level (via `forRoot`) or per call
 * via `options.config` — a tool call with no config at either level throws (the SSRF allowlist is
 * mandatory). For authenticated servers, the env vars referenced by `hostHeaderEnv` / `headerEnv` must
 * also be set, since header values are read from `process.env` at call time.
 *
 * @public
 */
@Module({})
export class McpModule {
  static forRoot(config?: McpToolConfigInput): DynamicModule {
    const parsed = config ? McpToolConfigSchema.parse(config) : null;
    return {
      global: true,
      module: McpModule,
      imports: [LoopCoreModule],
      providers: [
        { provide: MCP_ENV_READER, useClass: ProcessEnvReader },
        { provide: MCP_METRICS, useClass: NoopMcpMetrics },
        { provide: MCP_DEFAULT_CONFIG, useValue: parsed },
        McpClientService,
        McpListToolsTool,
        McpCallTool,
      ],
      exports: [MCP_DEFAULT_CONFIG, MCP_ENV_READER, MCP_METRICS, McpClientService, McpListToolsTool, McpCallTool],
    };
  }
}
