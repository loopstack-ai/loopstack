export const getInputType = (property: any): string => {
  const type = property.type;

  // Handle specific formats
  if (property.format) {
    switch (property.format) {
      case 'email':
        return 'email';
      case 'date':
      case 'date-time':
        return 'date';
      case 'password':
        return 'password';
      case 'uri':
        return 'url';
      default:
        break;
    }
  }

  // Handle based on type
  switch (type) {
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'checkbox';
    case 'string':
    default:
      return 'text';
  }
};

export const generateValidationRules = (
  property: any,
  propertyName: string,
  requiredFields: string[] = []
) => {
  const rules: Record<string, any> = {};

  if (requiredFields.includes(propertyName)) {
    rules.required = `This field is required`;
  }

  if (property.minLength !== undefined) {
    rules.minLength = {
      value: property.minLength,
      message: `Minimum length is ${property.minLength}`
    };
  }

  if (property.maxLength !== undefined) {
    rules.maxLength = {
      value: property.maxLength,
      message: `Maximum length is ${property.maxLength}`
    };
  }

  if (property.minimum !== undefined) {
    rules.min = {
      value: property.minimum,
      message: `Minimum value is ${property.minimum}`
    };
  }

  if (property.maximum !== undefined) {
    rules.max = {
      value: property.maximum,
      message: `Maximum value is ${property.maximum}`
    };
  }

  if (property.pattern) {
    rules.pattern = {
      value: new RegExp(property.pattern),
      message: `Invalid format`
    };
  }

  return rules;
};
