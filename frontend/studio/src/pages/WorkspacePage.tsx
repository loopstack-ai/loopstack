import { Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import type { WorkspaceActionInterface } from '@loopstack/contracts/api';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import MainLayout from '../components/layout/MainLayout.tsx';
import { WorkbenchSidebarShell } from '../features/workbench/components/WorkbenchSidebarShell.tsx';
import { WorkbenchLayoutProvider } from '../features/workbench/providers/WorkbenchLayoutProvider.tsx';
import WorkspaceHomePage from '../features/workspaces/components/WorkspaceHomePage.tsx';
import { useAppsConfig } from '../hooks/useConfig.ts';
import { useDefaultEnvironmentPreviewUrl } from '../hooks/useEnvironmentPreviewUrl.ts';
import { useWorkspace } from '../hooks/useWorkspaces.ts';
import { useStudio } from '../providers/StudioProvider.tsx';

const WorkspacePage = () => {
  const { router } = useStudio();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const fetchWorkspace = useWorkspace(workspaceId);
  const fetchAppsConfig = useAppsConfig();
  const getEnvironmentPreviewUrl = useDefaultEnvironmentPreviewUrl();

  const workspace = fetchWorkspace.data;

  // Start form action: not yet supported for controller-based apps
  const startFormAction: WorkspaceActionInterface | undefined = undefined;

  const breadcrumbData = [
    { label: 'Workspaces', href: router.getWorkspaces() },
    { label: workspace?.title ?? '', current: true },
  ];

  const isLoading = fetchWorkspace.isLoading || fetchAppsConfig.isLoading;

  return (
    <WorkbenchLayoutProvider workspaceId={workspaceId!} getEnvironmentPreviewUrl={getEnvironmentPreviewUrl}>
      <WorkbenchSidebarShell>
        <MainLayout breadcrumbsData={breadcrumbData}>
          <>
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : ''}
            <ErrorSnackbar error={fetchWorkspace.error} />
            <ErrorSnackbar error={fetchAppsConfig.error} />

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
