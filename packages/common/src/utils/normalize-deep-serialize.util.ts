// create a normalized string representation of an object
// that makes sure nested array and object keys are sorted
// can be used to generate a fingerprint hash of an object
export function normalizeDeepSerializeUtil(obj: unknown): string {
  if (Array.isArray(obj)) {
    return JSON.stringify(obj.map(normalizeDeepSerializeUtil).sort());
  } else if (typeof obj === 'object' && obj !== null) {
    const record = obj as Record<string, unknown>;
    return JSON.stringify(
      Object.keys(record)
        .sort()
        .reduce((result: Record<string, string>, key: string) => {
          result[key] = normalizeDeepSerializeUtil(record[key]); // Recursively sort nested objects
          return result;
        }, {}),
    );
  }
  return String(obj);
}
