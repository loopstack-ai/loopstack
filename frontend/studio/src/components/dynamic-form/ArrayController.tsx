import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
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
  const fixed = (ui as { fixed?: boolean } | undefined)?.fixed ?? false;
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
        <div className="space-y-2">
          {fields.map((field, index) => (
            <Card key={field.id} className="gap-0 rounded-lg py-0 shadow-none">
              {!viewOnly && !fixed && (
                <div className="flex justify-end px-4 pt-2 pb-0">
                  <Button
                    type="button"
                    onClick={() => remove(index)}
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className="h-7 w-7 p-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <CardContent className={`px-4 pb-2 ${!viewOnly && !fixed ? 'pt-0' : 'pt-3'}`}>
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
              </CardContent>
            </Card>
          ))}

          {!viewOnly && !fixed ? (
            <Button
              type="button"
              onClick={() => append(defaultItemValue)}
              variant="outline"
              size="sm"
              disabled={disabled}
              className="mt-2"
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
