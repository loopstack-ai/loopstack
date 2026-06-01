import { type DynamicModule, Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { McpToolConfigSchema } from './config/mcp-tool-config.schema.js';
import type { McpToolConfigInput } from './config/mcp-tool-config.schema.js';
import { MCP_ENV_READER, ProcessEnvReader } from './services/env-reader.js';
import { McpClientService } from './services/index.js';
import { MCP_METRICS, NoopMcpMetrics } from './services/metrics-port.js';
import { McpCallTool, McpListToolsTool } from './tools/index.js';

import { MCP_DEFAULT_CONFIG } from './tokens.js';

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
