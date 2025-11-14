import React from 'react';
import { CheckboxField } from './fields/CheckboxField';
import type { CheckboxFieldSchema } from './fields/CheckboxField';
import { TextField } from './fields/TextField';
import type { TextFieldSchema } from './fields/TextField';
import { SelectField } from './fields/SelectField';
import type { SelectFieldSchema } from './fields/SelectField';
import { RadioField } from './fields/RadioField';
import type { RadioFieldSchema } from './fields/RadioField';
import { SliderField } from './fields/SliderField';
import type { SliderFieldSchema } from './fields/SliderField';
import { SwitchField } from './fields/SwitchField.tsx';
import type { SwitchFieldSchema } from './fields/SwitchField.tsx';
import { CodeViewField } from './fields/CodeViewField.tsx';
import type { CodeFieldSchema } from './fields/CodeViewField.tsx';
import type { FieldProps } from './types.ts';

type FieldType = 'checkbox' | 'radio' | 'switch' | 'select' | 'slider' | 'text' | 'code-view';

export const InputController: React.FC<FieldProps> = (props) => {
  const { name, schema, parentKey } = props;

  const fieldName = parentKey ? `${parentKey}.${name}` : name;
  const inputType = schema?.widget || schema.type;

  const getFieldType = (): FieldType => {
    switch (true) {
      case (schema.type === 'number' || schema.type === 'integer') &&
        schema.minimum !== undefined &&
        schema.maximum !== undefined &&
        inputType === 'slider':
        return 'slider';

      case inputType === 'boolean':
        return 'checkbox';

      case inputType === 'radio':
        return 'radio';

      case inputType === 'switch':
        return 'switch';

      case inputType === 'select':
        return 'select';

      case inputType === 'code-view':
        return 'code-view';

      case !!schema.enum:
        return 'select';

      default:
        return 'text';
    }
  };

  const fieldProps = { ...props, name: fieldName };
  const fieldType = getFieldType();

  if (schema.hidden) {
    return null;
  }

  switch (fieldType) {
    case 'checkbox':
      return (
        <CheckboxField
          name={fieldName}
          schema={schema as CheckboxFieldSchema}
          required={fieldProps.required}
          disabled={fieldProps.disabled}
          viewOnly={fieldProps.viewOnly}
          form={fieldProps.form}
          parentKey={fieldProps.parentKey}
        />
      );

    case 'radio':
      return (
        <RadioField
          name={fieldName}
          schema={schema as RadioFieldSchema}
          required={fieldProps.required}
          disabled={fieldProps.disabled}
          viewOnly={fieldProps.viewOnly}
          form={fieldProps.form}
          parentKey={fieldProps.parentKey}
        />
      );

    case 'switch':
      return (
        <SwitchField
          name={fieldName}
          schema={schema as SwitchFieldSchema}
          required={fieldProps.required}
          disabled={fieldProps.disabled}
          viewOnly={fieldProps.viewOnly}
          form={fieldProps.form}
          parentKey={fieldProps.parentKey}
        />
      );

    case 'select':
      return (
        <SelectField
          name={fieldName}
          schema={schema as SelectFieldSchema}
          required={fieldProps.required}
          disabled={fieldProps.disabled}
          viewOnly={fieldProps.viewOnly}
          form={fieldProps.form}
          parentKey={fieldProps.parentKey}
        />
      );

    case 'slider':
      return (
        <SliderField
          name={fieldName}
          schema={schema as SliderFieldSchema}
          required={fieldProps.required}
          disabled={fieldProps.disabled}
          viewOnly={fieldProps.viewOnly}
          form={fieldProps.form}
          parentKey={fieldProps.parentKey}
        />
      );

    case 'code-view':
      return (
        <CodeViewField
          name={fieldName}
          schema={schema as CodeFieldSchema}
          required={fieldProps.required}
          disabled={fieldProps.disabled}
          viewOnly={fieldProps.viewOnly}
          form={fieldProps.form}
          parentKey={fieldProps.parentKey}
        />
      );

    case 'text':
    default:
      return (
        <TextField
          name={fieldName}
          schema={schema as TextFieldSchema}
          required={fieldProps.required}
          disabled={fieldProps.disabled}
          viewOnly={fieldProps.viewOnly}
          form={fieldProps.form}
          parentKey={fieldProps.parentKey}
        />
      );
  }
};
