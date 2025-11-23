import type { DynamicFormProps } from './types';
import { FormElementHeader } from './FormElementHeader';
import FormBody from './FormBody';
import React from 'react';

const Form: React.FC<DynamicFormProps> = ({
  form,
  schema,
  ui,
  mimeType,
  disabled,
  viewOnly,
  actions,
}: DynamicFormProps) => {

  return (
    <div className="container mx-auto">
      <FormElementHeader
        title={ui?.form?.title}
        description={ui?.form?.description}
        disabled={disabled}
      />

      <form>
        <FormBody
          form={form}
          mimeType={mimeType}
          schema={schema}
          ui={ui}
          disabled={disabled}
          viewOnly={viewOnly}
        />

        {!viewOnly && !!actions && <div className="mt-4 w-full flex justify-end">
          { actions }
        </div>}

      </form>
    </div>
);
};

export default Form;
