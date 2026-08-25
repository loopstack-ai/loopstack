import pc from 'picocolors';
import type { DocumentWidget } from '../types.js';

/**
 * `secret-input` documents (`{ variables: [{ key }] }`): the request never
 * contains values, so the transcript shows only the requested key names.
 * Value entry lives in the collect side of the widget.
 */
export const secretRequestWidget: DocumentWidget = (content, ctx, out) => {
  const variables = Array.isArray(content.variables) ? (content.variables as { key?: unknown }[]) : [];
  const keys = variables.map((variable) => variable.key).filter((key): key is string => typeof key === 'string');
  if (keys.length === 0) return;
  out.block(`${pc.dim(`document: ${ctx.documentName}`)}\n  requested secrets: ${keys.join(', ')}`);
};
