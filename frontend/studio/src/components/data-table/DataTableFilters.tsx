import { Check, ChevronDown, X } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { FilterOption, FilterSpec, FilterValue } from './data-table';
import { filterOptions, filterValues, hasFilterValue, isMultiSelect } from './data-table';

function getOptionValue(option: FilterOption): string {
  return typeof option === 'string' ? option : option.value;
}

function getOptionLabel(option: FilterOption): string {
  return typeof option === 'string' ? option : option.label;
}

interface DataTableFiltersProps {
  filters: Record<string, FilterValue>;
  filterConfig: Record<string, FilterSpec>;
  onFiltersChange?: (filters: Record<string, FilterValue>) => void;
  isOpen: boolean;
}

const DataTableFilters: React.FC<DataTableFiltersProps> = ({ filters, filterConfig, onFiltersChange, isOpen }) => {
  if (!isOpen) return null;

  /** Writes one filter, dropping the key entirely when nothing is selected — "unset", not "match none". */
  const setFilter = (key: string, value: FilterValue | undefined) => {
    const newFilters = { ...filters };
    if (!hasFilterValue(value)) {
      delete newFilters[key];
    } else {
      newFilters[key] = value as FilterValue;
    }
    onFiltersChange?.(newFilters);
  };

  const toggleValue = (key: string, value: string) => {
    const current = filterValues(filters[key]);
    setFilter(key, current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const clearAllFilters = () => {
    onFiltersChange?.({});
  };

  const activeFilters = Object.entries(filters).filter(([, value]) => hasFilterValue(value));

  const getActiveFilterLabel = (key: string, value: string): string => {
    const spec = filterConfig[key];
    if (!spec) return value;
    const option = filterOptions(spec).find((o) => getOptionValue(o) === value);
    return option ? getOptionLabel(option) : value;
  };

  return (
    <div className="flex flex-wrap gap-4">
      {Object.entries(filterConfig).map(([key, spec]) => {
        const options = filterOptions(spec);
        const selected = filterValues(filters[key]);

        if (!isMultiSelect(spec)) {
          return (
            <div key={key}>
              <Select
                value={selected[0] ?? 'all'}
                onValueChange={(value) => setFilter(key, value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${key}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {key}</SelectItem>
                  {options.map((option) => (
                    <SelectItem key={getOptionValue(option)} value={getOptionValue(option)}>
                      {getOptionLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }

        return (
          <Popover key={key}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-between gap-2 font-normal">
                {selected.length === 0
                  ? `All ${key}`
                  : selected.length === 1
                    ? getActiveFilterLabel(key, selected[0])
                    : `${key}: ${selected.length} selected`}
                <ChevronDown className="size-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="start">
              <Command>
                <CommandList>
                  <CommandEmpty>No options.</CommandEmpty>
                  <CommandGroup>
                    {options.map((option) => {
                      const value = getOptionValue(option);
                      const isSelected = selected.includes(value);
                      return (
                        <CommandItem key={value} value={value} onSelect={() => toggleValue(key, value)}>
                          <Check className={`size-4 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                          {getOptionLabel(option)}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        );
      })}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.flatMap(([key, value]) =>
            filterValues(value).map((single) => (
              <Badge key={`${key}:${single}`} variant="secondary" className="flex items-center gap-1">
                {key}: {getActiveFilterLabel(key, single)}
                <button
                  onClick={() => {
                    const spec = filterConfig[key];
                    if (spec && isMultiSelect(spec)) {
                      toggleValue(key, single);
                    } else {
                      setFilter(key, undefined);
                    }
                  }}
                >
                  <X className="h-3 w-3 cursor-pointer" />
                </button>
              </Badge>
            )),
          )}
        </div>
      )}

      {activeFilters.length > 0 && (
        <Button variant="outline" size="sm" onClick={clearAllFilters} className="ml-auto">
          Clear All
        </Button>
      )}
    </div>
  );
};

export default DataTableFilters;
