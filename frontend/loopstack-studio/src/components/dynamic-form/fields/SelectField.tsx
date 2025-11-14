import React from 'react';
import { Controller } from 'react-hook-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Label } from '../../ui/label';
import type { FieldProps } from '../types.ts';

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
}

interface SelectFieldProps extends FieldProps {
  schema: SelectFieldSchema;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  name,
  schema,
  required,
  form,
  disabled
}) => {
  const fieldLabel = schema.title || name;
  const helpText = schema?.help || schema.description || '';

  const isDisabled = schema?.disabled || disabled;
  const isReadOnly = schema?.readonly;

  console.log(schema);
  // Get custom enum options if provided
  const enumOptions =
    (schema?.enumOptions?.length
      ? (schema?.enumOptions as (string | EnumOption)[])
      : (schema.enum as (string | EnumOption)[])) ?? [];
  const enumLabels = enumOptions
    ? enumOptions.map((opt: string | { label: string; value: string | number }) =>
        typeof opt === 'string' ? opt : opt.label
      )
    : schema.enum ?? [];
  const enumValues = enumOptions
    ? enumOptions.map((opt: string | { label: string; value: string | number }) =>
        typeof opt === 'string' ? opt : opt.value
      )
    : schema.enum ?? [];

  if (schema.title === 'Permission Level') {
    console.log(schema);
  }

  const errors = form.formState.errors;

  return (
    <div className="space-y-2 my-4 mb-8 space">
      <Label
        htmlFor={name}
        className={required ? "after:content-['*'] after:ml-0.5 after:text-red-500" : ''}
      >
        {fieldLabel}
      </Label>
      <Controller
        name={name}
        control={form.control}
        defaultValue={schema.default || ''}
        render={({ field }) => (
          <Select
            value={field.value?.toString() || ''}
            onValueChange={isReadOnly ? undefined : (value) => field.onChange(value)}
            disabled={isDisabled}
          >
            <SelectTrigger className={errors[name] ? 'border-red-500' : ''}>
              <SelectValue placeholder={`Select ${fieldLabel}`} />
            </SelectTrigger>
            <SelectContent>
              {enumValues.map((option: any, index: number) => (
                <SelectItem key={option} value={option.toString()} disabled={isDisabled}>
                  {enumLabels[index] || option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {helpText && !errors[name] && <p className="text-sm text-muted-foreground">{helpText}</p>}
      {errors[name] && <p className="text-sm text-red-500">{errors[name]?.message?.toString()}</p>}
    </div>
  );
};
