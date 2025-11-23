import React from 'react';
import { Controller } from 'react-hook-form';
import { Copy, Check } from 'lucide-react';
import { BaseFieldWrapper } from './BaseFieldWrapper';
import { useFieldConfig } from '../hooks/useFieldConfig';
import type { FieldProps } from '../types';
import CodeContent from '../CodeContent';

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

export const CodeViewField: React.FC<CodeFieldProps> = ({
                                                          name,
                                                          schema,
                                                          ui,
                                                          required,
                                                          form,
                                                          disabled
                                                        }) => {
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
          <div
            className="border rounded-md overflow-hidden w-full relative"
            {...config.getAriaProps()}
          >
            <button
              type="button"
              onClick={() => handleCopy(field.value || '')}
              disabled={config.isDisabled || !field.value}
              className="absolute top-2 right-2 p-2 rounded-md bg-background/80 hover:bg-background border transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
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