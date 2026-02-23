import { Home } from 'lucide-react';
import { useParams } from 'react-router-dom';
import ErrorSnackbar from '@/components/snackbars/ErrorSnackbar.tsx';
import Workbench from '@/features/workbench/Workbench.tsx';
import LoadingCentered from '../components/LoadingCentered.tsx';
import MainLayout from '../components/layout/MainLayout.tsx';
import { usePipeline } from '../hooks/usePipelines.ts';
import { useWorkspace } from '../hooks/useWorkspaces.ts';
import { requireParam } from '../lib/requireParam.ts';
import { useStudio } from '../providers/StudioProvider.tsx';

export default function WorkbenchPage() {
  const { router } = useStudio();
  const params = useParams<{ pipelineId: string }>();
  const pipelineId = requireParam(params, 'pipelineId');

  const fetchPipeline = usePipeline(pipelineId);
  const workspaceId = fetchPipeline.data?.workspaceId;
  const fetchWorkspace = useWorkspace(workspaceId);

  const breadcrumbData = [
    { label: 'Dashboard', href: router.getDashboard(), icon: <Home className="h-4 w-4" /> },
    { label: 'Workspaces', href: router.getWorkspaces() },
    {
      label: fetchWorkspace.data?.title ?? '',
      href: workspaceId ? router.getWorkspace(workspaceId) : undefined,
    },
    {
      label: `Run #${fetchPipeline.data?.run}${fetchPipeline.data?.title ? ` (${fetchPipeline.data.title})` : ''}`,
    },
  ];

  return (
    <MainLayout breadcrumbsData={breadcrumbData}>
      <ErrorSnackbar error={fetchPipeline.error} />
      <LoadingCentered loading={fetchPipeline.isLoading}>
        {fetchPipeline.data ? (
          <Workbench pipeline={fetchPipeline.data} />
        ) : !fetchPipeline.isLoading && !fetchPipeline.error ? (
          <p className="text-muted-foreground py-8 text-center text-sm">Pipeline not found.</p>
        ) : null}
      </LoadingCentered>
    </MainLayout>
  );
}
