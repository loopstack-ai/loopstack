import React from 'react';
import { Controller } from 'react-hook-form';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { useFieldConfig } from '../hooks/useFieldConfig';
import type { FieldProps } from '../types';
import { BaseFieldWrapper } from './BaseFieldWrapper';

export interface SwitchFieldSchema {
  title?: string;
  type?: string;
  help?: string;
  description?: string;
  disabled?: boolean;
  readonly?: boolean;
  default?: boolean;
  const?: boolean;
  enum?: boolean[];
  [key: string]: unknown;
}

interface SwitchFieldProps extends FieldProps {
  schema: SwitchFieldSchema;
}

export const SwitchField: React.FC<SwitchFieldProps> = ({ name, schema, ui, required, form, disabled }) => {
  const config = useFieldConfig(name, schema, ui, disabled);

  const validationRules = React.useMemo(() => {
    const rules: {
      validate?: {
        mustBeTrue: (value: boolean) => boolean | string;
      };
    } = {};

    if (schema.const === true) {
      rules.validate = {
        mustBeTrue: (value: boolean) => value === true || 'This field must be accepted',
      };
    }

    if (schema.enum?.length === 1 && schema.enum[0] === true) {
      rules.validate = {
        mustBeTrue: (value: boolean) => value === true || 'This field must be accepted',
      };
    }

    return rules;
  }, [schema.const, schema.enum]);

  return (
    <Controller
      name={name}
      control={form.control}
      defaultValue={config.defaultValue ?? false}
      rules={validationRules}
      render={({ field: { onChange, value, ref, ...fieldProps } }) => (
        <BaseFieldWrapper
          name={name}
          label={config.fieldLabel}
          required={required}
          error={config.error}
          helpText={config.helpText}
          description={config.description}
          showLabel={false}
        >
          <div className="flex items-center space-x-2">
            <Switch
              id={name}
              checked={!!value}
              onCheckedChange={config.isReadOnly ? undefined : onChange}
              disabled={config.isDisabled}
              ref={ref}
              {...fieldProps}
              {...config.getAriaProps()}
            />
            <Label
              htmlFor={name}
              className={`text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                required ? "after:ml-0.5 after:text-red-500 after:content-['*']" : ''
              }`}
            >
              {config.fieldLabel}
            </Label>
          </div>
        </BaseFieldWrapper>
      )}
    />
  );
};
