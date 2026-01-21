import React from 'react';
import type { UiPropertiesType } from '@loopstack/contracts/types';
import { InputField, type InputFieldSchema } from '@/components/dynamic-form/fields/InputField.tsx';
import { TextareaField, type TextareaFieldSchema } from '@/components/dynamic-form/fields/TextareaField.tsx';
import { CheckboxField } from './fields/CheckboxField';
import type { CheckboxFieldSchema } from './fields/CheckboxField';
import { CodeViewField } from './fields/CodeViewField';
import type { CodeFieldSchema } from './fields/CodeViewField';
import { RadioField } from './fields/RadioField';
import type { RadioFieldSchema } from './fields/RadioField';
import { SelectField } from './fields/SelectField';
import type { SelectFieldSchema } from './fields/SelectField';
import { SliderField } from './fields/SliderField';
import type { SliderFieldSchema } from './fields/SliderField';
import { SwitchField } from './fields/SwitchField';
import type { SwitchFieldSchema } from './fields/SwitchField';
import type { FieldProps } from './types';

type WidgetType = 'checkbox' | 'radio' | 'switch' | 'select' | 'slider' | 'text' | 'code-view' | 'textarea';

type FieldSchema =
  | CheckboxFieldSchema
  | RadioFieldSchema
  | SwitchFieldSchema
  | SelectFieldSchema
  | SliderFieldSchema
  | InputFieldSchema
  | TextareaFieldSchema
  | CodeFieldSchema;

const WIDGET_REGISTRY: Record<WidgetType, React.ComponentType<FieldProps & { schema: any }>> = {
  checkbox: CheckboxField,
  radio: RadioField,
  switch: SwitchField,
  select: SelectField,
  slider: SliderField,
  text: InputField,
  textarea: TextareaField,
  'code-view': CodeViewField,
} as const;

const WIDGET_NAMES = Object.keys(WIDGET_REGISTRY) as WidgetType[];

/**
 * Determines the widget type based on schema properties
 */
const resolveWidgetType = (schema: UiPropertiesType, uiWidget?: string): WidgetType => {
  if (uiWidget && WIDGET_NAMES.includes(uiWidget as WidgetType)) {
    return uiWidget as WidgetType;
  }

  // Infer from schema type
  if (schema.type === 'boolean') {
    return 'checkbox';
  }

  if (schema.enum && schema.enum.length > 0) {
    return 'select';
  }

  return 'text';
};

const getFieldName = (name: string, parentKey: string | null): string => {
  return parentKey ? `${parentKey}.${name}` : name;
};

export const InputController: React.FC<FieldProps> = (props) => {
  const { name, schema, ui, parentKey } = props;

  if (schema.hidden) {
    return null;
  }

  const fieldName = getFieldName(name, parentKey);
  const widgetType = resolveWidgetType(schema, ui?.widget);

  const FieldComponent = WIDGET_REGISTRY[widgetType];

  return <FieldComponent {...props} name={fieldName} schema={schema as FieldSchema} />;
};
