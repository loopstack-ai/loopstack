import { z } from 'zod';
import { CallbackSchema } from '@loopstack/common';

export type FanOutMode = 'all' | 'allSettled';

/** Single fan-out item: canonical workflow name + optional args / label / show. */
export const FanOutItemSchema = z.object({
  /** Canonical workflow name (`@Workflow({ name })` or auto-derived snake_case). */
  workflow: z.string(),
  args: z.record(z.string(), z.unknown()).optional(),
  label: z.string().optional(),
  show: z.enum(['inline', 'link', 'hidden']).optional(),
});

export type FanOutItem = z.infer<typeof FanOutItemSchema>;

/** Author-facing item input — same shape as the persisted item. */
export type FanOutItemInput = FanOutItem;

export interface FanOutInput {
  items: FanOutItemInput[] | Record<string, FanOutItemInput>;
  mode?: FanOutMode;
}

export const FanOutArgsSchema = z.object({
  /** Ordered ([key, item]) entries — the wire form so insertion order is preserved end-to-end. */
  entries: z.array(z.tuple([z.string(), FanOutItemSchema])),
  /** True if the author passed an array (output is an array); false if they passed a record. */
  itemsWereArray: z.boolean(),
  mode: z.enum(['all', 'allSettled']).default('all'),
});

export type FanOutArgs = z.infer<typeof FanOutArgsSchema>;

export const FanOutResultEntrySchema = z.object({
  status: z.enum(['completed', 'failed', 'canceled']),
  data: z.unknown().optional(),
  error: z.string().optional(),
});

export type FanOutResultEntry = z.infer<typeof FanOutResultEntrySchema>;

export interface FanOutResult {
  /** Array if items was an array, record if items was a record. */
  results: Array<FanOutResultEntry & { key: string }> | Record<string, FanOutResultEntry>;
  hasErrors: boolean;
  errorCount: number;
}

/**
 * Use to type the parent's callback transition payload.
 *
 * ```ts
 * @Transition({ from: 'awaiting', to: 'end', wait: true, schema: FanOutCallbackSchema })
 * async onAllDone(state, payload: FanOutCallbackPayload) { ... }
 * ```
 */
export const FanOutCallbackSchema = CallbackSchema.extend({
  data: z.object({
    results: z.union([
      z.array(FanOutResultEntrySchema.extend({ key: z.string() })),
      z.record(z.string(), FanOutResultEntrySchema),
    ]),
    hasErrors: z.boolean(),
    errorCount: z.number(),
  }),
});

export type FanOutCallbackPayload = z.infer<typeof FanOutCallbackSchema>;
