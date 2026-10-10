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

/**
 * A field the widget marks as required, on top of the ones the schema lists.
 *
 * The two say different things. The schema's `required` is what the document cannot be stored without, so a
 * form that is filled in over several passes cannot use it — the half-filled card would not persist. The
 * widget's is what the user has to supply before the actions on this card will accept it. A gate whose
 * fields are optional to store but mandatory to act on needs the second one.
 */
interface RequirableUi {
  required?: boolean;
}

/** Widgets that render a block of content rather than an input, and so never share a row. */
const BLOCK_WIDGETS = new Set(['markdown-view', 'markdown-collapsed', 'code-view', 'textarea', 'option-picker']);

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

  // Two compact inputs sit side by side. A block — rendered Markdown, a code view, a text area, a picker —
  // needs the whole width, so a pair that includes one stacks instead of squeezing both into half a card.
  const useGrid =
    propertyNames.length === 2 &&
    propertyNames.every((propName) => {
      const widget =
        (objectUi?.properties?.[propName] as { widget?: string } | undefined)?.widget ??
        (objectSchema.properties?.[propName] as { widget?: string } | undefined)?.widget;
      return !widget || !BLOCK_WIDGETS.has(widget);
    });

  return (
    <div className={useGrid ? 'grid grid-cols-2 gap-x-4' : undefined}>
      {propertyNames.map((propName) => {
        const itemSchema = objectSchema.properties?.[propName];
        const itemUi = objectUi?.properties?.[propName];
        const requiredByWidget = (itemUi as RequirableUi | undefined)?.required === true;
        return itemSchema ? (
          <FormElement
            key={`el-${propName}`}
            form={form}
            disabled={disabled}
            viewOnly={viewOnly}
            parentKey={newParentKey}
            name={propName}
            schema={itemSchema}
            ui={itemUi}
            required={requiredFields.includes(propName) || requiredByWidget}
          />
        ) : null;
      })}
    </div>
  );
};
