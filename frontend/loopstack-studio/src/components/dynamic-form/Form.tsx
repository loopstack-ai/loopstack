import React from 'react';
import FormBody from './FormBody';
import { FormElementHeader } from './FormElementHeader';
import type { DynamicFormProps, SchemaProperties } from './types';

interface FormUi {
  form?: {
    title?: string;
    description?: string;
  };
}

const Form: React.FC<DynamicFormProps> = ({
  form,
  schema,
  ui,
  mimeType,
  disabled,
  viewOnly,
  actions,
}: DynamicFormProps) => {
  const typedUi = ui as FormUi | undefined;

  return (
    <div className="container mx-auto">
      <FormElementHeader title={typedUi?.form?.title} description={typedUi?.form?.description} disabled={disabled} />

      <form>
        <FormBody
          form={form}
          mimeType={mimeType}
          schema={schema as SchemaProperties}
          ui={ui as SchemaProperties | undefined}
          disabled={disabled}
          viewOnly={viewOnly}
        />

        {!viewOnly && !!actions && <div className="mt-4 flex w-full justify-end">{actions}</div>}
      </form>
    </div>
  );
};

export default Form;
