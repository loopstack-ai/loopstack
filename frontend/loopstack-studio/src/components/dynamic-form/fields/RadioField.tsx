import React from 'react';
import { Controller } from 'react-hook-form';
import { cn } from '@/lib/utils.ts';
import { Label } from '../../ui/label';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { useFieldConfig } from '../hooks/useFieldConfig';
import type { FieldProps } from '../types';
import { BaseFieldWrapper } from './BaseFieldWrapper';

export interface RadioFieldSchema {
  title?: string;
  help?: string;
  description?: string;
  disabled?: boolean;
  readonly?: boolean;
  default?: string;
  enum?: string[];
  enumOptions?: Array<{
    label: string;
    value: string;
  }>;
  inline?: boolean;
}

interface RadioFieldProps extends FieldProps {
  schema: RadioFieldSchema;
}

export const RadioField: React.FC<RadioFieldProps> = ({ name, schema, ui, required, form, disabled }) => {
  const config = useFieldConfig(name, schema, ui, disabled);

  // Get custom enum options if provided
  const enumOptions = schema.enumOptions;
  const enumLabels = enumOptions ? enumOptions.map((opt) => opt.label) : schema.enum;
  const enumValues = enumOptions ? enumOptions.map((opt) => opt.value) : schema.enum;

  return (
    <Controller
      name={name}
      control={form.control}
      defaultValue={config.defaultValue || ''}
      rules={{
        required: required ? 'This field is required' : undefined,
      }}
      render={({ field }) => (
        <BaseFieldWrapper
          name={name}
          label={config.fieldLabel}
          required={required}
          error={config.error}
          helpText={config.helpText}
          description={config.description}
          helpTextPosition="before" // Show help text before the radio group
        >
          <RadioGroup
            value={field.value}
            onValueChange={config.isReadOnly ? undefined : field.onChange}
            disabled={config.isDisabled}
            required={required}
            aria-label={config.fieldLabel}
            className={cn(schema.inline && 'flex flex-row space-y-0 space-x-4')}
            {...config.getAriaProps()}
          >
            {enumValues?.map((option: string, index: number) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={option}
                  id={`${name}-${option}`}
                  disabled={config.isDisabled}
                  className={cn(config.error && 'border-destructive')}
                />
                <Label
                  htmlFor={`${name}-${option}`}
                  className={cn(
                    'cursor-pointer text-sm font-normal',
                    config.isDisabled && 'cursor-not-allowed opacity-70',
                  )}
                >
                  {enumLabels?.[index] || option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </BaseFieldWrapper>
      )}
    />
  );
};
