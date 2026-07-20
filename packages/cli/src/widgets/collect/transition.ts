import type { CollectContext } from '../types.js';

/** The widget's configured transition when the workflow accepts it, else a lone available one. */
export function resolveTransitionId(ctx: CollectContext): string | undefined {
  const configured = ctx.options?.transition as string | undefined;
  if (configured && ctx.availableTransitions.includes(configured)) return configured;
  if (ctx.availableTransitions.length === 1) return ctx.availableTransitions[0];
  return undefined;
}
