import pc from 'picocolors';
import { resolveFieldWidget } from '../field/field-widgets.js';
import type { DocumentWidget } from '../types.js';

interface PropertyConfig {
  widget?: string;
  title?: string;
}

interface SchemaProperty {
  title?: string;
}

/**
 * Studio's field order: schema property order, keys listed in
 * `options.order` pulled to the front, content-only keys appended.
 */
function fieldOrder(
  content: Record<string, unknown>,
  schemaProperties: string[],
  order: string[] | undefined,
): string[] {
  const keys =
    schemaProperties.length > 0
      ? [...schemaProperties, ...Object.keys(content).filter((key) => !schemaProperties.includes(key))]
      : Object.keys(content);
  if (!order?.length) return keys;
  return [...order.filter((key) => keys.includes(key)), ...keys.filter((key) => !order.includes(key))];
}

/**
 * Form documents render their content as key/value lines under a
 * `document: <name>` header, each top-level field dispatched to its field
 * widget — ordered and labeled like Studio (schema property order plus
 * `options.order`, schema `title` as the field label). Actionable forms
 * additionally point at Studio; the interactive answering happens in the
 * HITL layer, not here.
 */
export const formWidget: DocumentWidget = (content, ctx, out) => {
  const properties = (ctx.options?.properties ?? {}) as Record<string, PropertyConfig | undefined>;
  const schemaProperties = ((ctx.schema?.properties ?? {}) as Record<string, SchemaProperty | undefined>) || {};
  const order = Array.isArray(ctx.options?.order) ? (ctx.options.order as string[]) : undefined;

  const body = fieldOrder(content, Object.keys(schemaProperties), order)
    .flatMap((key) => {
      const value = content[key];
      if (value == null) return [];
      // Studio's label resolution: widget config title wins over schema title.
      const label = properties[key]?.title ?? schemaProperties[key]?.title ?? key;
      return resolveFieldWidget(properties[key]?.widget)(label, value);
    })
    .map((line) => `  ${line}`)
    .join('\n');

  const actions = ctx.options?.actions;
  const hasActions = Array.isArray(actions) && actions.length > 0;
  if (!body.trim() && !hasActions) return;

  out.block(`${pc.dim(`document: ${ctx.documentName}`)}${body.trim() ? `\n${body}` : ''}`);
  if (hasActions) {
    out.line(pc.dim(`  ⧉ answer in Studio: ${ctx.studioUrl?.(ctx.workflowId) ?? ctx.workflowId}`));
  }
};
