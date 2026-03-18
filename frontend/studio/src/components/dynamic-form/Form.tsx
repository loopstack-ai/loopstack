import React, { useEffect } from 'react';
import FormBody from './FormBody';
import { FormElementHeader } from './FormElementHeader';
import type { DynamicFormProps, SchemaProperties } from './types';

interface FormUi {
  form?: {
    title?: string;
    description?: string;
  };
}

/**
 * Extract default values from a JSON schema recursively.
 * Handles object-level defaults, property-level defaults, and nested objects.
 */
function extractSchemaDefaults(schema: SchemaProperties): Record<string, unknown> | undefined {
  // If the schema itself has a top-level default, use it
  if (schema.default !== undefined) {
    return schema.default as Record<string, unknown>;
  }

  // For object schemas, recurse into properties
  if (schema.properties) {
    const defaults: Record<string, unknown> = {};
    let hasDefault = false;

    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (propSchema.default !== undefined) {
        defaults[key] = propSchema.default;
        hasDefault = true;
      } else if (propSchema.type === 'object' && propSchema.properties) {
        const nested = extractSchemaDefaults(propSchema);
        if (nested !== undefined) {
          defaults[key] = nested;
          hasDefault = true;
        }
      }
    }

    return hasDefault ? defaults : undefined;
  }

  return undefined;
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
  const typedSchema = schema as SchemaProperties;

  // Apply schema defaults to form on mount
  useEffect(() => {
    const defaults = extractSchemaDefaults(typedSchema);

    if (defaults) {
      const currentValues = form.getValues();
      const mergedValues: Record<string, unknown> = { ...defaults };

      for (const [key, value] of Object.entries(currentValues)) {
        if (value !== undefined && value !== '' && value !== null) {
          mergedValues[key] = value;
        }
      }

      form.reset(mergedValues);
    }
  }, [schema]);

  return (
    <div className="container mx-auto">
      <FormElementHeader title={typedUi?.form?.title} description={typedUi?.form?.description} disabled={disabled} />

      <form>
        <FormBody
          form={form}
          mimeType={mimeType}
          schema={schema as SchemaProperties}
          ui={ui?.form as SchemaProperties | undefined}
          disabled={disabled}
          viewOnly={viewOnly}
        />

        {!viewOnly && !!actions && <div className="mt-4 flex w-full justify-end">{actions}</div>}
      </form>
    </div>
  );
};

export default Form;
