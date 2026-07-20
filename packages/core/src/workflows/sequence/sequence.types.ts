import { z } from 'zod';

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

const SequenceInputObject = z.object({
  items: z.union([z.array(SequenceItemSchema), z.record(z.string(), SequenceItemSchema)]),
  mode: z.enum(['all', 'allSettled']).optional(),
});

/**
 * Validates the friendly `Input` shape and transforms it into the normalized `Args` shape
 * (ordered `entries` tuples + `itemsWereArray` flag). Persisted shape is the post-transform form.
 */
export const SequenceArgsSchema = SequenceInputObject.transform((input) => {
  const itemsWereArray = Array.isArray(input.items);
  const rawEntries: Array<[string, SequenceItem]> = itemsWereArray
    ? (input.items as SequenceItem[]).map((item, index) => [item.label ?? String(index), item])
    : Object.entries(input.items as Record<string, SequenceItem>);

  const seen = new Set<string>();
  const entries: Array<[string, SequenceItem]> = rawEntries.map(([key, item]) => {
    if (seen.has(key)) {
      throw new Error(`Sequence item key "${key}" is duplicated. Keys must be unique.`);
    }
    seen.add(key);
    return [key, item];
  });

  return {
    entries,
    itemsWereArray,
    mode: (input.mode ?? 'all') as SequenceMode,
  };
});

/**
 * Call-site input for `SequenceWorkflow.run()` — the workflow to run, the items
 * (array or keyed record), and the `mode` (`'all'` | `'allSettled'`).
 *
 * @public
 */
export type SequenceInput = z.input<typeof SequenceArgsSchema>;

/**
 * Validated/persisted args for `SequenceWorkflow` (the parsed form of `SequenceInput`).
 *
 * @public
 */
export type SequenceArgs = z.output<typeof SequenceArgsSchema>;

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

/**
 * Zod schema for the aggregated `SequenceWorkflow` result delivered as the `data` field of the
 * `TransitionInput` in a parent's callback.
 *
 * Fields:
 * - `results` — an array of entries (each with a `key`) if items were an array, otherwise a
 *   keyed record of entries; every entry carries a `status`, optional `data`, and optional `error`.
 * - `hasErrors` — true when any item did not complete successfully.
 * - `errorCount` — number of items that did not complete successfully.
 *
 * @public
 */
export const SequenceResultSchema = z.object({
  results: z.union([
    z.array(SequenceResultEntrySchema.extend({ key: z.string() })),
    z.record(z.string(), SequenceResultEntrySchema),
  ]),
  hasErrors: z.boolean(),
  errorCount: z.number(),
});
