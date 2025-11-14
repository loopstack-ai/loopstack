import React from 'react';
import { ObjectController } from './ObjectController.tsx';
import MarkdownContent from './MarkdownContent.tsx';
import type { FormBodyProps } from './types.ts';
import CodeContent from './CodeContent.tsx';

const FormBody: React.FC<FormBodyProps> = ({ mimeType, schema, disabled, viewOnly, form }) => {
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
