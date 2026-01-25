import React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type {
  DocumentItemInterface,
  JSONSchemaConfigType,
  MimeType,
  UiFormType,
  WorkflowInterface,
} from '@loopstack/contracts/types';

// Local type definitions to avoid `any` from @loopstack/contracts/types
// Base schema properties that all field schemas share
export interface BaseSchemaProperties {
  type?: string | string[];
  title?: string;
  description?: string;
  help?: string;
  default?: unknown;
  properties?: Record<string, SchemaProperties>;
  items?: SchemaProperties;
  required?: string[];
  enum?: unknown[];
  enumOptions?: unknown[];
  hidden?: boolean;
  readonly?: boolean;
  disabled?: boolean;
  widget?: string;
  collapsed?: boolean;
  order?: string[];
}

// SchemaProperties with index signature for dynamic access
export interface SchemaProperties extends BaseSchemaProperties {
  [key: string]: unknown;
}

export interface DocumentFormProps {
  workflow: WorkflowInterface;
  document: DocumentItemInterface;
  onSubmit: (transition: string, data: Record<string, unknown>) => void;
  disabled: boolean;
  viewOnly: boolean;
}

export interface DynamicFormProps {
  form: UseFormReturn;
  schema: JSONSchemaConfigType;
  ui?: UiFormType;
  mimeType?: MimeType;
  disabled: boolean;
  viewOnly: boolean;
  actions?: React.ReactNode;
}

export interface FormBodyProps {
  mimeType?: MimeType;
  schema: SchemaProperties;
  ui: SchemaProperties | undefined;
  form: UseFormReturn;
  disabled: boolean;
  viewOnly: boolean;
}

export interface FormElementProps {
  name: string | null;
  schema: SchemaProperties;
  ui: SchemaProperties | undefined;
  required: boolean;
  disabled: boolean;
  viewOnly: boolean;
  form: UseFormReturn;
  parentKey: string | null;
}

export interface FieldProps extends FormElementProps {
  name: string;
}
