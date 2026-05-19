import { Module, Provider } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { MCP_ENV_READER, ProcessEnvReader } from './services/env-reader.js';
import { McpClientService } from './services/index.js';
import { MCP_METRICS, NoopMcpMetrics } from './services/metrics-port.js';
import { McpCallTool, McpListToolsTool } from './tools/index.js';

const envReaderProvider: Provider = {
  provide: MCP_ENV_READER,
  useClass: ProcessEnvReader,
};

const metricsProvider: Provider = {
  provide: MCP_METRICS,
  useClass: NoopMcpMetrics,
};

@Module({
  imports: [LoopCoreModule],
  providers: [envReaderProvider, metricsProvider, McpClientService, McpListToolsTool, McpCallTool],
  exports: [MCP_ENV_READER, MCP_METRICS, McpClientService, McpListToolsTool, McpCallTool],
})
export class McpModule {}
