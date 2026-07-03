import { stdin } from 'node:process';
import { createInterface } from 'node:readline/promises';
import pc from 'picocolors';
import type { ActivePrompt } from './discovery.js';

export interface PromptAnswer {
  transitionId: string;
  payload: unknown;
}

interface FormAction {
  transition?: string;
  label?: string;
}

function availableTransitionIds(prompt: ActivePrompt): string[] {
  return prompt.workflow.availableTransitions?.map((transition) => transition.id) ?? [];
}

/** The widget's configured transition when the workflow accepts it, else a lone available one. */
function resolveTransitionId(prompt: ActivePrompt): string | undefined {
  const available = availableTransitionIds(prompt);
  const configured = prompt.widget?.options?.transition as string | undefined;
  if (configured && available.includes(configured)) return configured;
  if (available.length === 1) return available[0];
  return undefined;
}

/**
 * Renders the prompt and collects the user's answer — the terminal
 * counterpart of Studio's prompt renderers. Returns `undefined` when the
 * user aborts (empty input on a picker).
 */
export async function promptForAnswer(
  prompt: ActivePrompt,
  out: NodeJS.WritableStream,
): Promise<PromptAnswer | undefined> {
  const rl = createInterface({ input: stdin, output: out });
  try {
    const widget = prompt.widget?.widget;
    const content = (prompt.document?.content ?? {}) as Record<string, unknown>;

    if (widget === 'text-prompt' || widget === 'confirm-prompt' || widget === 'choices') {
      const transitionId = resolveTransitionId(prompt);
      if (!transitionId) return await pickTransition(prompt, rl, out);
      out.write(`\n${String(content.question ?? 'Input required')}\n`);

      if (widget === 'confirm-prompt') {
        const raw = (await rl.question(`${pc.bold('[y]es / [n]o:')} `)).trim().toLowerCase();
        return { transitionId, payload: { answer: raw === 'y' || raw === 'yes' ? 'yes' : 'no' } };
      }

      if (widget === 'choices') {
        const options = Array.isArray(content.options) ? (content.options as string[]) : [];
        const allowCustom = content.allowCustomAnswer === true;
        options.forEach((option, index) => out.write(`  ${pc.bold(String(index + 1))}. ${option}\n`));
        if (allowCustom) out.write(pc.dim('  (or type a custom answer)\n'));
        const raw = (await rl.question(`${pc.bold('answer:')} `)).trim();
        const byNumber = options[Number(raw) - 1];
        const answer = byNumber ?? (allowCustom || options.includes(raw) ? raw : undefined);
        if (!answer) return undefined;
        return { transitionId, payload: { answer } };
      }

      const answer = (await rl.question(`${pc.bold('>')} `)).trim();
      if (!answer) return undefined;
      return { transitionId, payload: { answer } };
    }

    if (widget === 'form') {
      const actions = ((prompt.widget?.options?.actions as FormAction[] | undefined) ?? []).filter(
        (action) => action.transition && availableTransitionIds(prompt).includes(action.transition),
      );
      if (actions.length === 0) return await pickTransition(prompt, rl, out);

      const markdown = typeof content.markdown === 'string' ? content.markdown : JSON.stringify(content, null, 2);
      out.write(`\n${markdown}\n\n`);
      actions.forEach((action, index) =>
        out.write(`  ${pc.bold(String(index + 1))}. ${action.label ?? action.transition}\n`),
      );
      const raw = (await rl.question(`${pc.bold('action:')} `)).trim();
      const action = actions[Number(raw) - 1] ?? actions.find((candidate) => candidate.label === raw);
      if (!action) return undefined;
      return { transitionId: action.transition!, payload: {} };
    }

    return await pickTransition(prompt, rl, out);
  } finally {
    rl.close();
  }
}

/** Fallback when no renderable prompt document exists: pick a transition directly. */
async function pickTransition(
  prompt: ActivePrompt,
  rl: ReturnType<typeof createInterface>,
  out: NodeJS.WritableStream,
): Promise<PromptAnswer | undefined> {
  const available = availableTransitionIds(prompt);
  if (available.length === 0) return undefined;

  out.write(`\nRun is waiting — available transitions:\n`);
  available.forEach((id, index) => out.write(`  ${pc.bold(String(index + 1))}. ${id}\n`));
  const raw = (await rl.question(`${pc.bold('transition:')} `)).trim();
  const transitionId = available[Number(raw) - 1] ?? (available.includes(raw) ? raw : undefined);
  if (!transitionId) return undefined;
  return { transitionId, payload: {} };
}

/** One-line description of the prompt for non-interactive shells. */
export function describePrompt(prompt: ActivePrompt): string {
  const content = (prompt.document?.content ?? {}) as Record<string, unknown>;
  if (typeof content.question === 'string') return content.question;
  if (typeof content.markdown === 'string') return content.markdown.split('\n')[0];
  return `transitions: ${availableTransitionIds(prompt).join(', ')}`;
}
