import pc from 'picocolors';
import { buildFormSkeleton, editPayloadInEditor } from '../editor.js';
import type { CollectWidget } from '../types.js';

interface FormAction {
  transition?: string;
  label?: string;
}

/**
 * Discards `$EDITOR` changes to read-only fields (widget config wins over
 * schema, per field — Studio's `useFieldConfig` rule). The backend rejects
 * such changes anyway; reverting locally saves the user the 400 round-trip.
 */
export function revertReadOnlyChanges(
  edited: Record<string, unknown>,
  original: Record<string, unknown>,
  options: Record<string, unknown> | undefined,
  schema: Record<string, unknown> | undefined,
): { payload: Record<string, unknown>; reverted: string[] } {
  const uiProperties = (options?.properties ?? {}) as Record<string, { readonly?: unknown } | undefined>;
  const schemaProperties = ((schema?.properties ?? {}) as Record<string, { readonly?: unknown } | undefined>) || {};
  const keys = new Set([...Object.keys(uiProperties), ...Object.keys(schemaProperties)]);

  const payload = { ...edited };
  const reverted: string[] = [];
  for (const key of keys) {
    if ((uiProperties[key]?.readonly ?? schemaProperties[key]?.readonly) !== true) continue;
    if (deepEqual(payload[key], original[key])) continue;
    if (key in original) payload[key] = original[key];
    else delete payload[key];
    reverted.push(key);
  }
  return { payload, reverted };
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  if (typeof a === 'object') {
    const aRecord = a as Record<string, unknown>;
    const bRecord = b as Record<string, unknown>;
    const aKeys = Object.keys(aRecord);
    if (aKeys.length !== Object.keys(bRecord).length) return false;
    return aKeys.every((key) => deepEqual(aRecord[key], bRecord[key]));
  }
  return false;
}

/**
 * `form`: picker-first, Studio-equivalent — an action submits the form's
 * current content; `e` optionally edits the complete content JSON in
 * `$EDITOR` first (every field, no distinction).
 */
export const collectForm: CollectWidget = async (ctx, io) => {
  const actions = ((ctx.options?.actions as FormAction[] | undefined) ?? []).filter(
    (action) => action.transition && ctx.availableTransitions.includes(action.transition),
  );
  if (actions.length === 0) return undefined;

  const markdown = typeof ctx.content.markdown === 'string' ? ctx.content.markdown : undefined;
  const title = (ctx.options?.title as string | undefined) ?? ctx.documentName;
  io.out.write(`\n${markdown ?? pc.bold(title ?? 'Form')}\n`);

  let payload = buildFormSkeleton(ctx.content, ctx.schema);
  while (true) {
    actions.forEach((action, index) =>
      io.out.write(`  ${pc.bold(String(index + 1))}. ${action.label ?? action.transition}\n`),
    );
    io.out.write(pc.dim('  e. edit in $EDITOR\n'));
    const raw = (await io.ask(`${pc.bold('action:')} `)).trim();
    if (raw === 'e') {
      const edited = editPayloadInEditor(payload, io.out);
      if (edited !== undefined && typeof edited === 'object') {
        const { payload: next, reverted } = revertReadOnlyChanges(
          edited as Record<string, unknown>,
          ctx.content,
          ctx.options,
          ctx.schema,
        );
        for (const key of reverted) {
          io.out.write(pc.yellow(`field "${key}" is read-only — change discarded\n`));
        }
        payload = next;
      }
      continue;
    }
    const action = actions[Number(raw) - 1] ?? actions.find((candidate) => candidate.label === raw);
    if (!action) return undefined;
    return { transitionId: action.transition!, payload };
  }
};
