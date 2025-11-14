import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const DataTablePagination: React.FC<DataTablePaginationProps> = ({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange
}) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between mt-4">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">Rows per page</span>
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => onPageSizeChange(parseInt(value))}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[5, 10, 25, 50].map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground">
        {startItem}-{endItem} of {totalItems} items
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="text-sm">
          Page {totalItems === 0 ? 0 : page + 1} of {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default DataTablePagination;
