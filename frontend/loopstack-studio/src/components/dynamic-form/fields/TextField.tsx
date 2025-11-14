import React from 'react';
import { Controller } from 'react-hook-form';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';
import { getInputType } from '../dynamicFormUtils.ts';
import type { FieldProps } from '../types.ts';

export interface TextFieldSchema {
  title?: string;
  type?: string;
  widget?: 'textarea' | 'textarea-expand' | string;
  maxLength?: number;
  placeholder?: string;
  examples?: string[];
  help?: string;
  description?: string;
  rows?: number;
  disabled?: boolean;
  readonly?: boolean;
  default?: string;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
}

interface TextFieldProps extends FieldProps {
  schema: TextFieldSchema;
}

export const TextField: React.FC<TextFieldProps> = ({
  name,
  schema,
  required,
  form,
  disabled,
  viewOnly
}) => {
  const fieldLabel = schema?.title || schema.title || name;
  const inputType = getInputType(schema);

  const isMultiline =
    schema?.widget === 'textarea' ||
    schema?.widget === 'textarea-expand' ||
    (schema.type === 'string' && schema.maxLength && schema.maxLength > 100);

  const isExpandableTextarea = schema?.widget === 'textarea-expand';

  const placeholder = schema?.placeholder || schema.examples?.[0] || '';

  const helpText = schema?.help || schema.description || '';

  const rows = schema?.rows || 4;

  const isDisabled = schema?.disabled || disabled;
  const isReadOnly = schema?.readonly;

  const fieldState = form.getFieldState(name);
  const hasError = !!fieldState.error;
  const errorMessage = fieldState.error?.message?.toString();

  return (
    <Controller
      name={name}
      control={form.control}
      defaultValue={schema.default || ''}
      render={({ field }) =>
        viewOnly ? (
          <div className="block my-4 mb-8">
            <Label className="text-sm text-muted-foreground mb-1 block">{fieldLabel}</Label>
            <div className="text-sm">{field.value}</div>
          </div>
        ) : (
          <div className="space-y-2 block my-4 mb-8">
            <Label htmlFor={name} className={hasError ? 'text-destructive' : ''}>
              {fieldLabel}
              {required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {isMultiline ? (
              <Textarea
                {...field}
                id={name}
                onChange={isReadOnly ? undefined : field.onChange}
                rows={isExpandableTextarea ? undefined : rows}
                placeholder={placeholder}
                disabled={isDisabled}
                readOnly={isReadOnly}
                className={hasError ? 'border-destructive focus-visible:ring-destructive' : ''}
                style={{
                  minHeight: isExpandableTextarea ? `${rows * 1.5}em` : undefined,
                  resize: isExpandableTextarea ? 'vertical' : 'none'
                }}
              />
            ) : (
              <Input
                {...field}
                id={name}
                onChange={isReadOnly ? undefined : field.onChange}
                type={inputType}
                placeholder={placeholder}
                disabled={isDisabled}
                readOnly={isReadOnly}
                min={schema.minimum}
                max={schema.maximum}
                step={inputType === 'number' && schema.multipleOf ? schema.multipleOf : undefined}
                className={hasError ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
            )}
            {(hasError || helpText) && (
              <p className={`text-sm ${hasError ? 'text-destructive' : 'text-muted-foreground'}`}>
                {hasError ? errorMessage : helpText}
              </p>
            )}
          </div>
        )
      }
    />
  );
};
