import { z } from 'zod';
import { Document } from '../decorators/block.decorator.js';

export const MarkdownDocumentSchema = z
  .object({
    markdown: z.string(),
  })
  .strict();

/**
 * Document that renders Markdown content in Studio.
 *
 * @public
 */
@Document({
  schema: MarkdownDocumentSchema,
  widget: './markdown-document.yaml',
})
export class MarkdownDocument {
  markdown: string;
}
