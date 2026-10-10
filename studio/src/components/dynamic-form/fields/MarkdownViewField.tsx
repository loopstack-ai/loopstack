import React from 'react';
import { Controller } from 'react-hook-form';
import MarkdownContent from '../MarkdownContent';
import { useFieldConfig } from '../hooks/useFieldConfig';
import type { FieldProps } from '../types';

export interface MarkdownFieldSchema {
  title?: string;
  type?: string;
  widget?: 'markdown-view';
  help?: string;
  description?: string;
  default?: string;
  readonly?: boolean;
  disabled?: boolean;
  [key: string]: unknown;
}

interface MarkdownFieldProps extends FieldProps {
  schema: MarkdownFieldSchema;
}

export const MarkdownViewField: React.FC<MarkdownFieldProps> = ({ name, schema, ui, form, disabled }) => {
  const config = useFieldConfig(name, schema, ui, disabled);

  return (
    <Controller
      name={name}
      control={form.control}
      defaultValue={config.defaultValue || ''}
      render={({ field }) => <MarkdownContent content={String(field.value ?? '')} />}
    />
  );
};
