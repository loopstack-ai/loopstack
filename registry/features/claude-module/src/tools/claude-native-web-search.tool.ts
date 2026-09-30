import { z } from 'zod';
import { ServerTool, Tool } from '@loopstack/common';

/**
 * Zod schema for `ClaudeNativeWebSearchTool` configuration.
 *
 * @public
 */
export const ClaudeNativeWebSearchToolConfigSchema = z.object({
  maxUses: z.number().int().positive().default(8),
  allowedDomains: z.array(z.string()).optional(),
  blockedDomains: z.array(z.string()).optional(),
});

/**
 * Config for `ClaudeNativeWebSearchTool`.
 *
 * @public
 */
export type ClaudeNativeWebSearchToolConfig = z.infer<typeof ClaudeNativeWebSearchToolConfigSchema>;

/**
 * Claude's provider-native web search. List it in an LLM call's `tools` (an agent or `llm_generate_text`) and
 * Claude runs the search inside that same call. It is not callable from workflow code — for a standalone search
 * step, use `ClaudeWebSearchStepTool` (`claude_web_search_step`) from `@loopstack/claude-tools-module`.
 *
 * @providedBy ClaudeModule
 * @public
 */
@Tool({
  name: 'claude_native_web_search',
  description:
    "Claude's provider-native web search. Attach it to an LLM call by listing it in `tools`; " +
    'Claude runs the search inside that same call. Not callable from workflow code — ' +
    'for a standalone search from a workflow, use claude_web_search_step. ' +
    'Config: { maxUses, allowedDomains, blockedDomains }.',
  configSchema: ClaudeNativeWebSearchToolConfigSchema,
  effects: 'none',
})
export class ClaudeNativeWebSearchTool extends ServerTool<ClaudeNativeWebSearchToolConfig> {
  toServerToolConfig(config?: ClaudeNativeWebSearchToolConfig): unknown {
    const maxUses = config?.maxUses ?? 8;

    return {
      type: 'web_search_20260209',
      name: 'web_search',
      max_uses: maxUses,
      ...(config?.allowedDomains?.length ? { allowed_domains: config.allowedDomains } : {}),
      ...(config?.blockedDomains?.length ? { blocked_domains: config.blockedDomains } : {}),
    };
  }
}
