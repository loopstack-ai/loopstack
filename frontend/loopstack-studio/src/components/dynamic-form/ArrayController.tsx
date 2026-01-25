import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { FormElement } from './FormElement.tsx';
import { useArrayDefaultValue } from './hooks/useArrayDefaultValue.ts';
import { useMergeParentKey } from './hooks/useMergeParentKey.ts';
import type { FormElementProps } from './types.ts';

export const ArrayController: React.FC<FormElementProps> = ({
  name,
  schema,
  ui,
  form,
  disabled,
  parentKey,
  viewOnly,
}) => {
  const newParentKey = useMergeParentKey(parentKey, name);
  const collapsed = ui?.collapsed ?? false;
  const [isOpen, setIsOpen] = useState(!collapsed);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: newParentKey ?? '',
  });

  const defaultItemValue = useArrayDefaultValue(schema.items);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="mb-2 flex items-center gap-2 p-2 hover:bg-gray-100" type="button">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium">
            {ui?.title ?? schema.title ?? name}
            {!isOpen && (
              <span className="ml-2 text-sm text-gray-500">
                ({fields.length} {fields.length === 1 ? 'item' : 'items'})
              </span>
            )}
          </span>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="pl-4">
          {fields.map((field, index) => {
            return (
              <div
                key={field.id}
                className={`mb-2 flex items-start border-l border-gray-300 pt-2 pr-0 pl-4 ${
                  index === 0 ? 'mt-2' : 'mt-5'
                }`}
              >
                <div className="mr-1 min-w-0 flex-1">
                  {schema.items && (
                    <FormElement
                      name={index.toString()}
                      parentKey={newParentKey}
                      required={false}
                      schema={schema.items}
                      ui={ui?.items}
                      form={form}
                      disabled={disabled}
                      viewOnly={viewOnly}
                    />
                  )}
                </div>
                {!viewOnly ? (
                  <Button
                    type="button"
                    onClick={() => remove(index)}
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className="mt-1 h-8 w-8 p-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  ''
                )}
              </div>
            );
          })}

          {!viewOnly ? (
            <Button
              type="button"
              onClick={() => append(defaultItemValue)}
              variant="outline"
              size="sm"
              disabled={disabled}
              className="mt-4"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add {ui?.items?.title ?? schema.items?.title ?? 'Item'}
            </Button>
          ) : (
            ''
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
