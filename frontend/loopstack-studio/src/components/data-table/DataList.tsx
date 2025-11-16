import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Loader2, Trash2 } from 'lucide-react';
import type { BatchAction, RowAction } from './data-table.ts';
import DataTableBatchActions from './DataTableBatchAction';
import DataTableFilters from './DataTableFilters';
import ConfirmDialog from './ConfirmDialog';
import DataTablePagination from './DataTablePagination';
import DataTableToolbar from './DataTableToolbar';
import type { DataListProps } from './data-list.ts';

export function DataList<T extends { id: string }>({
  data,
  totalItems,
  loading = false,
  error,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  searchTerm,
  onSearchChange,
  filters = {},
  filterConfig = {},
  onFiltersChange,
  onRowClick,
  onNew,
  enableBatchActions = true,
  batchActions = [],
  onBatchDelete,
  rowActions = [],
  itemRenderer,
  newButtonLabel
}: DataListProps<T>) {
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

  // const handleDeleteClick = (id: string) => {
  //   setDeleteDialog({ isOpen: true, type: 'single', itemId: id });
  // };

  const handleBatchDeleteClick = () => {
    setDeleteDialog({ isOpen: true, type: 'batch' });
  };

  const handleDeleteConfirm = async () => {
    if (deleteDialog.type === 'single' && deleteDialog.itemId) {
      // await onDelete?.(deleteDialog.itemId);
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

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // Build the list of default actions
  const defaultActions: RowAction<T>[] = [];

  // Combine default and custom actions
  const allRowActions = [...defaultActions, ...rowActions];

  // Check if we should show the actions column
  const showActionsColumn = allRowActions.length > 0;

  return (
    <div className="space-y-4">
      <DataTableToolbar
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        onFilterToggle={() => setIsFilterOpen(!isFilterOpen)}
        onNew={onNew}
        filterCount={activeFilterCount}
        isFilterOpen={isFilterOpen}
        newButtonLabel={newButtonLabel}
        showFilter={!!onFiltersChange && Object.keys(filterConfig).length > 0}
        showSearch={!!onSearchChange}
      >
        <div className="text-sm text-gray-400">
          <Checkbox
            checked={selectedRows.length === data.length && data.length > 0}
            onCheckedChange={toggleSelectAll}
            aria-label="Select all rows"
            className="mr-4"
          />
          Select All
        </div>

        <div>
          {enableBatchActions && (
            <DataTableBatchActions
              selectedCount={selectedRows.length}
              batchActions={allBatchActions}
              onBatchAction={handleBatchAction}
            />
          )}
          <DataTableFilters
            filters={filters}
            filterConfig={filterConfig}
            onFiltersChange={onFiltersChange}
            isOpen={isFilterOpen}
          />
        </div>
      </DataTableToolbar>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-destructive font-medium">Error: {error.message}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div>
            {data.length === 0 ? (
              <span>No items found</span>
            ) : (
              data.map((item) => (
                <div className="flex items-center">
                  {enableBatchActions && (
                    <div
                      className="pr-4 flex items-center justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedRows.includes(item.id)}
                        onCheckedChange={() => toggleSelectRow(item.id)}
                        aria-label={`Select row ${item.id}`}
                      />
                    </div>
                  )}
                  <Card key={item.id} className="hover:shadow-md transition-shadow flex-grow my-2">
                    <CardContent className="px-6">
                      <div className="flex items-center justify-between">
                        <div
                          className={`flex-1 ${onRowClick ? 'cursor-pointer' : ''} ${
                            selectedRows.includes(item.id) ? 'bg-muted/50' : ''
                          }`}
                          onClick={onRowClick ? () => onRowClick(item) : undefined}
                        >
                          <div>{itemRenderer && itemRenderer(item)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {showActionsColumn && (
                    <div
                      className="flex items-center justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
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
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

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
