import { z } from 'zod';
import { Document } from '../decorators/block.decorator.js';

export const TerminalDocumentSchema = z
  .object({
    text: z.string(),
    title: z.string().optional(),
  })
  .strict();

/**
 * Document that renders raw terminal output in Studio — a monospaced, dark terminal card that interprets
 * ANSI color escape codes (so NestJS logs, npm/tsx output, git, etc. keep their colors instead of showing
 * raw `\x1b[..m` noise). `text` is the raw stream (ANSI intact); `title` is an optional header.
 *
 * @public
 */
@Document({
  schema: TerminalDocumentSchema,
  widget: './terminal-document.yaml',
  tags: ['ui-terminal'],
})
export class TerminalDocument {
  text: string;
  title?: string;
}
