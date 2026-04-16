import { Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import type { WorkspaceActionInterface, WorkspaceInterface } from '@loopstack/contracts/api';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import MainLayout from '../components/layout/MainLayout.tsx';
import { WorkbenchSidebarShell } from '../features/workbench/components/WorkbenchSidebarShell.tsx';
import { WorkbenchLayoutProvider } from '../features/workbench/providers/WorkbenchLayoutProvider.tsx';
import WorkspaceHomePage from '../features/workspaces/components/WorkspaceHomePage.tsx';
import { useWorkspaceConfig } from '../hooks/useConfig.ts';
import { useDefaultEnvironmentPreviewUrl } from '../hooks/useEnvironmentPreviewUrl.ts';
import { useWorkspace } from '../hooks/useWorkspaces.ts';
import { useStudio } from '../providers/StudioProvider.tsx';

const WorkspacePage = () => {
  const { router } = useStudio();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const fetchWorkspace = useWorkspace(workspaceId);
  const fetchWorkspaceConfigs = useWorkspaceConfig();
  const getEnvironmentPreviewUrl = useDefaultEnvironmentPreviewUrl();

  const workspace = fetchWorkspace.data;

  const startFormAction: WorkspaceActionInterface | undefined = (() => {
    if (!workspace || !fetchWorkspaceConfigs.data) return undefined;
    const config = fetchWorkspaceConfigs.data.find((c) => c.className === workspace.className);
    return config?.ui?.widgets?.find((a) => a.widget === 'start-form');
  })();

  const breadcrumbData = [
    { label: 'Workspaces', href: router.getWorkspaces() },
    { label: workspace?.title ?? '', current: true },
  ];

  const isLoading = fetchWorkspace.isLoading || fetchWorkspaceConfigs.isLoading;

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
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : ''}
            <ErrorSnackbar error={fetchWorkspace.error} />
            <ErrorSnackbar error={fetchWorkspaceConfigs.error} />

            {workspace && startFormAction ? (
              <WorkspaceHomePage workspace={workspace} action={startFormAction} />
            ) : workspace && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-muted-foreground">No home page configured for this workspace.</p>
              </div>
            ) : null}
          </>
        </MainLayout>
      </WorkbenchSidebarShell>
    </WorkbenchLayoutProvider>
  );
};

export default WorkspacePage;
