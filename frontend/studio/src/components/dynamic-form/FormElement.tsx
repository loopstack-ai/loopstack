import React from 'react';
import { cn } from '@/lib/utils.ts';
import { ArrayController } from './ArrayController.tsx';
import { FormElementHeader } from './FormElementHeader.tsx';
import { InputController, isRegisteredWidget } from './InputController.tsx';
import { ObjectController } from './ObjectController.tsx';
import type { FormElementProps } from './types.ts';

interface SchemaWithType {
  type?: string | string[];
  hidden?: boolean;
  title?: string;
  widget?: string;
}

export const FormElement: React.FC<FormElementProps> = (props) => {
  const { schema, ui, disabled } = props;
  const typedSchema = schema as SchemaWithType;

  const hidden = !!typedSchema?.hidden;

  // type can be an array. remove null option which is for optional properties and select the first type for rendering.
  const schemaType = typedSchema.type;
  const type = Array.isArray(schemaType) ? schemaType.filter((i: string) => i !== 'null').shift() : schemaType;

  // A declared widget wins over the shape: an object or array field whose document names a widget is drawn by
  // that widget, not taken apart into nested fields.
  const declared = (ui as { widget?: unknown } | undefined)?.widget ?? typedSchema.widget;

  const renderFormElement = () => {
    if (isRegisteredWidget(declared)) return <InputController {...props} name={props.name ?? ''} />;
    switch (type) {
      case 'object':
        return (
          <>
            <FormElementHeader title={typedSchema.title} disabled={disabled} />
            <ObjectController {...props} />
          </>
        );
      case 'array':
        return (
          <>
            <div className="mt-1">
              <ArrayController {...props} />
            </div>
          </>
        );
      default:
        return <InputController {...props} name={props.name ?? ''} />;
    }
  };

  return <div className={cn(hidden ? 'hidden' : 'block')}>{renderFormElement()}</div>;
};
