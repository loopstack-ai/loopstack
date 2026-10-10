/**
 * Model pricing in USD per 1 million tokens.
 * Used by the quota calculator to compute cost from token usage.
 */
export interface ModelPricing {
  inputPerMToken: number;
  outputPerMToken: number;
  cacheCreationPerMToken?: number;
  cacheReadPerMToken?: number;
}

/**
 * Pricing table keyed by `{provider}:{model-prefix}`.
 * Lookup matches the longest prefix, so "claude:claude-sonnet-4" matches
 * before "claude:" (the provider fallback).
 */
const MODEL_PRICING_TABLE: Record<string, ModelPricing> = {
  // Claude
  'claude:claude-opus-4': {
    inputPerMToken: 15,
    outputPerMToken: 75,
    cacheCreationPerMToken: 18.75,
    cacheReadPerMToken: 1.5,
  },
  'claude:claude-sonnet-4': {
    inputPerMToken: 3,
    outputPerMToken: 15,
    cacheCreationPerMToken: 3.75,
    cacheReadPerMToken: 0.3,
  },
  'claude:claude-haiku-4': {
    inputPerMToken: 0.8,
    outputPerMToken: 4,
    cacheCreationPerMToken: 1,
    cacheReadPerMToken: 0.08,
  },
  'claude:claude-3-5-sonnet': {
    inputPerMToken: 3,
    outputPerMToken: 15,
    cacheCreationPerMToken: 3.75,
    cacheReadPerMToken: 0.3,
  },
  'claude:claude-3-5-haiku': {
    inputPerMToken: 0.8,
    outputPerMToken: 4,
    cacheCreationPerMToken: 1,
    cacheReadPerMToken: 0.08,
  },

  // OpenAI
  'openai:gpt-4o': { inputPerMToken: 2.5, outputPerMToken: 10, cacheReadPerMToken: 1.25 },
  'openai:gpt-4o-mini': { inputPerMToken: 0.15, outputPerMToken: 0.6, cacheReadPerMToken: 0.075 },
  'openai:gpt-4.1': { inputPerMToken: 2, outputPerMToken: 8, cacheReadPerMToken: 0.5 },
  'openai:gpt-4.1-mini': { inputPerMToken: 0.4, outputPerMToken: 1.6, cacheReadPerMToken: 0.1 },
  'openai:gpt-4.1-nano': { inputPerMToken: 0.1, outputPerMToken: 0.4, cacheReadPerMToken: 0.025 },
  'openai:o3': { inputPerMToken: 2, outputPerMToken: 8, cacheReadPerMToken: 0.5 },
  'openai:o3-mini': { inputPerMToken: 1.1, outputPerMToken: 4.4, cacheReadPerMToken: 0.55 },
  'openai:o4-mini': { inputPerMToken: 1.1, outputPerMToken: 4.4, cacheReadPerMToken: 0.55 },

  // Provider-level fallbacks (used when model is unknown)
  'claude:': { inputPerMToken: 3, outputPerMToken: 15, cacheCreationPerMToken: 3.75, cacheReadPerMToken: 0.3 },
  'openai:': { inputPerMToken: 2.5, outputPerMToken: 10, cacheReadPerMToken: 1.25 },
};

/**
 * Look up pricing for a provider+model combination.
 * Matches the longest prefix in the table, falling back to provider default.
 */
export function getModelPricing(provider: string, model: string): ModelPricing {
  const key = `${provider}:${model}`;

  // Exact match
  if (MODEL_PRICING_TABLE[key]) return MODEL_PRICING_TABLE[key];

  // Longest prefix match
  let bestMatch: ModelPricing | undefined;
  let bestLen = 0;
  for (const [prefix, pricing] of Object.entries(MODEL_PRICING_TABLE)) {
    if (key.startsWith(prefix) && prefix.length > bestLen) {
      bestMatch = pricing;
      bestLen = prefix.length;
    }
  }

  if (bestMatch) return bestMatch;

  // Ultimate fallback — Claude Sonnet-tier pricing
  return { inputPerMToken: 3, outputPerMToken: 15, cacheCreationPerMToken: 3.75, cacheReadPerMToken: 0.3 };
}
