import { z } from 'zod';
import { CallbackSchema } from '@loopstack/common';

export type SequenceMode = 'all' | 'allSettled';

/** Single sequence item: canonical workflow name + optional args / label / show. */
export const SequenceItemSchema = z.object({
  /** Canonical workflow name (`@Workflow({ name })` or auto-derived snake_case). */
  workflow: z.string(),
  args: z.record(z.string(), z.unknown()).optional(),
  label: z.string().optional(),
  show: z.enum(['inline', 'link', 'hidden']).optional(),
});

export type SequenceItem = z.infer<typeof SequenceItemSchema>;

/** Author-facing item input — same shape as the persisted item. */
export type SequenceItemInput = SequenceItem;

export interface SequenceInput {
  items: SequenceItemInput[] | Record<string, SequenceItemInput>;
  mode?: SequenceMode;
}

export const SequenceArgsSchema = z.object({
  /** Ordered ([key, item]) entries — wire form preserves order end-to-end. */
  entries: z.array(z.tuple([z.string(), SequenceItemSchema])),
  /** True if author passed an array; false if record. */
  itemsWereArray: z.boolean(),
  mode: z.enum(['all', 'allSettled']).default('all'),
});

export type SequenceArgs = z.infer<typeof SequenceArgsSchema>;

export const SequenceResultEntrySchema = z.object({
  status: z.enum(['completed', 'failed', 'canceled', 'skipped']),
  data: z.unknown().optional(),
  error: z.string().optional(),
});

export type SequenceResultEntry = z.infer<typeof SequenceResultEntrySchema>;

export interface SequenceResult {
  /** Array if items was an array, record if items was a record. */
  results: Array<SequenceResultEntry & { key: string }> | Record<string, SequenceResultEntry>;
  hasErrors: boolean;
  errorCount: number;
}

export const SequenceCallbackSchema = CallbackSchema.extend({
  data: z.object({
    results: z.union([
      z.array(SequenceResultEntrySchema.extend({ key: z.string() })),
      z.record(z.string(), SequenceResultEntrySchema),
    ]),
    hasErrors: z.boolean(),
    errorCount: z.number(),
  }),
});

export type SequenceCallbackPayload = z.infer<typeof SequenceCallbackSchema>;
