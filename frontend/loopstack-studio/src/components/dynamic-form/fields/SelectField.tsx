import React from 'react';
import { Controller } from 'react-hook-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { BaseFieldWrapper } from './BaseFieldWrapper';
import { useFieldConfig } from '../hooks/useFieldConfig';
import type { FieldProps } from '../types';

interface EnumOption {
  label: string;
  value: string | number;
}

export interface SelectFieldSchema {
  title?: string;
  help?: string;
  description?: string;
  disabled?: boolean;
  readonly?: boolean;
  default?: string | number;
  enum?: (string | number)[];
  enumOptions?: (string | EnumOption)[];
  placeholder?: string;
}

interface SelectFieldProps extends FieldProps {
  schema: SelectFieldSchema;
}

export const SelectField: React.FC<SelectFieldProps> = ({
                                                          name,
                                                          schema,
                                                          ui,
                                                          required,
                                                          form,
                                                          disabled
                                                        }) => {
  const config = useFieldConfig(name, schema, ui, disabled);

  // Get enum options - prioritize enumOptions over enum
  const enumOptions =
    schema.enumOptions && schema.enumOptions.length > 0
      ? schema.enumOptions
      : schema.enum || [];

  // Extract labels and values from enum options
  const enumLabels = enumOptions.map((opt: string | number | EnumOption) =>
    typeof opt === 'string' || typeof opt === 'number' ? opt : opt.label
  );

  const enumValues = enumOptions.map((opt: string | number | EnumOption) =>
    typeof opt === 'string' || typeof opt === 'number' ? opt : opt.value
  );

  const placeholder = schema.placeholder || `Select ${config.fieldLabel}`;

  return (
    <Controller
      name={name}
      control={form.control}
      defaultValue={config.defaultValue || ''}
      rules={{
        required: required ? 'This field is required' : undefined
      }}
      render={({ field }) => (
        <BaseFieldWrapper
          name={name}
          label={config.fieldLabel}
          required={required}
          error={config.error}
          helpText={config.helpText}
          description={config.description}
        >
          <Select
            value={field.value?.toString() || ''}
            onValueChange={config.isReadOnly ? undefined : (value) => field.onChange(value)}
            disabled={config.isDisabled}
            required={required}
          >
            <SelectTrigger
              id={name}
              className={config.error ? 'border-destructive' : ''}
              {...config.getAriaProps()}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {enumValues.map((option: string | number, index: number) => (
                <SelectItem
                  key={`${option}-${index}`}
                  value={option.toString()}
                  disabled={config.isDisabled}
                >
                  {enumLabels[index]?.toString() || option.toString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </BaseFieldWrapper>
      )}
    />
  );
};