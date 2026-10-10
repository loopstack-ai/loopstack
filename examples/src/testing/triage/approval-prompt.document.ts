import { z } from 'zod';
import { Document } from '@loopstack/common';

export const ApprovalPromptSchema = z
  .object({
    question: z.string(),
    severity: z.enum(['high', 'normal']),
    answer: z.string().optional(),
  })
  .strict();

export type ApprovalPromptType = z.infer<typeof ApprovalPromptSchema>;

/**
 * The human touchpoint of the triage flow: a yes/no approval prompt shown while the
 * workflow waits. The inline `confirm-prompt` widget binds the "Yes"/"No" answer to the
 * `approve` wait transition — the same widget the CLI and Studio render, so a test can
 * assert `parkView()` (widget, question, default transition) exactly as a user would see it.
 */
@Document({
  schema: ApprovalPromptSchema,
  widget: { widget: 'confirm-prompt', options: { transition: 'approve' } },
})
export class ApprovalPromptDocument {
  question: string;
  severity: 'high' | 'normal';
  answer?: string;
}
