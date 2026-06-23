import { z } from 'zod';
import { Document } from '../decorators/block.decorator.js';

export const LinkDocumentSchema = z
  .object({
    label: z.string().optional(),
    workflowId: z.string().optional(),
    embed: z.boolean().optional(),
    expanded: z.boolean().optional(),
  })
  .strict();

export type LinkDocumentContent = z.infer<typeof LinkDocumentSchema>;

@Document({
  schema: LinkDocumentSchema,
  widget: './link-document.yaml',
})
export class LinkDocument {
  label?: string;
  workflowId?: string;
  embed?: boolean;
  expanded?: boolean;
}
