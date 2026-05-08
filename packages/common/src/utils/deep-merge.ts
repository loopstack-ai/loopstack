/**
 * Deep merges defaults with args. Call-site args win.
 * `undefined` values in args do NOT override defaults.
 * Arrays are replaced (not merged).
 *
 * @param defaults - Default values (lower priority)
 * @param args - Call-site args (higher priority)
 * @returns Merged result
 */
export function deepMergeDefaults(
  defaults: Record<string, unknown>,
  args: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...defaults };

  for (const key of Object.keys(args)) {
    const argValue = args[key];

    // undefined in args does not override defaults
    if (argValue === undefined) continue;

    const defaultValue = result[key];

    // Deep merge plain objects
    if (isPlainObject(argValue) && isPlainObject(defaultValue)) {
      result[key] = deepMergeDefaults(defaultValue as Record<string, unknown>, argValue as Record<string, unknown>);
    } else {
      result[key] = argValue;
    }
  }

  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
