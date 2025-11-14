export const toKebabCase = (str: string): string => {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/-+/g, '-') // Replace multiple consecutive hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
};
