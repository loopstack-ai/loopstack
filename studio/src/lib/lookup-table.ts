/** A key-to-value table to read with `table[key]` or `key in table`. */
export type LookupTable<T> = Readonly<Partial<Record<string, T>>>;

/**
 * Builds a lookup table from one or more records; a later record overrides an earlier one. The table has no
 * prototype, so a key such as `constructor` finds nothing.
 *
 * Component registries use it rather than a Map: a component read from it by key is static, which the React
 * Compiler can verify, while one returned by `Map.get()` counts as created during render.
 */
export function lookupTable<T>(...records: Readonly<Record<string, T>>[]): LookupTable<T> {
  return Object.assign(Object.create(null) as Record<string, T>, ...records);
}
