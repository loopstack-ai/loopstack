import type { JSONSchemaConfigType } from '@loopstack/shared';

// Get the default value for a new item in the array
export const useArrayDefaultValue = (schema: JSONSchemaConfigType) => {
  if (schema.items.type === 'object') {
    const defaultObj: Record<string, any> = {};
    if (schema.items.properties) {
      Object.entries(schema.items.properties).forEach(([key, prop]: [string, any]) => {
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

  if (schema.items.type === 'array') {
    return [];
  }

  if (schema.items.default !== undefined) return schema.items.default;

  switch (schema.items.type) {
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
