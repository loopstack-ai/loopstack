import pc from 'picocolors';
import type { CollectWidget } from '../types.js';
import { resolveTransitionId } from './transition.js';

/** `text-prompt`: free-text answer to the document's question. */
export const collectText: CollectWidget = async (ctx, io) => {
  const transitionId = resolveTransitionId(ctx);
  if (!transitionId) return undefined;
  io.out.write(`\n${String(ctx.content.question ?? 'Input required')}\n`);
  const answer = (await io.ask(`${pc.bold('>')} `)).trim();
  if (!answer) return undefined;
  return { transitionId, payload: { answer } };
};

/** `confirm-prompt`: one-keystroke yes/no. */
export const collectConfirm: CollectWidget = async (ctx, io) => {
  const transitionId = resolveTransitionId(ctx);
  if (!transitionId) return undefined;
  io.out.write(`\n${String(ctx.content.question ?? 'Input required')}\n`);
  const raw = (await io.ask(`${pc.bold('[y]es / [n]o:')} `)).trim().toLowerCase();
  return { transitionId, payload: { answer: raw === 'y' || raw === 'yes' ? 'yes' : 'no' } };
};

/** `choices`: numbered picker, optionally allowing a custom answer. */
export const collectChoices: CollectWidget = async (ctx, io) => {
  const transitionId = resolveTransitionId(ctx);
  if (!transitionId) return undefined;
  io.out.write(`\n${String(ctx.content.question ?? 'Input required')}\n`);
  const choices = Array.isArray(ctx.content.options) ? (ctx.content.options as string[]) : [];
  const allowCustom = ctx.content.allowCustomAnswer === true;
  choices.forEach((option, index) => io.out.write(`  ${pc.bold(String(index + 1))}. ${option}\n`));
  if (allowCustom) io.out.write(pc.dim('  (or type a custom answer)\n'));
  const raw = (await io.ask(`${pc.bold('answer:')} `)).trim();
  const byNumber = choices[Number(raw) - 1];
  const answer = byNumber ?? (allowCustom || choices.includes(raw) ? raw : undefined);
  if (!answer) return undefined;
  return { transitionId, payload: { answer } };
};
