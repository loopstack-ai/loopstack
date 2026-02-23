// join parent key and current name, because we add a new dimension
// set parent key to null if there is no current name (root element)
export const useMergeParentKey = (parentKey: string | null, name: string | null) => {
  const parentKeyPrep = null !== parentKey ? `${parentKey}.` : '';
  return null !== name ? parentKeyPrep + name : null;
};
