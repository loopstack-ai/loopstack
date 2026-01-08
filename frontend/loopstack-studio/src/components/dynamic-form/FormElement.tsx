import React from 'react';
import { cn } from '@/lib/utils.ts';
import { ArrayController } from './ArrayController.tsx';
import { FormElementHeader } from './FormElementHeader.tsx';
import { InputController } from './InputController.tsx';
import { ObjectController } from './ObjectController.tsx';
import type { FormElementProps } from './types.ts';

export const FormElement: React.FC<FormElementProps> = (props) => {
  const { schema, disabled } = props;

  const hidden = !!schema?.hidden;

  // type can be an array. remove null option which is for optional properties and select the first type for rendering.
  const type = Array.isArray(schema.type) ? schema.type.filter((i) => i !== 'null').shift() : schema.type;

  const renderFormElement = () => {
    switch (type) {
      case 'object':
        return (
          <>
            <FormElementHeader title={schema.title} disabled={disabled} />
            <ObjectController {...props} />
          </>
        );
      case 'array':
        return (
          <>
            <div className="mt-3">
              <ArrayController {...props} />
            </div>
          </>
        );
      default:
        return <InputController {...props} name={props.name || ''} />;
    }
  };

  return <div className={cn(hidden ? 'hidden' : 'block')}>{renderFormElement()}</div>;
};
