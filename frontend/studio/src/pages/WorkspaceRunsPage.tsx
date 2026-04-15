import { Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import type { WorkspaceInterface } from '@loopstack/contracts/api';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import MainLayout from '../components/layout/MainLayout.tsx';
import { WorkbenchSidebarShell } from '../features/workbench/components/WorkbenchSidebarShell.tsx';
import { WorkbenchLayoutProvider } from '../features/workbench/providers/WorkbenchLayoutProvider.tsx';
import ExecutionTimeline from '../features/workspaces/components/ExecutionTimeline.tsx';
import { useDefaultEnvironmentPreviewUrl } from '../hooks/useEnvironmentPreviewUrl.ts';
import { useWorkspace } from '../hooks/useWorkspaces.ts';
import { useStudio } from '../providers/StudioProvider.tsx';

const WorkspaceRunsPage = () => {
  const { router } = useStudio();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const fetchWorkspace = useWorkspace(workspaceId);
  const getEnvironmentPreviewUrl = useDefaultEnvironmentPreviewUrl();

  const workspace = fetchWorkspace.data;

  const breadcrumbData = [
    { label: 'Workspaces', href: router.getWorkspaces() },
    {
      label: workspace?.title ?? '',
      href: workspaceId ? router.getWorkspace(workspaceId) : undefined,
    },
    { label: 'Runs', current: true },
  ];

  const workspaceConfig: Pick<WorkspaceInterface, 'volumes' | 'features'> | undefined = workspace
    ? { volumes: workspace.volumes, features: workspace.features }
    : undefined;

  return (
    <WorkbenchLayoutProvider
      workspaceId={workspaceId!}
      environments={workspace?.environments}
      workspaceConfig={workspaceConfig}
      getEnvironmentPreviewUrl={getEnvironmentPreviewUrl}
    >
      <WorkbenchSidebarShell>
        <MainLayout breadcrumbsData={breadcrumbData}>
          <>
            <h1 className="mb-4 text-3xl font-bold tracking-tight">{workspace?.title ?? ''} — Runs</h1>
            {fetchWorkspace.isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : ''}
            <ErrorSnackbar error={fetchWorkspace.error} />

            {workspace ? <ExecutionTimeline workspace={workspace} /> : ''}
          </>
        </MainLayout>
      </WorkbenchSidebarShell>
    </WorkbenchLayoutProvider>
  );
};

export default WorkspaceRunsPage;
