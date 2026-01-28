import { useQueries } from '@tanstack/react-query';
import { Home } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PipelineConfigDto } from '@loopstack/api-client';
import { DataTable } from '@/components/data-table/DataTable';
import type { DataTableColumn } from '@/components/data-table/data-table';
import MainLayout from '@/components/layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { useApiClient } from '@/hooks/useApi';
import { useWorkspaceConfig } from '@/hooks/useConfig';
import { useStudio } from '@/providers/StudioProvider';

interface PipelineTypeRow extends PipelineConfigDto {
  id: string;
  workspaceBlockName: string;
}

export default function DebugWorkflowsPage() {
  const { router } = useStudio();
  const { envKey, api } = useApiClient();
  const { data: workspaceTypes, isLoading: isLoadingWorkspaces } = useWorkspaceConfig();

  const pipelineQueries = useQueries({
    queries: (workspaceTypes ?? []).map((wt) => ({
      queryKey: ['pipeline-types', wt.blockName, envKey],
      queryFn: async () => {
        if (!api) throw new Error('API not available');
        const res = await api.ApiV1ConfigApi.configControllerGetPipelineTypesByWorkspace({
          workspaceBlockName: wt.blockName,
        });
        return { workspaceBlockName: wt.blockName, types: res.data };
      },
      enabled: !!workspaceTypes?.length,
    })),
  });

  const isLoadingPipelines = pipelineQueries.some((q) => q.isLoading);
  const isLoading = isLoadingWorkspaces || isLoadingPipelines;

  const data: PipelineTypeRow[] = useMemo(() => {
    if (isLoading || !pipelineQueries) return [];

    return pipelineQueries.flatMap((q) => {
      if (!q.data) return [];
      const { workspaceBlockName, types } = q.data;
      return (types ?? []).map((pt) => ({
        ...pt,
        id: `${workspaceBlockName}::${pt.blockName}`,
        workspaceBlockName,
      }));
    });
  }, [pipelineQueries, isLoading]);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('blockName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredData = useMemo(() => {
    let result = data;

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.blockName?.toLowerCase().includes(lowerTerm) ||
          item.title?.toLowerCase().includes(lowerTerm) ||
          item.description?.toLowerCase().includes(lowerTerm) ||
          item.workspaceBlockName.toLowerCase().includes(lowerTerm),
      );
    }

    result = [...result].sort((a, b) => {
      const key = sortBy as keyof Pick<PipelineTypeRow, 'blockName' | 'title' | 'description' | 'workspaceBlockName'>;
      const valA = (a[key] || '').toLowerCase();
      const valB = (b[key] || '').toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, searchTerm, sortBy, sortOrder]);

  const columns: DataTableColumn<PipelineTypeRow>[] = [
    {
      id: 'blockName',
      label: 'Type ID (Block Name)',
      sortable: true,
      minWidth: 200,
      format: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      id: 'title',
      label: 'Title',
      sortable: true,
      format: (value, row) => <span>{String(value || row.blockName || 'N/A')}</span>,
    },
    {
      id: 'workspaceBlockName',
      label: 'Workspace Type',
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

  const breadcrumbsData = [
    {
      label: 'Dashboard',
      href: router.getDashboard(),
      icon: <Home className="h-4 w-4" />,
    },
    { label: 'Debug Workflows', current: true },
  ];

  return (
    <MainLayout breadcrumbsData={breadcrumbsData}>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Workflow Types</h1>
      <DataTable
        data={filteredData}
        columns={columns}
        loading={isLoading}
        totalItems={filteredData.length}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        page={1}
        pageSize={filteredData.length > 0 ? filteredData.length : 10}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
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
