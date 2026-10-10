import React from 'react';
import { Controller } from 'react-hook-form';
import { cn } from '@/lib/utils.ts';
import { Label } from '../../ui/label';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { useFieldConfig } from '../hooks/useFieldConfig';
import type { FieldProps } from '../types';
import { BaseFieldWrapper } from './BaseFieldWrapper';

/** One thing to pick. `value` is what the form submits; the rest is what the user reads to decide. */
export interface OptionPickerOption {
  value: string;
  label: string;
  /** What it does, in a line or two. */
  summary?: string;
  /** Its cost and trade-off, drawn smaller. */
  detail?: string;
  /** Marked as the recommendation. The workflow decides which, not the widget. */
  recommended?: boolean;
}

/** The field's value: the options and the pick, in one place. */
export interface OptionPickerValue {
  options: OptionPickerOption[];
  selected?: string;
}

export interface OptionPickerFieldSchema {
  title?: string;
  type?: string;
  widget?: 'option-picker';
  help?: string;
  description?: string;
  readonly?: boolean;
  disabled?: boolean;
  [key: string]: unknown;
}

interface OptionPickerFieldProps extends FieldProps {
  schema: OptionPickerFieldSchema;
}

/**
 * A choice between options the document itself carries, each drawn as its own block.
 *
 * A radio or a select reads its entries from the schema, which is declared once per document class. The
 * options here differ per run — the ways an agent proposes to fix one ticket — so they travel in the field's
 * value together with the pick. Submitting the form returns the same value with `selected` changed, and
 * nothing else has to know how the options got there.
 *
 * Each option is a block, not a line: a label, a summary, and a smaller detail. That is what lets a person
 * choose between them without reading anything else. Empty options render nothing.
 */
export const OptionPickerField: React.FC<OptionPickerFieldProps> = ({ name, schema, ui, required, form, disabled }) => {
  const config = useFieldConfig(name, schema, ui, disabled);

  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field }) => {
        const value = (field.value ?? {}) as Partial<OptionPickerValue>;
        const options = Array.isArray(value.options) ? value.options : [];
        if (!options.length) return <></>;
        const locked = config.isReadOnly || config.isDisabled;
        return (
          <BaseFieldWrapper
            name={name}
            label={config.fieldLabel}
            required={required}
            error={config.error}
            helpText={config.helpText}
            description={config.description}
          >
            <RadioGroup
              value={value.selected ?? ''}
              onValueChange={locked ? undefined : (selected) => field.onChange({ ...value, options, selected })}
              disabled={config.isDisabled}
              aria-label={config.fieldLabel}
              className="gap-2"
              {...config.getAriaProps()}
            >
              {options.map((option) => {
                const id = `${name}-${option.value}`;
                const picked = option.value === value.selected;
                return (
                  <div
                    key={option.value}
                    className={cn(
                      'flex items-start gap-3 rounded-md border p-3',
                      picked ? 'border-primary' : 'border-input',
                      locked && 'opacity-70',
                    )}
                  >
                    <RadioGroupItem value={option.value} id={id} disabled={config.isDisabled} className="mt-0.5" />
                    <Label
                      htmlFor={id}
                      className={cn(
                        'flex flex-col items-start gap-1 font-normal',
                        locked ? 'cursor-not-allowed' : 'cursor-pointer',
                      )}
                    >
                      <span className="text-sm font-medium">
                        {option.value} — {option.label}
                        {option.recommended && (
                          <span className="text-muted-foreground ml-2 text-xs font-normal">recommended</span>
                        )}
                      </span>
                      {option.summary && <span className="text-sm">{option.summary}</span>}
                      {option.detail && <span className="text-muted-foreground text-sm">{option.detail}</span>}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </BaseFieldWrapper>
        );
      }}
    />
  );
};
