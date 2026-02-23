interface ItemSchema {
  type?: string | string[];
  properties?: Record<string, ItemSchema>;
  default?: unknown;
  [key: string]: unknown;
}

// Helper to get primary type from type field that can be string or string[]
const getPrimaryType = (type: string | string[] | undefined): string | undefined => {
  if (Array.isArray(type)) {
    return type[0];
  }
  return type;
};

// Get the default value for a new item in the array
export const useArrayDefaultValue = (items: ItemSchema | undefined): unknown => {
  if (!items) {
    return '';
  }

  const itemType = getPrimaryType(items.type);

  if (itemType === 'object') {
    const defaultObj: Record<string, unknown> = {};
    if (items.properties) {
      Object.entries(items.properties).forEach(([key, prop]) => {
        if (prop.default !== undefined) {
          defaultObj[key] = prop.default;
        } else {
          const propType = getPrimaryType(prop.type);
          switch (propType) {
            case 'string':
              defaultObj[key] = '';
              break;
            case 'number':
            case 'integer':
              defaultObj[key] = 0;
              break;
            case 'boolean':
              defaultObj[key] = false;
              break;
            case 'array':
              defaultObj[key] = [];
              break;
            case 'object':
              defaultObj[key] = {};
              break;
            default:
              defaultObj[key] = '';
          }
        }
      });
    }
    return defaultObj;
  }

  if (itemType === 'array') {
    return [];
  }

  if (items.default !== undefined) return items.default;

  switch (itemType) {
    case 'string':
      return '';
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return '';
  }
};
