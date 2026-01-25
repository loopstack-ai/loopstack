import React, { useCallback } from 'react';
import { DataTable } from '../data-table/DataTable';
import type { BatchAction, DataTableColumn, RowAction } from '../data-table/data-table';

export interface Item {
  id: string;
}

export interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: unknown) => string;
}

export interface OriginalBatchAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  action: (selectedIds: string[]) => void | Promise<void>;
}

export interface OriginalRowAction<T extends Item = Item> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: (item: T) => void | Promise<void>;
  condition?: (item: T) => boolean;
  disabled?: (item: T) => boolean;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
}

interface ListViewProps<T extends Item = Item> {
  loading: boolean;
  error: Error | null;
  items: T[];
  totalItems: number;
  columns: Column[];
  filterConfig: Record<string, string[]>;
  deleteItem: (id: string) => void;
  onClick: (id: string) => void;
  handleNew: () => void;
  handleEdit: (item: T) => void;
  setPage: (page: number) => void;
  setRowsPerPage: (rows: number) => void;
  setOrderBy: (field: string) => void;
  setOrder: (order: 'asc' | 'desc') => void;
  setSearchTerm: (search: string) => void;
  setFilters: (filters: Record<string, string>) => void;
  orderBy: string;
  order: 'asc' | 'desc';
  searchTerm: string | undefined;
  filters: Record<string, string>;
  page: number;
  rowsPerPage: number;
  batchActions?: OriginalBatchAction[];
  batchDelete?: (ids: string[]) => void | Promise<void>;
  enableBatchActions?: boolean;
  rowActions?: OriginalRowAction<T>[];
}

const ListView = <T extends Item>({
  loading,
  error,
  items,
  totalItems,
  columns,
  filterConfig,
  deleteItem,
  onClick,
  handleNew,
  handleEdit,
  setPage,
  setRowsPerPage,
  setOrderBy,
  setOrder,
  setSearchTerm,
  setFilters,
  orderBy,
  order,
  searchTerm = '',
  filters,
  page,
  rowsPerPage,
  batchActions = [],
  batchDelete,
  enableBatchActions = true,
  rowActions = [],
}: ListViewProps<T>) => {
  const transformedColumns: DataTableColumn[] = columns.map((column) => ({
    id: column.id,
    label: column.label,
    minWidth: column.minWidth,
    align: column.align,
    sortable: true,
    format: column.format
      ? (value: unknown) => {
          const formatted = column.format!(value);
          if (typeof formatted === 'string' && formatted.includes('<')) {
            return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
          }
          return formatted;
        }
      : undefined,
  }));

  const transformedBatchActions: BatchAction[] = batchActions.map((action) => ({
    id: action.id,
    label: action.label,
    icon: action.icon,
    variant: action.variant,
    action: action.action,
  }));

  const transformedRowActions: RowAction[] = rowActions.map((action) => ({
    id: action.id,
    label: action.label,
    icon: action.icon,
    variant: action.variant,
    action: action.action,
    condition: action.condition,
    disabled: action.disabled,
    className: action.className,
  }));

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
    },
    [setPage],
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      setRowsPerPage(newSize);
      setPage(0);
    },
    [setRowsPerPage, setPage],
  );

  const handleSortChange = useCallback(
    (field: string, sortOrder: 'asc' | 'desc') => {
      setOrderBy(field);
      setOrder(sortOrder);
    },
    [setOrderBy, setOrder],
  );

  const handleSearchChange = useCallback(
    (term: string) => {
      setSearchTerm(term);
      setPage(0);
    },
    [setSearchTerm, setPage],
  );

  const handleFiltersChange = useCallback(
    (newFilters: Record<string, string>) => {
      setFilters(newFilters);
      setPage(0);
    },
    [setFilters, setPage],
  );

  const handleRowClick = useCallback(
    (item: T) => {
      onClick(item.id);
    },
    [onClick],
  );

  const handleEditClick = useCallback(
    (item: T) => {
      handleEdit(item);
    },
    [handleEdit],
  );

  const handleDeleteClick = useCallback(
    (id: string) => {
      deleteItem(id);
    },
    [deleteItem],
  );

  const handleBatchDelete = useCallback(
    async (ids: string[]) => {
      if (batchDelete) {
        await batchDelete(ids);
      }
    },
    [batchDelete],
  );

  return (
    <div className="w-full">
      <DataTable
        data={items}
        columns={transformedColumns}
        totalItems={totalItems}
        loading={loading}
        error={error}
        page={page}
        pageSize={rowsPerPage}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        sortBy={orderBy}
        sortOrder={order}
        onSortChange={handleSortChange}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        filters={filters}
        filterConfig={filterConfig}
        onFiltersChange={handleFiltersChange}
        onRowClick={handleRowClick}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onNew={handleNew}
        enableBatchActions={enableBatchActions}
        batchActions={transformedBatchActions}
        onBatchDelete={handleBatchDelete}
        rowActions={transformedRowActions}
      />
    </div>
  );
};

export default ListView;
