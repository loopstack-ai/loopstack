import React from 'react';
import CodeContent from './CodeContent.tsx';
import MarkdownContent from './MarkdownContent.tsx';
import { ObjectController } from './ObjectController.tsx';
import type { FormBodyProps } from './types.ts';

const FormBody: React.FC<FormBodyProps> = ({ mimeType, schema, ui, disabled, viewOnly, form }: FormBodyProps) => {
  const rawValue = form.watch('raw');

  const renderType = () => {
    switch (mimeType) {
      case 'text/markdown':
        return <MarkdownContent content={rawValue} />;
      case 'application/json':
      case 'application/yaml':
        return <CodeContent content={rawValue} />;
      case undefined:
        return (
          <ObjectController
            name={null}
            parentKey={null}
            schema={schema}
            ui={ui}
            form={form}
            disabled={disabled}
            required={true}
            viewOnly={viewOnly}
          />
        );
    }
  };

  return renderType();
};

export default FormBody;
