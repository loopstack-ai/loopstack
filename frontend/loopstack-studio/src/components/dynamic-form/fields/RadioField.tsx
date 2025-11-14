import React from 'react';
import { Controller } from 'react-hook-form';
import { Label } from '../../ui/label';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { cn } from '../../../utils/utils.ts';
import type { FieldProps } from '../types.ts';

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

export const RadioField: React.FC<RadioFieldProps> = ({
  name,
  schema,
  required,
  form,
  disabled
}) => {
  const fieldLabel = schema.title || name;
  const helpText = schema?.help || schema.description || '';
  const isReadOnly = schema?.readonly;
  const isDisabled = schema?.disabled || disabled;

  // Get custom enum options if provided
  const enumOptions = schema?.enumOptions;
  const enumLabels = enumOptions ? enumOptions.map((opt: any) => opt.label) : schema.enum;
  const enumValues = enumOptions ? enumOptions.map((opt: any) => opt.value) : schema.enum;

  const errors = form.formState.errors;
  const hasError = !!errors[name];

  return (
    <Controller
      name={name}
      control={form.control}
      defaultValue={schema.default || ''}
      render={({ field }) => (
        <div className="space-y-2 block my-4 mb-8">
          <Label
            htmlFor={name}
            className={cn(
              'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
              hasError && 'text-destructive',
              required && "after:content-['*'] after:ml-0.5 after:text-destructive"
            )}
          >
            {fieldLabel}
          </Label>
          {helpText && !hasError && <p className="text-sm text-muted-foreground">{helpText}</p>}
          <RadioGroup
            value={field.value}
            onValueChange={isReadOnly ? undefined : field.onChange}
            disabled={isDisabled}
            required={required}
            aria-label={schema.inline ? 'Alignment' : undefined}
            className={cn(schema?.inline && 'flex flex-row space-x-4 space-y-0')}
          >
            {enumValues?.map((option: string, index: number) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={option}
                  id={`${name}-${option}`}
                  disabled={isDisabled}
                  className={cn(hasError && 'border-destructive')}
                />
                <Label
                  htmlFor={`${name}-${option}`}
                  className={cn(
                    'text-sm font-normal cursor-pointer',
                    isDisabled && 'cursor-not-allowed opacity-70'
                  )}
                >
                  {enumLabels?.[index] || option}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {hasError && (
            <p className="text-sm text-destructive">{errors[name]?.message?.toString()}</p>
          )}
        </div>
      )}
    />
  );
};
