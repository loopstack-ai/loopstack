export type FilterOption = string | { label: string; value: string };

/** What one filter holds: a single choice, or several when its config declares `multiple`. */
export type FilterValue = string | string[];

/**
 * A filter's options, optionally multi-select. The bare array stays the common form — a filter
 * is single-select unless it says otherwise.
 */
export type FilterSpec = FilterOption[] | { options: FilterOption[]; multiple?: boolean };

export function filterOptions(spec: FilterSpec): FilterOption[] {
  return Array.isArray(spec) ? spec : spec.options;
}

export function isMultiSelect(spec: FilterSpec): boolean {
  return !Array.isArray(spec) && spec.multiple === true;
}

/** Whether a filter is actually narrowing anything — an empty list selects nothing, so it is not set. */
export function hasFilterValue(value: FilterValue | undefined): boolean {
  return Array.isArray(value) ? value.length > 0 : !!value;
}

export function filterValues(value: FilterValue | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

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
  filters?: Record<string, FilterValue>;
  filterConfig?: Record<string, FilterSpec>;
  onFiltersChange: (filters: Record<string, FilterValue>) => void;

  // Actions
  onRowClick?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (id: string) => void;
  onNew?: () => void;
  newButtonLabel?: string;

  // Delete confirm dialog customisation
  deleteConfirmTitle?: (itemId: string) => string;
  deleteConfirmDescription?: (itemId: string) => string;

  // Custom row actions
  rowActions?: RowAction<T>[];

  // Batch operations
  enableBatchActions?: boolean;
  batchActions?: BatchAction[];
  onBatchDelete?: (ids: string[]) => Promise<void> | void;
}
