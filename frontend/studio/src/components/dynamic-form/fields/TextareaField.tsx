import React from 'react';
import { Controller } from 'react-hook-form';
import { buildTextValidationRules } from '@/components/dynamic-form/fields/utils/text-validation-utils.ts';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { useFieldConfig } from '../hooks/useFieldConfig';
import type { FieldProps } from '../types';
import { BaseFieldWrapper } from './BaseFieldWrapper';

export interface TextareaFieldSchema {
  title?: string;
  type?: string;
  widget?: string;
  maxLength?: number;
  minLength?: number;
  placeholder?: string;
  examples?: string[];
  help?: string;
  description?: string;
  rows?: number;
  disabled?: boolean;
  readonly?: boolean;
  default?: string;
  pattern?: string;
  [key: string]: unknown;
}

interface TextareaFieldProps extends FieldProps {
  schema: TextareaFieldSchema;
}

export const TextareaField: React.FC<TextareaFieldProps> = ({
  name,
  schema,
  ui,
  required,
  form,
  disabled,
  viewOnly,
}) => {
  const config = useFieldConfig(name, schema, ui, disabled);

  const placeholder = schema.placeholder || schema.examples?.[0] || '';
  const rows = schema.rows || 4;

  const validationRules = buildTextValidationRules(schema, required);

  if (viewOnly) {
    return (
      <div className="mt-4 mb-8 block">
        <Label className="text-muted-foreground mb-1 block text-sm">{config.fieldLabel}</Label>
        <Controller
          name={name}
          control={form.control}
          defaultValue={config.defaultValue || ''}
          render={({ field }) => <div className="text-sm whitespace-pre-wrap">{field.value || '—'}</div>}
        />
      </div>
    );
  }

  return (
    <Controller
      name={name}
      control={form.control}
      defaultValue={config.defaultValue || ''}
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
          <Textarea
            {...field}
            id={name}
            onChange={config.isReadOnly ? undefined : field.onChange}
            rows={rows}
            placeholder={placeholder}
            disabled={config.isDisabled}
            readOnly={config.isReadOnly}
            maxLength={schema.maxLength}
            className={config.error ? 'border-destructive focus-visible:ring-destructive' : ''}
            style={{
              minHeight: rows ? `${rows * 1.5}em` : undefined,
              resize: rows ? 'vertical' : 'none',
            }}
            {...config.getAriaProps()}
          />
        </BaseFieldWrapper>
      )}
    />
  );
};
