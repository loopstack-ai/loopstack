export const useSortedPropertyNames = (properties: Record<string, any>, order?: string[]) => {
  let propertyNames = properties ? Object.keys(properties) : [];

  if (order?.length) {
    propertyNames = [
      ...order.filter((name) => propertyNames.includes(name)),
      ...propertyNames.filter((name) => !order.includes(name))
    ];
  }

  return propertyNames;
};
