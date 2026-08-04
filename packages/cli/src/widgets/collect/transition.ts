import { resolveSubmitTransition } from '@loopstack/contracts/park-view';
import type { CollectContext } from '../types.js';

/** The transition an answer resolves to — the canonical park-view rule over the widget's options. */
export function resolveTransitionId(ctx: CollectContext): string | undefined {
  return resolveSubmitTransition({ widget: '', options: ctx.options }, ctx.availableTransitions);
}
