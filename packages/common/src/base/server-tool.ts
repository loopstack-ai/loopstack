import { Injectable } from '@nestjs/common';

/**
 * Abstract base class for server-side tools — tools executed by the LLM provider
 * rather than locally by the framework.
 *
 * Server tools (e.g. Anthropic's `web_search`, `code_execution`) are configured
 * at API call time and the provider handles execution. The framework passes the
 * validated config from {@link toServerToolConfig} directly to the provider.
 *
 * Use the standard `@Tool()` decorator for metadata and constructor injection.
 * Configuration from `options.config` is validated against the
 * `configSchema` and passed as the `config` argument to {@link toServerToolConfig}.
 *
 * ```ts
 * const ConfigSchema = z.object({
 *   maxUses: z.number().default(8),
 *   allowedDomains: z.array(z.string()).optional(),
 * });
 * type Config = z.infer<typeof ConfigSchema>;
 *
 * @Tool({ description: '...', configSchema: ConfigSchema })
 * export class MyServerTool extends ServerTool<Config> {
 *   toServerToolConfig(config?: Config) {
 *     return { type: 'web_search_20260209', name: 'web_search', max_uses: config?.maxUses ?? 8 };
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class ServerTool<TConfig extends object = object> {
  /**
   * Returns the provider-native tool configuration.
   *
   * Called by LlmToolsHelperService when building tool definitions for the LLM.
   * The returned object is passed as-is to the provider's API call.
   *
   * @param config — Validated config from `options.config`, validated against `configSchema`.
   */
  abstract toServerToolConfig(config?: TConfig): unknown;
}
