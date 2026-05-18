import { Module, Provider } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { McpClientService } from './services';
import { MCP_ENV_READER, ProcessEnvReader } from './services/env-reader';
import { MCP_METRICS, NoopMcpMetrics } from './services/metrics-port';
import { McpCallTool, McpListToolsTool } from './tools';

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
