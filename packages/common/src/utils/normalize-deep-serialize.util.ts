// create a normalized string representation of an object
// that makes sure nested array and object keys are sorted
// can be used to generate a fingerprint hash of an object
export function normalizeDeepSerializeUtil(obj: any): string {
  if (Array.isArray(obj)) {
    return JSON.stringify(obj.map(normalizeDeepSerializeUtil).sort());
  } else if (typeof obj === 'object' && obj !== null) {
    return JSON.stringify(
      Object.keys(obj)
        .sort()
        .reduce((result: Record<string, any>, key: string) => {
          result[key] = normalizeDeepSerializeUtil(obj[key]); // Recursively sort nested objects
          return result;
        }, {}),
    );
  }
  return obj?.toString();
}
