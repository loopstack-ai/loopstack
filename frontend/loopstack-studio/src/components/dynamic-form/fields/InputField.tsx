import React from 'react';
import { Controller } from 'react-hook-form';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { BaseFieldWrapper } from './BaseFieldWrapper';
import { useFieldConfig } from '../hooks/useFieldConfig';
import type { FieldProps } from '../types';
import { buildTextValidationRules } from '@/components/dynamic-form/fields/utils/text-validation-utils.ts';

export const getInputType = (property: InputFieldSchema): React.HTMLInputTypeAttribute => {
  if (property.format) {
    switch (property.format) {
      case 'email':
        return 'email';
      case 'url':
        return 'url';
      case 'date':
        return 'date';
      case 'time':
        return 'time';
      case 'datetime':
        return 'datetime-local';
      case 'phone':
        return 'tel';
    }
  }

  switch (property.type) {
    case 'integer':
    case 'number':
      return 'number';
    case 'string':
    default:
      return 'text';
  }
};

export interface InputFieldSchema {
  title?: string;
  type?: string;
  maxLength?: number;
  minLength?: number;
  placeholder?: string;
  examples?: string[];
  help?: string;
  description?: string;
  disabled?: boolean;
  readonly?: boolean;
  default?: string | number;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  pattern?: string;
  format?: 'email' | 'url' | 'date' | 'time' | 'datetime' | 'phone';
}

interface InputFieldProps extends FieldProps {
  schema: InputFieldSchema;
}

const isNumericType = (schema: InputFieldSchema): boolean => {
  return schema.type === 'number' || schema.type === 'integer';
};

export const InputField: React.FC<InputFieldProps> = ({
                                                        name,
                                                        schema,
                                                        ui,
                                                        required,
                                                        form,
                                                        disabled,
                                                        viewOnly
                                                      }) => {
  const config = useFieldConfig(name, schema, ui, disabled);
  const inputType = getInputType(schema);
  const placeholder = schema.placeholder || schema.examples?.[0]?.toString() || '';
  const validationRules = buildTextValidationRules(schema, required);
  const isNumeric = isNumericType(schema);

  if (viewOnly) {
    return (
      <div className="block mt-4 mb-8">
        <Label className="text-sm text-muted-foreground mb-1 block">
          {config.fieldLabel}
        </Label>
        <Controller
          name={name}
          control={form.control}
          defaultValue={config.defaultValue ?? ''}
          render={({ field }) => (
            <div className="text-sm">{field.value ?? '—'}</div>
          )}
        />
      </div>
    );
  }

  return (
    <Controller
      name={name}
      control={form.control}
      defaultValue={config.defaultValue ?? (isNumeric ? undefined : '')}
      rules={validationRules}
      render={({ field }) => (
        <BaseFieldWrapper
          name={name}
          label={config.fieldLabel}
          required={required}
          error={config.error}
          helpText={config.helpText}
          description={config.description}
        >
          <Input
            {...field}
            id={name}
            onChange={(e) => {
              if (config.isReadOnly) return;

              if (isNumeric) {
                const value = e.target.value;
                field.onChange(value === '' ? undefined : Number(value));
              } else {
                field.onChange(e);
              }
            }}
            value={field.value ?? ''}
            type={inputType}
            placeholder={placeholder}
            disabled={config.isDisabled}
            readOnly={config.isReadOnly}
            min={schema.minimum}
            max={schema.maximum}
            step={inputType === 'number' && schema.multipleOf ? schema.multipleOf : undefined}
            maxLength={schema.maxLength}
            className={config.error ? 'border-destructive focus-visible:ring-destructive' : ''}
            {...config.getAriaProps()}
          />
        </BaseFieldWrapper>
      )}
    />
  );
};