import React, { useCallback } from 'react';
import type { ReactElement } from 'react';
import { DataList } from '../data-table/DataList.tsx';
import type { BatchAction, RowAction } from '../data-table/data-table.ts';

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
  filterConfig?: Record<string, string[]>;
  onClick: (id: string) => void;
  handleNew: () => void;
  setPage: (page: number) => void;
  setRowsPerPage: (rows: number) => void;
  setSearchTerm?: (search: string) => void;
  setFilters?: (filters: Record<string, string>) => void;
  searchTerm?: string | undefined;
  filters?: Record<string, string>;
  page: number;
  rowsPerPage: number;
  batchActions?: OriginalBatchAction[];
  batchDelete?: (ids: string[]) => void | Promise<void>;
  enableBatchActions?: boolean;
  rowActions?: OriginalRowAction<T>[];
  itemRenderer?: (item: T) => ReactElement;
  newButtonLabel?: string;
}

const ListView = <T extends Item>({
  loading,
  error,
  items,
  totalItems,
  filterConfig,
  onClick,
  handleNew,
  setPage,
  setRowsPerPage,
  setSearchTerm,
  setFilters,
  searchTerm = '',
  filters,
  page,
  rowsPerPage,
  batchActions = [],
  batchDelete,
  enableBatchActions = true,
  rowActions = [],
  itemRenderer,
  newButtonLabel,
}: ListViewProps<T>) => {
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

  const handleSearchChange = useCallback(
    (term: string) => {
      setSearchTerm?.(term);
      setPage(0);
    },
    [setSearchTerm, setPage],
  );

  const handleFiltersChange = useCallback(
    (newFilters: Record<string, string>) => {
      setFilters?.(newFilters);
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
      <DataList
        data={items}
        totalItems={totalItems}
        loading={loading}
        error={error}
        page={page}
        pageSize={rowsPerPage}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm ? handleSearchChange : undefined}
        filters={filters}
        filterConfig={filterConfig}
        onFiltersChange={setFilters ? handleFiltersChange : undefined}
        onRowClick={handleRowClick}
        onNew={handleNew}
        enableBatchActions={enableBatchActions}
        batchActions={transformedBatchActions}
        onBatchDelete={handleBatchDelete}
        rowActions={transformedRowActions}
        itemRenderer={itemRenderer}
        newButtonLabel={newButtonLabel}
      />
    </div>
  );
};

export default ListView;
