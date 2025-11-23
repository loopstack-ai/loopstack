import {
  type DocumentItemInterface, type JSONSchemaConfigType,
  type MimeType, type UiFormType,
  type UiPropertiesType, type WorkflowInterface,
} from '@loopstack/shared';
import type { UseFormReturn } from 'react-hook-form';
import React from 'react';

export interface DocumentFormProps {
  workflow: WorkflowInterface,
  document: DocumentItemInterface;
  onSubmit: (transition: string, data: Record<string, any>) => void;
  disabled: boolean;
  viewOnly: boolean;
}

export interface DynamicFormProps {
  form: any;
  schema: JSONSchemaConfigType;
  ui?: UiFormType;
  mimeType?: MimeType;
  disabled: boolean;
  viewOnly: boolean;
  actions?: React.ReactNode;
}

export interface FormBodyProps {
  mimeType?: MimeType;
  schema: UiPropertiesType;
  ui: UiPropertiesType | undefined;
  form: UseFormReturn;
  disabled: boolean;
  viewOnly: boolean;
}

export interface FormElementProps {
  name: string | null;
  schema: UiPropertiesType;
  ui: UiPropertiesType | undefined;
  required: boolean;
  disabled: boolean;
  viewOnly: boolean;
  form: UseFormReturn;
  parentKey: string | null;
}

export interface FieldProps extends FormElementProps {
  name: string;
}
