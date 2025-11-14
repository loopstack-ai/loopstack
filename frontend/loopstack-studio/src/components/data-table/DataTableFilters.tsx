import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { X } from 'lucide-react';

interface DataTableFiltersProps {
  filters: Record<string, string>;
  filterConfig: Record<string, string[]>;
  onFiltersChange?: (filters: Record<string, string>) => void;
  isOpen: boolean;
}

const DataTableFilters: React.FC<DataTableFiltersProps> = ({
  filters,
  filterConfig,
  onFiltersChange,
  isOpen
}) => {
  if (!isOpen) return null;

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters };
    if (value === 'all') {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    onFiltersChange && onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange && onFiltersChange({});
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const activeFilters = Object.entries(filters).filter(([_, value]) => value);

  return (
    <div className="flex flex-wrap gap-4">
      {Object.entries(filterConfig).map(([key, options]) => (
        <div key={key}>
          <Select
            value={filters[key] || 'all'}
            onValueChange={(value) => handleFilterChange(key, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${key}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {key}</SelectItem>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map(([key, value]) => (
            <Badge key={key} variant="secondary" className="flex items-center gap-1">
              {key}: {value}
              <button
                onClick={() => {
                  handleFilterChange(key, 'all');
                }}
              >
                <X className="h-3 w-3 cursor-pointer" />
              </button>
            </Badge>
          ))}
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
