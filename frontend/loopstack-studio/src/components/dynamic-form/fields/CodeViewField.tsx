import React from 'react';
import { Controller } from 'react-hook-form';
import { Check, Copy } from 'lucide-react';
import CodeContent from '../CodeContent';
import { useFieldConfig } from '../hooks/useFieldConfig';
import type { FieldProps } from '../types';
import { BaseFieldWrapper } from './BaseFieldWrapper';

export interface CodeFieldSchema {
  title?: string;
  type?: string;
  widget?: 'code-view';
  placeholder?: string;
  examples?: string[];
  help?: string;
  description?: string;
  default?: string;
  readonly?: boolean;
  disabled?: boolean;
}

interface CodeFieldProps extends FieldProps {
  schema: CodeFieldSchema;
}

const stripCodeFence = (text: string): string => {
  const codeFenceRegex = /^```[\w-]*\n?([\s\S]*?)\n?```$/;
  const match = text.match(codeFenceRegex);
  return match ? match[1] : text;
};

export const CodeViewField: React.FC<CodeFieldProps> = ({ name, schema, ui, required, form, disabled }) => {
  const [copied, setCopied] = React.useState(false);
  const config = useFieldConfig(name, schema, ui, disabled);

  const handleCopy = async (text: string) => {
    try {
      const cleanedText = stripCodeFence(text);
      await navigator.clipboard.writeText(cleanedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Controller
      name={name}
      control={form.control}
      defaultValue={config.defaultValue || ''}
      render={({ field }) => (
        <BaseFieldWrapper
          name={name}
          label={config.fieldLabel}
          required={required}
          error={config.error}
          helpText={config.helpText}
          description={config.description}
        >
          <div className="relative w-full overflow-hidden rounded-md border" {...config.getAriaProps()}>
            <button
              type="button"
              onClick={() => handleCopy(field.value || '')}
              disabled={config.isDisabled || !field.value}
              className="bg-background/80 hover:bg-background absolute top-2 right-2 z-10 rounded-md border p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              title={copied ? 'Copied!' : 'Copy to clipboard'}
              aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <CodeContent content={field.value || ''} />
          </div>
        </BaseFieldWrapper>
      )}
    />
  );
};
