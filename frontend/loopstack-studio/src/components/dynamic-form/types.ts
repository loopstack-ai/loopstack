import type { JSONSchemaConfigType, MimeType } from '@loopstack/shared';
import type { UseFormReturn } from 'react-hook-form';
import type { DocumentItemDto } from '@loopstack/api-client';

export interface DynamicFormProps {
  document: DocumentItemDto;
  onSubmit: (data: Record<string, any>, transition: string) => void;
  disabled: boolean;
  viewOnly: boolean;
  enabledTransitions: string[];
}

export interface FormBodyProps {
  mimeType?: MimeType;
  schema: JSONSchemaConfigType;
  form: UseFormReturn;
  disabled: boolean;
  viewOnly: boolean;
}

export interface FormElementProps {
  name: string | null;
  schema: JSONSchemaConfigType;
  required: boolean;
  disabled: boolean;
  viewOnly: boolean;
  form: UseFormReturn;
  parentKey: string | null;
}

export interface FieldProps extends FormElementProps {
  name: string;
}
