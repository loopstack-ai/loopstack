import pc from 'picocolors';
import type { DocumentWidget } from '../types.js';

/**
 * Text-bearing message documents (`message`, `plain`): role-labeled when a
 * role is present, otherwise labeled by document name with content indented.
 */
export const messageWidget: DocumentWidget = (content, ctx, out) => {
  const text =
    typeof content.text === 'string'
      ? content.text
      : typeof content.markdown === 'string'
        ? content.markdown
        : undefined;
  if (!text?.trim()) return;

  if (typeof content.role === 'string') {
    out.block(`${pc.dim(`${content.role}:`)}\n${text}`);
  } else {
    out.block(`${pc.dim(`document: ${ctx.documentName}`)}\n${indent(text)}`);
  }
};

/** Markdown documents: document-name label, markdown source indented below. */
export const markdownWidget: DocumentWidget = (content, ctx, out) => {
  const markdown = typeof content.markdown === 'string' ? content.markdown : undefined;
  if (!markdown?.trim()) return;
  out.block(`${pc.dim(`document: ${ctx.documentName}`)}\n${indent(markdown)}`);
};

/** Error documents: the error text in red under the document label. */
export const errorWidget: DocumentWidget = (content, ctx, out) => {
  const error = typeof content.error === 'string' ? content.error : undefined;
  if (!error?.trim()) return;
  out.block(`${pc.dim(`document: ${ctx.documentName}`)}\n${indent(pc.red(error))}`);
};

function indent(text: string): string {
  return text
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}
