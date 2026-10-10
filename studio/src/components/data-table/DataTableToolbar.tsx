import { Filter, Plus, Search, X } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface DataTableToolbarProps {
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  onFilterToggle: () => void;
  onNew?: () => void;
  filterCount: number;
  isFilterOpen: boolean;
  newButtonLabel?: string;
  children?: any;
  showFilter: boolean;
  showSearch: boolean;
}

const DataTableToolbar: React.FC<DataTableToolbarProps> = ({
  searchTerm = '',
  onSearchChange,
  onFilterToggle,
  onNew,
  filterCount,
  isFilterOpen,
  newButtonLabel,
  showFilter,
  showSearch,
  children,
}) => {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex w-full items-center justify-between">{children}</div>
      <div className="flex items-center gap-2">
        {showSearch ? (
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              className="w-64 pl-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2 transform p-0"
                onClick={() => onSearchChange && onSearchChange('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ) : (
          ''
        )}

        {showFilter ? (
          <Button
            variant={isFilterOpen ? 'default' : 'outline'}
            size="sm"
            onClick={onFilterToggle}
            className="relative"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {filterCount > 0 && (
              <Badge variant="secondary" className="ml-2 flex h-5 w-5 items-center justify-center p-0 text-xs">
                {filterCount}
              </Badge>
            )}
          </Button>
        ) : (
          ''
        )}

        {onNew && (
          <Button size="sm" onClick={onNew}>
            <Plus className="mr-2 h-4 w-4" />
            {newButtonLabel ?? 'New'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default DataTableToolbar;
