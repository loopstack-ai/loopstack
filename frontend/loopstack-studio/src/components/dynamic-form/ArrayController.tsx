import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { useFieldArray } from 'react-hook-form';
import { FormElement } from './FormElement.tsx';
import type { FormElementProps } from './types.ts';
import { useMergeParentKey } from './hooks/useMergeParentKey.ts';
import { useArrayDefaultValue } from './hooks/useArrayDefaultValue.ts';

export const ArrayController: React.FC<FormElementProps> = ({
  name,
  schema,
  form,
  disabled,
  parentKey,
  viewOnly
}) => {
  const newParentKey = useMergeParentKey(parentKey, name);
  const collapsed = schema.collapsed ?? false;
  const [isOpen, setIsOpen] = useState(!collapsed);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: newParentKey ?? ''
  });

  const defaultItemValue = useArrayDefaultValue(schema);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 p-2 mb-2 hover:bg-gray-100"
          type="button"
        >
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium">
            {schema.title || name}
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
                className={`flex mb-2 pl-4 pt-2 pr-0 items-start border-l-1 border-gray-300 ${
                  index === 0 ? 'mt-2' : 'mt-5'
                }`}
              >
                <div className="mr-1 flex-1 min-w-0">
                  <FormElement
                    name={index.toString()}
                    parentKey={newParentKey}
                    required={false}
                    schema={schema.items}
                    form={form}
                    disabled={disabled}
                    viewOnly={viewOnly}
                  />
                </div>
                {!viewOnly ? (
                  <Button
                    type="button"
                    onClick={() => remove(index)}
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className="mt-1 p-2 h-8 w-8"
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
              <Plus className="h-4 w-4 mr-2" />
              Add {schema.items.title || 'Item'}
            </Button>
          ) : (
            ''
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
