export interface DataTableColumn<T = any> {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  format?: (value: any, row: T) => React.ReactNode;
}

export interface BatchAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  action: (selectedIds: string[]) => Promise<void> | void;
}

export interface RowAction<T = any> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  action: (item: T) => Promise<void> | void;
  condition?: (item: T) => boolean; // Show/hide action based on row data
  disabled?: (item: T) => boolean; // Enable/disable action based on row data
  className?: string; // Custom CSS classes
}

export interface DataTableProps<T = any> {
  title?: string;
  data: T[];
  columns: DataTableColumn<T>[];
  totalItems: number;
  loading?: boolean;
  error?: Error | null;

  // Pagination
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  // Sorting
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  onSortChange: (field: string, order: 'ASC' | 'DESC') => void;

  // Search & Filters
  searchTerm?: string;
  onSearchChange: (term: string) => void;
  filters?: Record<string, string>;
  filterConfig?: Record<string, string[]>;
  onFiltersChange: (filters: Record<string, string>) => void;

  // Actions
  onRowClick?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (id: string) => void;
  onNew?: () => void;

  // Custom row actions
  rowActions?: RowAction<T>[];

  // Batch operations
  enableBatchActions?: boolean;
  batchActions?: BatchAction[];
  onBatchDelete?: (ids: string[]) => Promise<void> | void;
}
