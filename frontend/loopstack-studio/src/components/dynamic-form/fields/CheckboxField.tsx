import React from 'react';
import { Controller } from 'react-hook-form';
import { Checkbox } from '../../ui/checkbox';
import { BaseFieldWrapper } from './BaseFieldWrapper';
import { useFieldConfig } from '../hooks/useFieldConfig';
import type { FieldProps } from '../types';
import { Label } from '@/components/ui/label.tsx';

export interface CheckboxFieldSchema {
  title?: string;
  help?: string;
  description?: string;
  disabled?: boolean;
  readonly?: boolean;
  default?: boolean;
}

interface CheckboxFieldProps extends FieldProps {
  schema: CheckboxFieldSchema;
}

export const CheckboxField: React.FC<CheckboxFieldProps> = ({
                                                              name,
                                                              schema,
                                                              ui,
                                                              required,
                                                              form,
                                                              disabled
                                                            }) => {
  const config = useFieldConfig(name, schema, ui, disabled);

  return (
    <Controller
      name={name}
      control={form.control}
      defaultValue={config.defaultValue || false}
      rules={{
        validate: required ? (value) => value === true || 'This field is required' : undefined
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
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {config.fieldLabel}
            </Label>
          </div>
        </BaseFieldWrapper>
      )}
    />
  );
};