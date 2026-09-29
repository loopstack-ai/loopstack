/**
 * Field paths of every validation error, so a failed submit can say what to fix.
 *
 * A button that does nothing is indistinguishable from a broken one, and a field error nested in an array is
 * easy to miss — this names the fields so the reason is on screen, not only in the console.
 */
export function describeFormErrors(errors: unknown, path: string[] = []): string {
  const fields: string[] = [];
  const walk = (node: unknown, at: string[]): void => {
    if (!node || typeof node !== 'object') return;
    if ('message' in (node as Record<string, unknown>) && typeof (node as { message?: unknown }).message === 'string') {
      fields.push(at.join('.') || 'the form');
      return;
    }
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) walk(value, [...at, key]);
  };
  walk(errors, path);
  const unique = [...new Set(fields)];
  if (!unique.length) return 'The form could not be submitted — some values are not valid.';
  return `Not submitted — check ${unique.map((f) => `\`${f}\``).join(', ')}.`;
}
