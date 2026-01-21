export function normalizeObject(object: Record<string, any>): Record<string, any> {
  return object
    ? Object.keys(object)
        .sort()
        .reduce(
          (sortedObj, key) => {
            sortedObj[key] = object[key];
            return sortedObj;
          },
          {} as Record<string, any>,
        )
    : {};
}
