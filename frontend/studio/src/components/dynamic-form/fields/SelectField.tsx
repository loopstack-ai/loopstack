import React from 'react';
import { Controller } from 'react-hook-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { useFieldConfig } from '../hooks/useFieldConfig';
import type { FieldProps } from '../types';
import { BaseFieldWrapper } from './BaseFieldWrapper';

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
  /** Label of the entry that unsets an optional field; defaults to `— none —`. */
  clearLabel?: string;
  [key: string]: unknown;
}

interface SelectFieldProps extends FieldProps {
  schema: SelectFieldSchema;
}

/**
 * The value of the "clear" entry.
 *
 * Radix rejects an empty string as an item value, so the entry that unsets the field needs a value of its
 * own, mapped back to `undefined` on the way out. It cannot collide with a real option: a JSON Schema enum
 * holds the values the field may take, and this is not one of them.
 */
const CLEAR_VALUE = '__clear__';

export const SelectField: React.FC<SelectFieldProps> = ({ name, schema, ui, required, form, disabled }) => {
  const config = useFieldConfig(name, schema, ui, disabled);

  // Get enum options - prioritize enumOptions over enum
  const uiConfig = ui as
    | { enumOptions?: (string | EnumOption)[]; placeholder?: string; clearLabel?: string }
    | undefined;
  const rawEnumOptions = uiConfig?.enumOptions ?? schema.enumOptions;
  const enumOptions = rawEnumOptions && rawEnumOptions.length > 0 ? rawEnumOptions : schema.enum || [];

  // Extract labels and values from enum options
  const enumLabels = enumOptions.map((opt: string | number | EnumOption) =>
    typeof opt === 'string' || typeof opt === 'number' ? opt : opt.label,
  );

  const enumValues = enumOptions.map((opt: string | number | EnumOption) =>
    typeof opt === 'string' || typeof opt === 'number' ? opt : opt.value,
  );

  const placeholder = uiConfig?.placeholder || schema.placeholder || `Select ${config.fieldLabel}`;
  // An optional field has to be un-settable, or the first choice made is permanent.
  const clearLabel = uiConfig?.clearLabel || schema.clearLabel || '— none —';

  return (
    <Controller
      name={name}
      control={form.control}
      // Not `?? ''`, as the text fields use: an empty string is a real value for a string field and a type
      // error for an enum, and it reaches the server as one. The Select below is controlled either way —
      // it coerces for display — so an unset field stays `undefined` and is simply omitted on submit.
      defaultValue={config.defaultValue}
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
        >
          <Select
            value={String(field.value ?? '')}
            onValueChange={
              config.isReadOnly ? undefined : (value) => field.onChange(value === CLEAR_VALUE ? undefined : value)
            }
            disabled={config.isDisabled}
            required={required}
          >
            <SelectTrigger id={name} className={config.error ? 'border-destructive' : ''} {...config.getAriaProps()}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {!required && <SelectItem value={CLEAR_VALUE}>{clearLabel}</SelectItem>}
              {enumValues.map((option: string | number, index: number) => (
                <SelectItem key={`${option}-${index}`} value={option.toString()} disabled={config.isDisabled}>
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
