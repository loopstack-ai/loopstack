import pc from 'picocolors';
import type { CollectWidget } from '../types.js';
import { resolveTransitionId } from './transition.js';

/**
 * `prompt-input`: workflow-level chat input (`@Workflow({ widget })`) — the
 * transition schema is the raw message string, not an `{ answer }` object.
 */
export const collectPromptInput: CollectWidget = async (ctx, io) => {
  const transitionId = resolveTransitionId(ctx);
  if (!transitionId) return undefined;
  const label = (ctx.options?.label as string | undefined) ?? 'message';
  const answer = (await io.ask(`${pc.bold(`${label} >`)} `)).trim();
  if (!answer) return undefined;
  return { transitionId, payload: answer };
};

/**
 * `button`: workflow-level continue button — a single action firing its
 * transition; the terminal counterpart is a one-key confirm. Empty input
 * cancels (detach), like every other prompt.
 */
export const collectButton: CollectWidget = async (ctx, io) => {
  const transitionId = resolveTransitionId(ctx);
  if (!transitionId) return undefined;
  const label = (ctx.options?.label as string | undefined) ?? transitionId;
  io.out.write(`\n  ${pc.bold('1')}. ${label}\n`);
  const raw = (await io.ask(`${pc.bold('action:')} `)).trim();
  if (raw !== '1' && raw.toLowerCase() !== label.toLowerCase()) return undefined;
  return { transitionId, payload: {} };
};
