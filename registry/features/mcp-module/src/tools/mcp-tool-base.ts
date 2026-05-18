import { Inject } from '@nestjs/common';
import { BaseTool } from '@loopstack/common';
import type { McpToolConfig } from '../config/mcp-tool-config.schema';
import { McpClientService } from '../services/mcp-client.service';

/**
 * Concrete subclasses must repeat the `@Tool({ schema, configSchema })` decorator —
 * decorator metadata is not inherited.
 */
export abstract class McpToolBase<TArgs extends object> extends BaseTool<TArgs, McpToolConfig> {
  @Inject() protected readonly mcp!: McpClientService;

  protected requireConfig(config: McpToolConfig | undefined): McpToolConfig {
    if (!config?.allowedHosts?.length) {
      throw new Error(`${this.constructor.name} requires @InjectTool({ allowedHosts: [...] }) configuration.`);
    }
    return config;
  }
}
