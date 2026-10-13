import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import React, { useState } from 'react';
import { Controller } from 'react-hook-form';
import { cn } from '@/lib/utils.ts';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { useFieldConfig } from '../hooks/useFieldConfig';
import type { FieldProps } from '../types';
import { BaseFieldWrapper } from './BaseFieldWrapper';

/** The field's value: what can be picked and what is, in one place. */
export interface MultiSelectValue {
  options: string[];
  selected: string[];
}

export interface MultiSelectFieldSchema {
  title?: string;
  type?: string;
  widget?: 'multi-select';
  help?: string;
  description?: string;
  readonly?: boolean;
  disabled?: boolean;
  placeholder?: string;
  [key: string]: unknown;
}

interface MultiSelectFieldProps extends FieldProps {
  schema: MultiSelectFieldSchema;
}

/** The value as the form holds it, whatever arrived: anything that is not a list of strings counts as none. */
const readValue = (raw: unknown): MultiSelectValue => {
  const value = (raw ?? {}) as Partial<MultiSelectValue>;
  const strings = (list: unknown) =>
    Array.isArray(list) ? list.filter((item): item is string => typeof item === 'string') : [];
  return { options: strings(value.options), selected: strings(value.selected) };
};

/**
 * Several picks from a list the document itself carries.
 *
 * A select reads its entries from the schema, which is declared once per document class. The entries here
 * differ per run — the directories of one checkout, say — so they travel in the field's value together with
 * the picks, as the option-picker's do. Submitting the form returns the same value with `selected` changed.
 *
 * The list is searchable, and a search that matches no entry exactly can be added as a pick of its own: a
 * list read from what exists cannot hold the thing that is about to be created. A pick that is not among the
 * options is still listed, so it can be removed the same way it was added.
 */
export const MultiSelectField: React.FC<MultiSelectFieldProps> = ({ name, schema, ui, required, form, disabled }) => {
  const config = useFieldConfig(name, schema, ui, disabled);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const placeholder = (ui as { placeholder?: string } | undefined)?.placeholder ?? schema.placeholder ?? 'Choose…';

  return (
    <Controller
      name={name}
      control={form.control}
      rules={{
        validate: (raw) => !required || readValue(raw).selected.length > 0 || 'This field is required',
      }}
      render={({ field }) => {
        const value = readValue(field.value);
        const locked = !!(config.isReadOnly || config.isDisabled);
        const listed = [...value.options, ...value.selected.filter((pick) => !value.options.includes(pick))];
        const typed = search.trim();
        const set = (selected: string[]) => field.onChange({ ...value, selected });
        const toggle = (entry: string) =>
          set(
            value.selected.includes(entry)
              ? value.selected.filter((pick) => pick !== entry)
              : [...value.selected, entry],
          );

        return (
          <BaseFieldWrapper
            name={name}
            label={config.fieldLabel}
            required={required}
            error={config.error}
            helpText={config.helpText}
            description={config.description}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {value.selected.map((pick) => (
                <Badge key={pick} variant="secondary" className="font-mono">
                  {pick}
                  {!locked && (
                    <button
                      type="button"
                      aria-label={`Remove ${pick}`}
                      className="hover:text-foreground text-muted-foreground"
                      onClick={() => toggle(pick)}
                    >
                      <X />
                    </button>
                  )}
                </Badge>
              ))}
              <Popover
                open={open && !locked}
                onOpenChange={(next) => {
                  setOpen(next);
                  if (!next) setSearch('');
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    id={name}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={locked}
                    className={cn('h-7', config.error && 'border-destructive')}
                    {...config.getAriaProps()}
                  >
                    {placeholder}
                    <ChevronsUpDown className="opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search…" value={search} onValueChange={setSearch} />
                    <CommandList>
                      <CommandEmpty>Nothing matches.</CommandEmpty>
                      <CommandGroup>
                        {listed.map((entry) => (
                          <CommandItem key={entry} value={entry} onSelect={() => toggle(entry)}>
                            <Check className={cn(value.selected.includes(entry) ? 'opacity-100' : 'opacity-0')} />
                            <span className="font-mono">{entry}</span>
                          </CommandItem>
                        ))}
                        {typed && !listed.includes(typed) && (
                          <CommandItem
                            // cmdk filters items by their value, so this one carries the search itself to stay visible.
                            value={typed}
                            onSelect={() => {
                              set([...value.selected, typed]);
                              setSearch('');
                            }}
                          >
                            <Plus />
                            Add <span className="font-mono">{typed}</span>
                          </CommandItem>
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </BaseFieldWrapper>
        );
      }}
    />
  );
};
