import React from 'react';
import { FormElement } from './FormElement.tsx';
import { useMergeParentKey } from './hooks/useMergeParentKey.ts';
import { useSortedPropertyNames } from './hooks/useSortPropertyNames.ts';
import type { FormElementProps } from './types.ts';

export const ObjectController: React.FC<FormElementProps> = ({
  name,
  schema,
  form,
  disabled,
  parentKey,
  viewOnly
}) => {
  const propertyNames = useSortedPropertyNames(schema.properties, schema?.order);
  const newParentKey = useMergeParentKey(parentKey, name);

  const requiredFields = schema.required || [];

  return (
    <>
      {propertyNames.map((propName) => (
        <FormElement
          key={`el-${propName}`}
          form={form}
          disabled={disabled}
          viewOnly={viewOnly}
          parentKey={newParentKey}
          name={propName}
          schema={schema.properties[propName]}
          required={requiredFields.includes(propName)}
        />
      ))}
    </>
  );
};
