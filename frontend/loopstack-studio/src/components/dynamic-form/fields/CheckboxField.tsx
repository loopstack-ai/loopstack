import React from 'react';
import { Controller } from 'react-hook-form';
import { Checkbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import type { FieldProps } from '../types.ts';

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
  required,
  form,
  disabled
}) => {
  const fieldLabel = schema.title || name;
  const helpText = schema?.help || schema.description || '';
  const isReadOnly = schema?.readonly;
  const isDisabled = schema?.disabled || disabled;

  const errors = form.formState.errors;

  return (
    <Controller
      name={name}
      control={form.control}
      defaultValue={schema.default || false}
      render={({ field: { onChange, value, ref } }) => (
        <div className="space-y-2 block my-4 mb-8">
          <div className="flex items-center space-x-2">
            <Checkbox
              id={name}
              checked={!!value}
              onCheckedChange={isReadOnly ? undefined : onChange}
              disabled={isDisabled}
              ref={ref}
              name={name}
              required={required}
            />
            <Label
              htmlFor={name}
              className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 hover:cursor-pointer ${
                required ? "after:content-['*'] after:ml-0.5 after:text-red-500" : ''
              }`}
            >
              {fieldLabel}
            </Label>
          </div>
          {helpText && !errors[name] && <p className="text-sm text-muted-foreground">{helpText}</p>}
          {errors[name] && (
            <p className="text-sm font-medium text-destructive">
              {errors[name]?.message?.toString()}
            </p>
          )}
        </div>
      )}
    />
  );
};
