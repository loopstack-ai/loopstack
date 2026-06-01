import { useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import type { DataTableColumn } from '@/components/data-table/data-table';
import MainLayout from '@/components/layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { useAppsConfig } from '@/hooks/useConfig';
import { useStudio } from '@/providers/StudioProvider';

interface WorkflowTypeRow {
  id: string;
  workflowName: string;
  title?: string;
  description?: string;
  appBlockName: string;
}

export default function DebugWorkflowsPage() {
  const { router } = useStudio();
  const { data: appsConfig, isLoading } = useAppsConfig();

  const data: WorkflowTypeRow[] = useMemo(() => {
    if (!appsConfig) return [];

    return appsConfig.flatMap((app) =>
      app.controllers.flatMap((ctrl) =>
        ctrl.endpoints.map((ep) => ({
          id: `${app.appName}::${ep.workflowName}`,
          workflowName: ep.workflowName,
          title: ep.title,
          description: ep.description,
          appBlockName: app.appName,
        })),
      ),
    );
  }, [appsConfig]);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('workflowName');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const filteredData = useMemo(() => {
    let result = data;

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.workflowName?.toLowerCase().includes(lowerTerm) ||
          item.title?.toLowerCase().includes(lowerTerm) ||
          item.description?.toLowerCase().includes(lowerTerm) ||
          item.appBlockName.toLowerCase().includes(lowerTerm),
      );
    }

    result = [...result].sort((a, b) => {
      const key = sortBy as keyof Pick<WorkflowTypeRow, 'workflowName' | 'title' | 'description' | 'appBlockName'>;
      const valA = (a[key] || '').toLowerCase();
      const valB = (b[key] || '').toLowerCase();

      if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
      if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, searchTerm, sortBy, sortOrder]);

  const paginatedData = useMemo(() => {
    const start = page * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const columns: DataTableColumn<WorkflowTypeRow>[] = [
    {
      id: 'workflowName',
      label: 'Type ID (Alias)',
      sortable: true,
      minWidth: 200,
      format: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      id: 'title',
      label: 'Title',
      sortable: true,
      format: (value, row) => <span>{String(value || row.workflowName || 'N/A')}</span>,
    },
    {
      id: 'appBlockName',
      label: 'App Type',
      sortable: true,
      format: (value) => <Badge variant="outline">{String(value)}</Badge>,
    },
    {
      id: 'description',
      label: 'Description',
      sortable: true,
      format: (value) => <span className="text-muted-foreground max-w-xs truncate block">{String(value || '-')}</span>,
    },
  ];

  const breadcrumbsData = [{ label: 'Debug Workflows', current: true }];

  return (
    <MainLayout breadcrumbsData={breadcrumbsData}>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Workflow Types</h1>
      <DataTable
        data={paginatedData}
        columns={columns}
        loading={isLoading}
        totalItems={filteredData.length}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        page={page}
        pageSize={pageSize}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(0);
        }}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
        }}
        filters={{}}
        onFiltersChange={() => {}}
        enableBatchActions={false}
        onRowClick={(row) => void router.navigateToDebugWorkflow(row.id)}
      />
    </MainLayout>
  );
}
