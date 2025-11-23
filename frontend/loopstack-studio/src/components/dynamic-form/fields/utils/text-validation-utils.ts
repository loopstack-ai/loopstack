import type { RegisterOptions } from 'react-hook-form';

interface ValidationSchema {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  format?: 'email' | 'url' | 'date' | 'time' | 'datetime' | 'phone';
  multipleOf?: number;
}

export const buildTextValidationRules = (
  schema: ValidationSchema,
  required?: boolean
): RegisterOptions => {
  const rules: RegisterOptions = {};

  if (required) {
    rules.required = 'This field is required';
  }

  if (schema.minLength !== undefined) {
    rules.minLength = {
      value: schema.minLength,
      message: `Minimum length is ${schema.minLength} characters`
    };
  }

  if (schema.maxLength !== undefined) {
    rules.maxLength = {
      value: schema.maxLength,
      message: `Maximum length is ${schema.maxLength} characters`
    };
  }

  const minValue = schema.min ?? schema.minimum;
  if (minValue !== undefined) {
    rules.min = {
      value: minValue,
      message: `Minimum value is ${minValue}`
    };
  }

  const maxValue = schema.max ?? schema.maximum;
  if (maxValue !== undefined) {
    rules.max = {
      value: maxValue,
      message: `Maximum value is ${maxValue}`
    };
  }

  if (schema.pattern) {
    rules.pattern = {
      value: new RegExp(schema.pattern),
      message: 'Invalid format'
    };
  }

  if (schema.format === 'email') {
    rules.pattern = {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Invalid email address'
    };
  }

  if (schema.format === 'url') {
    rules.pattern = {
      value: /^https?:\/\/.+/,
      message: 'Invalid URL'
    };
  }

  if (schema.format === 'phone') {
    rules.pattern = {
      value: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
      message: 'Invalid phone number'
    };
  }

  if (schema.multipleOf !== undefined) {
    rules.validate = {
      multipleOf: (value: number) =>
        value % schema.multipleOf! === 0 ||
        `Value must be a multiple of ${schema.multipleOf}`
    };
  }

  return rules;
};