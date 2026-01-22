export function normalizeObject<T extends Record<string, unknown>>(object: T): T {
  return object
    ? (Object.keys(object)
        .sort()
        .reduce(
          (sortedObj, key) => {
            sortedObj[key] = object[key];
            return sortedObj;
          },
          {} as Record<string, unknown>,
        ) as T)
    : ({} as T);
}
