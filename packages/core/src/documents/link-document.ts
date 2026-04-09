import { z } from 'zod';
import { Document } from '@loopstack/common';

export const LinkDocumentSchema = z
  .object({
    status: z.enum(['pending', 'success', 'failure']).optional(),
    label: z.string().optional(),
    workflowId: z.string().optional(),
    embed: z.boolean().optional(),
    expanded: z.boolean().optional(),
  })
  .strict();

export type LinkDocumentContent = z.infer<typeof LinkDocumentSchema>;

@Document({
  schema: LinkDocumentSchema,
  uiConfig: __dirname + '/link-document.yaml',
})
export class LinkDocument {
  status?: 'pending' | 'success' | 'failure';
  label?: string;
  workflowId?: string;
  embed?: boolean;
  expanded?: boolean;
}
