import pc from 'picocolors';
import type { DocumentWidget } from '../types.js';

const MAX_LINES = 40;

/**
 * Fallback for document widgets the CLI has no implementation for: the raw
 * content as pretty JSON under the document label, truncated so one unknown
 * document cannot flood a transcript. Never editable.
 */
export const jsonWidget: DocumentWidget = (content, ctx, out) => {
  const json = JSON.stringify(content, null, 2);
  if (!json || json === '{}') return;

  let lines = json.split('\n');
  let tail = '';
  if (lines.length > MAX_LINES) {
    const hidden = lines.length - MAX_LINES;
    lines = lines.slice(0, MAX_LINES);
    tail = `\n  ${pc.dim(`… (+${hidden} lines — view in Studio)`)}`;
  }
  const body = lines.map((line) => `  ${line}`).join('\n');
  out.block(`${pc.dim(`document: ${ctx.documentName}`)}\n${body}${tail}`);
};
