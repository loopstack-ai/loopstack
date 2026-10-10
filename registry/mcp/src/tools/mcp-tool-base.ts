import { Inject, Optional } from '@nestjs/common';
import { BaseTool } from '@loopstack/common';
import type { McpToolConfig } from '../config/mcp-tool-config.schema.js';
import { McpClientService } from '../services/mcp-client.service.js';
import { MCP_DEFAULT_CONFIG } from '../tokens.js';

/**
 * Abstract base for tools that call a remote MCP server; extend it to add custom MCP-backed tools.
 *
 * Concrete subclasses must repeat the `@Tool({ schema, configSchema })` decorator —
 * decorator metadata is not inherited.
 *
 * @public
 */
export abstract class McpToolBase<TArgs extends object> extends BaseTool<TArgs, McpToolConfig> {
  @Inject() protected readonly mcp!: McpClientService;
  @Optional() @Inject(MCP_DEFAULT_CONFIG) private readonly defaultConfig?: McpToolConfig | null;

  protected requireConfig(config: McpToolConfig | undefined): McpToolConfig {
    const resolved = config ?? this.defaultConfig ?? undefined;
    if (!resolved?.allowedHosts?.length) {
      throw new Error(
        `${this.constructor.name} requires config with allowedHosts: [...] (via options.config or McpModule.forRoot()).`,
      );
    }
    return resolved;
  }
}
