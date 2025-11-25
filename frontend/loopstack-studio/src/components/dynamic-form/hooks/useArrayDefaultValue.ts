import { type UiPropertiesType } from '@loopstack/contracts/types';

// Get the default value for a new item in the array
export const useArrayDefaultValue = (items: UiPropertiesType | undefined) => {
  if (!items) {
    return '';
  }

  if (items.type === 'object') {
    const defaultObj: Record<string, any> = {};
    if (items.properties) {
      Object.entries(items.properties).forEach(([key, prop]: [string, any]) => {
        if (prop.default !== undefined) {
          defaultObj[key] = prop.default;
        } else {
          switch (prop.type) {
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

  if (items.type === 'array') {
    return [];
  }

  if (items.default !== undefined) return items.default;

  switch (items.type) {
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
