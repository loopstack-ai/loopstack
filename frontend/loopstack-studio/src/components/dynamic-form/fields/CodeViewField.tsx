import React from 'react';
import { Controller } from 'react-hook-form';
import { Copy, Check } from 'lucide-react';
import { Label } from '../../ui/label';
import type { FieldProps } from '../types.ts';
import CodeContent from '../CodeContent.tsx';

export interface CodeFieldSchema {
  title?: string;
  type?: string;
  widget?: 'code-view';
  placeholder?: string;
  examples?: string[];
  help?: string;
  description?: string;
  default?: string;
}

interface CodeFieldProps extends FieldProps {
  schema: CodeFieldSchema;
}

export const CodeViewField: React.FC<CodeFieldProps> = ({ name, schema, required, form }) => {
  const [copied, setCopied] = React.useState(false);
  const fieldLabel = schema?.title || name;
  const helpText = schema?.help || schema.description || '';

  const fieldState = form.getFieldState(name);
  const hasError = !!fieldState.error;
  const errorMessage = fieldState.error?.message?.toString();

  const stripCodeFence = (text: string): string => {
    // Match triple backticks with optional language identifier at the start
    // and triple backticks at the end
    const codeFenceRegex = /^```[\w-]*\n?([\s\S]*?)\n?```$/;
    const match = text.match(codeFenceRegex);

    if (match) {
      return match[1];
    }

    return text;
  };

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
      defaultValue={schema.default || ''}
      render={({ field }) => (
        <div className="space-y-2 block my-4 mb-8">
          <Label htmlFor={name} className={hasError ? 'text-destructive' : ''}>
            {fieldLabel}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <div className="border rounded-md overflow-hidden w-full relative">
            <button
              type="button"
              onClick={() => handleCopy(field.value || '')}
              className="absolute top-2 right-2 p-2 rounded-md bg-background/80 hover:bg-background border transition-colors z-10"
              title={copied ? 'Copied!' : 'Copy to clipboard'}
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </button>
            <CodeContent content={field.value || ''} />
          </div>
          {(hasError || helpText) && (
            <p className={`text-sm ${hasError ? 'text-destructive' : 'text-muted-foreground'}`}>
              {hasError ? errorMessage : helpText}
            </p>
          )}
        </div>
      )}
    />
  );
};
