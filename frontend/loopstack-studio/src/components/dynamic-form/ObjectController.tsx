import React from 'react';
import { FormElement } from './FormElement.tsx';
import { useMergeParentKey } from './hooks/useMergeParentKey.ts';
import { useSortedPropertyNames } from './hooks/useSortPropertyNames.ts';
import type { FormElementProps, SchemaProperties } from './types.ts';

interface ObjectSchema {
  properties?: Record<string, SchemaProperties>;
  required?: string[];
}

interface ObjectUi {
  order?: string[];
  properties?: Record<string, SchemaProperties>;
}

export const ObjectController: React.FC<FormElementProps> = ({
  name,
  schema,
  ui,
  form,
  disabled,
  parentKey,
  viewOnly,
}: FormElementProps) => {
  const objectSchema = schema as ObjectSchema;
  const objectUi = ui as ObjectUi | undefined;
  const propertyNames = useSortedPropertyNames(objectSchema.properties ?? {}, objectUi?.order);
  const newParentKey = useMergeParentKey(parentKey, name);

  const requiredFields: string[] = objectSchema.required ?? [];

  return (
    <>
      {propertyNames.map((propName) => {
        const itemSchema = objectSchema.properties?.[propName];
        return itemSchema ? (
          <FormElement
            key={`el-${propName}`}
            form={form}
            disabled={disabled}
            viewOnly={viewOnly}
            parentKey={newParentKey}
            name={propName}
            schema={itemSchema}
            ui={objectUi?.properties?.[propName]}
            required={requiredFields.includes(propName)}
          />
        ) : null;
      })}
    </>
  );
};
