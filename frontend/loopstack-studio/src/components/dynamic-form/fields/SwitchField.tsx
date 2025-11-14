import React from 'react';
import { Controller } from 'react-hook-form';
import { Switch } from '../../ui/switch';
import { Label } from '../../ui/label';
import type { FieldProps } from '../types.ts';

export interface SwitchFieldSchema {
  title?: string;
  type?: string;
  help?: string;
  description?: string;
  disabled?: boolean;
  readonly?: boolean;
  default?: boolean;
}

interface SwitchFieldProps extends FieldProps {
  schema: SwitchFieldSchema;
}

export const SwitchField: React.FC<SwitchFieldProps> = ({
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

  const errors = form.formState.errors;

  return (
    <Controller
      name={name}
      control={form.control}
      defaultValue={schema.default || false}
      render={({ field }) => (
        <div className="my-4 mb-8 block space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id={name}
              {...field}
              checked={field.value || false}
              onCheckedChange={(checked) => (isReadOnly ? undefined : field.onChange(checked))}
              disabled={isDisabled}
              required={required}
            />
            <Label
              htmlFor={name}
              className={
                required ? "after:content-['*'] after:ml-0.5 after:text-red-500" : undefined
              }
            >
              {fieldLabel}
            </Label>
          </div>
          {helpText && !errors[name] && <p className="text-sm text-muted-foreground">{helpText}</p>}
          {errors[name] && (
            <p className="text-sm text-destructive">{errors[name]?.message?.toString()}</p>
          )}
        </div>
      )}
    />
  );
};
