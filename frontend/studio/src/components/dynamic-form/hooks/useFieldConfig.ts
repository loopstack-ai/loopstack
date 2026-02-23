import { useFormContext } from 'react-hook-form';
import type { FieldProps } from '../types';

interface BaseSchema {
  title?: string;
  help?: string;
  description?: string;
  disabled?: boolean;
  readonly?: boolean;
  default?: unknown;
}

interface UiConfig {
  title?: string;
  help?: string;
  description?: string;
  readonly?: boolean;
  disabled?: boolean;
}

export const useFieldConfig = <T extends BaseSchema>(
  name: string,
  schema: T,
  ui?: FieldProps['ui'],
  disabled?: boolean,
) => {
  const form = useFormContext();
  const error = form?.formState.errors[name];
  const typedUi = ui as UiConfig | undefined;

  return {
    fieldLabel: typedUi?.title ?? schema.title ?? name,
    helpText: typedUi?.help ?? schema.help,
    description: typedUi?.description ?? schema.description,
    isReadOnly: typedUi?.readonly ?? schema.readonly,
    isDisabled: typedUi?.disabled ?? schema.disabled ?? disabled,
    defaultValue: schema.default,
    error,
    getAriaProps: () => ({
      'aria-describedby': (typedUi?.description ?? schema.description) ? `${name}-description` : undefined,
      'aria-invalid': !!error,
    }),
  };
};
