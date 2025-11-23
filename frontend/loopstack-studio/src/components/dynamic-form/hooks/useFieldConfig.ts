import { useFormContext } from 'react-hook-form';
import type { FieldProps } from '../types';

interface BaseSchema {
  title?: string;
  help?: string;
  description?: string;
  disabled?: boolean;
  readonly?: boolean;
  default?: any;
}

export const useFieldConfig = <T extends BaseSchema>(
  name: string,
  schema: T,
  ui?: FieldProps['ui'],
  disabled?: boolean
) => {
  const form = useFormContext();
  const error = form?.formState.errors[name];

  return {
    fieldLabel: ui?.title || schema.title || name,
    helpText: ui?.help || schema.help, // Added schema.help fallback
    description: ui?.description || schema.description,
    isReadOnly: ui?.readonly || schema.readonly, // Added schema.readonly fallback
    isDisabled: ui?.disabled || schema.disabled || disabled,
    defaultValue: schema.default,
    error,
    getAriaProps: () => ({
      'aria-describedby': ui?.description || schema.description ? `${name}-description` : undefined,
      'aria-invalid': !!error,
    }),
  };
};