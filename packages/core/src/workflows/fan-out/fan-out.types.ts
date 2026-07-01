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

/**
 * Call-site input for `FanOutWorkflow.run()` — the workflow to fan out, the items
 * (array or keyed record), and the `mode` (`'all'` | `'allSettled'`).
 *
 * @public
 */
export type FanOutInput = z.input<typeof FanOutArgsSchema>;

/**
 * Validated/persisted args for `FanOutWorkflow` (the parsed form of `FanOutInput`).
 *
 * @public
 */
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
 * Zod schema for the aggregated `FanOutWorkflow` result delivered as the `data` field of the
 * `TransitionInput` in a parent's callback.
 *
 * Fields:
 * - `results` — an array of entries (each with a `key`) if items were an array, otherwise a
 *   keyed record of entries; every entry carries a `status`, optional `data`, and optional `error`.
 * - `hasErrors` — true when any child did not complete successfully.
 * - `errorCount` — number of children that did not complete successfully.
 *
 * @public
 */
export const FanOutResultSchema = z.object({
  results: z.union([
    z.array(FanOutResultEntrySchema.extend({ key: z.string() })),
    z.record(z.string(), FanOutResultEntrySchema),
  ]),
  hasErrors: z.boolean(),
  errorCount: z.number(),
});
