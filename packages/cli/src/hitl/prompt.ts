import { stdin } from 'node:process';
import { createInterface } from 'node:readline/promises';
import pc from 'picocolors';
import type { ActivePrompt } from './discovery.js';
import { buildFormSkeleton, describeFormFields, editPayloadInEditor } from './editor.js';

export interface PromptAnswer {
  transitionId: string;
  payload: unknown;
}

/**
 * `'handoff'` — the prompt is a field form and Studio is the place to answer
 * it; the caller waits for the external resolution.
 */
export type PromptResult = PromptAnswer | 'handoff' | undefined;

export interface PromptOptions {
  /** Aborts open questions when the prompt is resolved elsewhere. */
  signal?: AbortSignal;
  /** Studio deep link of the run — enables the form handoff. */
  studioUrl?: string;
  /** Answer field forms in $EDITOR even when Studio is available. */
  useEditor?: boolean;
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

/** Fields the form expects — from the document schema, like Studio's Form renderer. */
function formProperties(prompt: ActivePrompt): Record<string, unknown> {
  const schema = prompt.widget?.schema as { type?: string; properties?: Record<string, unknown> } | undefined;
  if (schema?.type !== 'object') return {};
  return schema.properties ?? {};
}

/**
 * Renders the prompt and collects the user's answer — the terminal
 * counterpart of Studio's prompt renderers. Returns `undefined` when the
 * user aborts (empty input on a picker).
 */
export async function promptForAnswer(
  prompt: ActivePrompt,
  out: NodeJS.WritableStream,
  options: PromptOptions = {},
): Promise<PromptResult> {
  const rl = createInterface({ input: stdin, output: out });
  const ask = (query: string) => rl.question(query, { signal: options.signal });
  try {
    const widget = prompt.widget?.widget;
    const content = (prompt.document?.content ?? {}) as Record<string, unknown>;

    if (widget === 'text-prompt' || widget === 'confirm-prompt' || widget === 'choices') {
      const transitionId = resolveTransitionId(prompt);
      if (!transitionId) return await pickTransition(prompt, ask, out);
      out.write(`\n${String(content.question ?? 'Input required')}\n`);

      if (widget === 'confirm-prompt') {
        const raw = (await ask(`${pc.bold('[y]es / [n]o:')} `)).trim().toLowerCase();
        return { transitionId, payload: { answer: raw === 'y' || raw === 'yes' ? 'yes' : 'no' } };
      }

      if (widget === 'choices') {
        const choices = Array.isArray(content.options) ? (content.options as string[]) : [];
        const allowCustom = content.allowCustomAnswer === true;
        choices.forEach((option, index) => out.write(`  ${pc.bold(String(index + 1))}. ${option}\n`));
        if (allowCustom) out.write(pc.dim('  (or type a custom answer)\n'));
        const raw = (await ask(`${pc.bold('answer:')} `)).trim();
        const byNumber = choices[Number(raw) - 1];
        const answer = byNumber ?? (allowCustom || choices.includes(raw) ? raw : undefined);
        if (!answer) return undefined;
        return { transitionId, payload: { answer } };
      }

      const answer = (await ask(`${pc.bold('>')} `)).trim();
      if (!answer) return undefined;
      return { transitionId, payload: { answer } };
    }

    if (widget === 'prompt-input') {
      // Workflow-level chat input (`@Workflow({ widget })`): the transition
      // schema is the raw message string, not an { answer } object.
      const transitionId = resolveTransitionId(prompt);
      if (!transitionId) return await pickTransition(prompt, ask, out);
      const label = (prompt.widget?.options?.label as string | undefined) ?? 'message';
      const answer = (await ask(`${pc.bold(`${label} >`)} `)).trim();
      if (!answer) return undefined;
      return { transitionId, payload: answer };
    }

    if (widget === 'form') {
      const actions = ((prompt.widget?.options?.actions as FormAction[] | undefined) ?? []).filter(
        (action) => action.transition && availableTransitionIds(prompt).includes(action.transition),
      );
      if (actions.length === 0) return await pickTransition(prompt, ask, out);

      const markdown = typeof content.markdown === 'string' ? content.markdown : undefined;
      const title = (prompt.widget?.options?.title as string | undefined) ?? prompt.document?.documentName;
      out.write(`\n${markdown ?? pc.bold(title ?? 'Form')}\n`);

      const properties = formProperties(prompt);
      const hasFields = Object.keys(properties).length > 0;

      if (hasFields) {
        // Field forms: Studio is the primary renderer — hand off when a
        // Studio link is known, otherwise fall back to $EDITOR.
        if (!options.useEditor && options.studioUrl) {
          out.write(`${pc.dim('⧉ answer in Studio:')} ${options.studioUrl}\n`);
          out.write(pc.dim('waiting for the answer — Ctrl+C to detach, or rerun with --editor to answer here\n'));
          return 'handoff';
        }
        describeFormFields(prompt.widget?.schema).forEach((line) => out.write(pc.dim(`${line}\n`)));
        out.write(pc.dim('opening $EDITOR — save to submit, empty the file to cancel\n'));
        const payload = editPayloadInEditor(buildFormSkeleton(prompt.document?.content, prompt.widget?.schema), out);
        if (payload === undefined) return undefined;
        const action = await pickFormAction(actions, ask, out);
        if (!action) return undefined;
        return { transitionId: action.transition!, payload };
      }

      const action = await pickFormAction(actions, ask, out);
      if (!action) return undefined;
      return { transitionId: action.transition!, payload: {} };
    }

    return await pickTransition(prompt, ask, out);
  } finally {
    rl.close();
  }
}

/** Action buttons of a form — always confirmed explicitly (an approval is consent). */
async function pickFormAction(
  actions: FormAction[],
  ask: (query: string) => Promise<string>,
  out: NodeJS.WritableStream,
): Promise<FormAction | undefined> {
  actions.forEach((action, index) =>
    out.write(`  ${pc.bold(String(index + 1))}. ${action.label ?? action.transition}\n`),
  );
  const raw = (await ask(`${pc.bold('action:')} `)).trim();
  return actions[Number(raw) - 1] ?? actions.find((candidate) => candidate.label === raw);
}

/** Fallback when no renderable prompt document exists: pick a transition directly. */
async function pickTransition(
  prompt: ActivePrompt,
  ask: (query: string) => Promise<string>,
  out: NodeJS.WritableStream,
): Promise<PromptAnswer | undefined> {
  const available = availableTransitionIds(prompt);
  if (available.length === 0) return undefined;

  out.write(`\nRun is waiting — available transitions:\n`);
  available.forEach((id, index) => out.write(`  ${pc.bold(String(index + 1))}. ${id}\n`));
  const raw = (await ask(`${pc.bold('transition:')} `)).trim();
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
