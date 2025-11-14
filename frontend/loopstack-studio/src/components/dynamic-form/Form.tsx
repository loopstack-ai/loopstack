import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { DynamicFormProps } from './types';
import { FormElementHeader } from './FormElementHeader.tsx';
import FormButtons from './FormButtons.tsx';
import FormBody from './FormBody.tsx';
import { merge } from 'lodash';
import { z } from 'zod';

const Form: React.FC<DynamicFormProps> = ({
  document,
  onSubmit,
  disabled,
  enabledTransitions,
  viewOnly
}) => {
  const form = useForm<Record<string, any>>({
    defaultValues:
      // @ts-ignore //todo
      document.schema.type === 'object' ? document.content : { raw: document.content },
    mode: 'onChange'
  });

  useEffect(() => {
    if (document.validationError) {
      const error = document.validationError as z.ZodError;
      error.issues.forEach((issue) => {
        const fieldPath = issue.path.join('.');
        form.setError(fieldPath, {
          type: issue.code,
          message: issue.message
        });
      });
    } else {
      form.clearErrors();
    }
  }, [document.validationError, form]);

  const handleButtonClick = (transition: string) => {
    return (data: Record<string, any>) => {
      // @ts-ignore //todo
      if (document.schema.type === 'object') {
        onSubmit(data, transition);
      } else {
        onSubmit(data.raw, transition);
      }
    };
  };

  const schema = merge({}, document.schema ?? {}, document.ui ?? {});
  // @ts-ignore //todo
  const disabledProps = disabled || schema.disabled || false;

  return (
    <div className="container mx-auto">
      <FormElementHeader
        // @ts-ignore //todo
        title={schema.title}
        // @ts-ignore //todo
        description={schema.description}
        disabled={disabledProps}
      />

      <form>
        <FormBody
          form={form}
          // @ts-ignore //todo
          mimeType={document.meta?.mimeType}
          schema={schema}
          disabled={disabledProps}
          viewOnly={viewOnly}
        />

        <FormButtons
          // @ts-ignore //todo
          buttons={schema?.buttons ?? []}
          handleButtonClick={handleButtonClick}
          disabled={disabledProps}
          viewOnly={viewOnly}
          enabledTransitions={enabledTransitions}
          form={form}
        />
      </form>
    </div>
  );
};

export default Form;
