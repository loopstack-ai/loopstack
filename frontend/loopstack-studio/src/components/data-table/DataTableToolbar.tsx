import { Search, Filter, Plus, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface DataTableToolbarProps {
  title: string;
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
  title,
  searchTerm = '',
  onSearchChange,
  onFilterToggle,
  onNew,
  filterCount,
  isFilterOpen,
  newButtonLabel,
  showFilter,
  showSearch,
  children
}) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-2xl font-bold">{title}</h2>

      <div className="flex items-center gap-2">
        {children}
        {showSearch ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              className="pl-10 w-64"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
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
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {filterCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {filterCount}
              </Badge>
            )}
          </Button>
        ) : (
          ''
        )}

        {onNew && (
          <Button size="sm" onClick={onNew}>
            <Plus className="h-4 w-4 mr-2" />
            {newButtonLabel ?? 'New'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default DataTableToolbar;
