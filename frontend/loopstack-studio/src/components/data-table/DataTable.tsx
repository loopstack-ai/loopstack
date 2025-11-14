import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Loader2, ArrowUp, ArrowDown, Eye, Edit, Trash2 } from 'lucide-react';
import type { DataTableProps, BatchAction, RowAction } from './data-table.ts';
import DataTableBatchActions from '../data-table/DataTableBatchAction';
import DataTableFilters from '../data-table/DataTableFilters';
import ConfirmDialog from '../data-table/ConfirmDialog';
import DataTablePagination from '../data-table/DataTablePagination';
import DataTableToolbar from '../data-table/DataTableToolbar';

export function DataTable<T extends { id: string }>({
  title = 'Data Table',
  data,
  columns,
  totalItems,
  loading = false,
  error,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sortBy,
  sortOrder,
  onSortChange,
  searchTerm,
  onSearchChange,
  filters = {},
  filterConfig = {},
  onFiltersChange,
  onRowClick,
  onEdit,
  onDelete,
  onNew,
  enableBatchActions = true,
  batchActions = [],
  onBatchDelete,
  rowActions = []
}: DataTableProps<T>) {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: 'single' | 'batch';
    itemId?: string;
  }>({ isOpen: false, type: 'single' });

  const toggleSelectAll = () => {
    if (selectedRows.length === data.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(data.map((item) => item.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedRows([]);

  const handleSort = (columnId: string) => {
    if (sortBy === columnId) {
      onSortChange(columnId, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(columnId, 'asc');
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteDialog({ isOpen: true, type: 'single', itemId: id });
  };

  const handleBatchDeleteClick = () => {
    setDeleteDialog({ isOpen: true, type: 'batch' });
  };

  const handleDeleteConfirm = async () => {
    if (deleteDialog.type === 'single' && deleteDialog.itemId) {
      await onDelete?.(deleteDialog.itemId);
    } else if (deleteDialog.type === 'batch') {
      await onBatchDelete?.(selectedRows);
      clearSelection();
    }
    setDeleteDialog({ isOpen: false, type: 'single' });
  };

  const allBatchActions: BatchAction[] = [
    ...(onBatchDelete
      ? [
          {
            id: 'delete',
            label: 'Delete Selected',
            icon: <Trash2 className="h-4 w-4 mr-2" />,
            variant: 'destructive' as const,
            action: handleBatchDeleteClick
          }
        ]
      : []),
    ...batchActions
  ];

  const handleBatchAction = async (action: BatchAction) => {
    if (action.id === 'delete') {
      handleBatchDeleteClick();
    } else {
      await action.action(selectedRows);
      clearSelection();
    }
  };

  const getSortIcon = (columnId: string) => {
    if (sortBy !== columnId) return null;
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // Build the list of default actions
  const defaultActions: RowAction<T>[] = [
    ...(onRowClick
      ? [
          {
            id: 'view',
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            variant: 'ghost' as const,
            action: onRowClick
          }
        ]
      : []),
    ...(onEdit
      ? [
          {
            id: 'edit',
            label: 'Edit',
            icon: <Edit className="h-4 w-4" />,
            variant: 'ghost' as const,
            action: onEdit
          }
        ]
      : []),
    ...(onDelete
      ? [
          {
            id: 'delete',
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            variant: 'ghost' as const,
            action: (item: T) => handleDeleteClick(item.id)
          }
        ]
      : [])
  ];

  // Combine default and custom actions
  const allRowActions = [...defaultActions, ...rowActions];

  // Check if we should show the actions column
  const showActionsColumn = allRowActions.length > 0;

  return (
    <div className="space-y-4">
      <DataTableToolbar
        title={title}
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        onFilterToggle={() => setIsFilterOpen(!isFilterOpen)}
        onNew={onNew}
        filterCount={activeFilterCount}
        isFilterOpen={isFilterOpen}
        showFilter={!!onFiltersChange && Object.keys(filterConfig).length > 0}
        showSearch={!!onSearchChange}
      />

      <DataTableFilters
        filters={filters}
        filterConfig={filterConfig}
        onFiltersChange={onFiltersChange}
        isOpen={isFilterOpen}
      />

      {enableBatchActions && (
        <DataTableBatchActions
          selectedCount={selectedRows.length}
          batchActions={allBatchActions}
          onBatchAction={handleBatchAction}
        />
      )}

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-destructive font-medium">Error: {error.message}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="px-6 py-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {enableBatchActions && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedRows.length === data.length && data.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all rows"
                      />
                    </TableHead>
                  )}
                  {columns.map((column) => (
                    <TableHead
                      key={column.id}
                      className={`${
                        column.align === 'center'
                          ? 'text-center'
                          : column.align === 'right'
                          ? 'text-right'
                          : ''
                      }`}
                      style={{ minWidth: column.minWidth }}
                    >
                      {column.sortable !== false ? (
                        <Button
                          variant="ghost"
                          onClick={() => handleSort(column.id)}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          {column.label}
                          {getSortIcon(column.id)}
                        </Button>
                      ) : (
                        <span className="font-semibold">{column.label}</span>
                      )}
                    </TableHead>
                  ))}
                  {showActionsColumn && <TableHead className="text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        columns.length + (enableBatchActions ? 1 : 0) + (showActionsColumn ? 1 : 0)
                      }
                      className="text-center py-8 text-muted-foreground"
                    >
                      No items found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item) => (
                    <TableRow
                      key={item.id}
                      className={`${onRowClick ? 'cursor-pointer' : ''} ${
                        selectedRows.includes(item.id) ? 'bg-muted/50' : ''
                      }`}
                      onClick={onRowClick ? () => onRowClick(item) : undefined}
                    >
                      {enableBatchActions && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedRows.includes(item.id)}
                            onCheckedChange={() => toggleSelectRow(item.id)}
                            aria-label={`Select row ${item.id}`}
                          />
                        </TableCell>
                      )}
                      {columns.map((column) => (
                        <TableCell
                          key={column.id}
                          className={
                            column.align === 'center'
                              ? 'text-center'
                              : column.align === 'right'
                              ? 'text-right'
                              : ''
                          }
                        >
                          {column.format
                            ? column.format((item as any)[column.id], item)
                            : String((item as any)[column.id] || '')}
                        </TableCell>
                      ))}
                      {showActionsColumn && (
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {allRowActions.map((action) => {
                              // Check if action should be shown based on condition
                              const shouldShow = action.condition ? action.condition(item) : true;

                              if (!shouldShow) return null;

                              return (
                                <Button
                                  key={action.id}
                                  variant={action.variant || 'ghost'}
                                  size="sm"
                                  onClick={() => action.action(item)}
                                  disabled={action.disabled?.(item)}
                                  title={action.label}
                                  className={action.className}
                                >
                                  {action.icon}
                                </Button>
                              );
                            })}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onOpenChange={(open: any) => setDeleteDialog({ ...deleteDialog, isOpen: open })}
        title={deleteDialog.type === 'single' ? 'Delete Item' : 'Delete Items'}
        description={
          deleteDialog.type === 'single'
            ? 'Are you sure you want to delete this item? This action cannot be undone.'
            : `Are you sure you want to delete ${selectedRows.length} items? This action cannot be undone.`
        }
        onConfirm={handleDeleteConfirm}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
