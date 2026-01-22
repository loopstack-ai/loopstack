import React from 'react';
import { Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label.tsx';
import { Checkbox } from '../../ui/checkbox';
import { useFieldConfig } from '../hooks/useFieldConfig';
import type { FieldProps } from '../types';
import { BaseFieldWrapper } from './BaseFieldWrapper';

export interface CheckboxFieldSchema {
  title?: string;
  help?: string;
  description?: string;
  disabled?: boolean;
  readonly?: boolean;
  default?: boolean;
  [key: string]: unknown;
}

interface CheckboxFieldProps extends FieldProps {
  schema: CheckboxFieldSchema;
}

export const CheckboxField: React.FC<CheckboxFieldProps> = ({ name, schema, ui, required, form, disabled }) => {
  const config = useFieldConfig(name, schema, ui, disabled);

  return (
    <Controller
      name={name}
      control={form.control}
      defaultValue={config.defaultValue || false}
      rules={{
        validate: required ? (value) => value === true || 'This field is required' : undefined,
      }}
      render={({ field: { onChange, value, ref } }) => (
        <BaseFieldWrapper
          name={name}
          label={config.fieldLabel}
          required={required}
          error={config.error}
          helpText={config.helpText}
          description={config.description}
        >
          <div className="flex items-center space-x-2">
            <Checkbox
              id={name}
              checked={!!value}
              onCheckedChange={config.isReadOnly ? undefined : (checked) => onChange(checked || false)}
              disabled={config.isDisabled}
              ref={ref}
              name={name}
              required={required}
              {...config.getAriaProps()}
            />
            <Label
              htmlFor={name}
              className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {config.fieldLabel}
            </Label>
          </div>
        </BaseFieldWrapper>
      )}
    />
  );
};
