import { z } from 'zod';
import { ServerTool, Tool } from '@loopstack/common';

export const ClaudeWebSearchServerToolConfigSchema = z.object({
  maxUses: z.number().int().positive().default(8),
  allowedDomains: z.array(z.string()).optional(),
  blockedDomains: z.array(z.string()).optional(),
});

type ClaudeWebSearchServerToolConfig = z.infer<typeof ClaudeWebSearchServerToolConfigSchema>;

@Tool({
  uiConfig: {
    description:
      "Search the web using Claude's built-in server-side web search tool. " +
      'Provides real-time information retrieval during agent conversations. ' +
      'Configure via @InjectTool({ maxUses, allowedDomains, blockedDomains }).',
  },
  configSchema: ClaudeWebSearchServerToolConfigSchema,
})
export class ClaudeWebSearchServerTool extends ServerTool<ClaudeWebSearchServerToolConfig> {
  toServerToolConfig(config?: ClaudeWebSearchServerToolConfig): unknown {
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
