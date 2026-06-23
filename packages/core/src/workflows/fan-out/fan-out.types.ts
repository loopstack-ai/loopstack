import { z } from 'zod';

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

const FanOutInputObject = z.object({
  items: z.union([z.array(FanOutItemSchema), z.record(z.string(), FanOutItemSchema)]),
  mode: z.enum(['all', 'allSettled']).optional(),
});

/**
 * Validates the friendly `Input` shape and transforms it into the normalized `Args` shape
 * (ordered `entries` tuples + `itemsWereArray` flag). Persisted shape is the post-transform form.
 */
export const FanOutArgsSchema = FanOutInputObject.transform((input) => {
  const itemsWereArray = Array.isArray(input.items);
  const rawEntries: Array<[string, FanOutItem]> = itemsWereArray
    ? (input.items as FanOutItem[]).map((item, index) => [item.label ?? String(index), item])
    : Object.entries(input.items as Record<string, FanOutItem>);

  const seen = new Set<string>();
  const entries: Array<[string, FanOutItem]> = rawEntries.map(([key, item]) => {
    if (seen.has(key)) {
      throw new Error(`FanOut item key "${key}" is duplicated. Keys must be unique.`);
    }
    seen.add(key);
    return [key, item];
  });

  return {
    entries,
    itemsWereArray,
    mode: (input.mode ?? 'all') as FanOutMode,
  };
});

export type FanOutInput = z.input<typeof FanOutArgsSchema>;
export type FanOutArgs = z.output<typeof FanOutArgsSchema>;

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
 * Schema for the `data` field of the `TransitionInput` delivered to a parent's callback
 * after `FanOutWorkflow` settles.
 *
 * ```ts
 * @Transition({ from: 'awaiting', to: 'end', wait: true, schema: FanOutResultSchema })
 * async onAllDone(state, input: TransitionInput<FanOutResult>) { input.data.results }
 * ```
 */
export const FanOutResultSchema = z.object({
  results: z.union([
    z.array(FanOutResultEntrySchema.extend({ key: z.string() })),
    z.record(z.string(), FanOutResultEntrySchema),
  ]),
  hasErrors: z.boolean(),
  errorCount: z.number(),
});
