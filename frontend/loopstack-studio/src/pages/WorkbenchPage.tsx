import { useParams } from 'react-router-dom';
import { Home, Loader2 } from 'lucide-react';
import ErrorSnackbar from '@/components/snackbars/ErrorSnackbar.tsx';
import Workbench from '@/features/workbench/Workbench.tsx';
import MainLayout from '../components/layout/MainLayout.tsx';
import { usePipeline } from '../hooks/usePipelines.ts';
import { useWorkspace } from '../hooks/useWorkspaces.ts';
import { useStudio } from '../providers/StudioProvider.tsx';

export default function WorkbenchPage() {
  const { router } = useStudio();

  const { pipelineId } = useParams<{ pipelineId: string }>();
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
      label: `Run #${fetchPipeline.data?.run} ${fetchPipeline.data?.title ? `(${fetchPipeline.data?.title}})` : ''}`,
    },
  ];

  return (
    <MainLayout breadcrumbsData={breadcrumbData}>
      <>
        {fetchPipeline.isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : ''}
        <ErrorSnackbar error={fetchPipeline.error} />

        {fetchPipeline.data ? <Workbench pipeline={fetchPipeline.data} /> : ''}
      </>
    </MainLayout>
  );
}
