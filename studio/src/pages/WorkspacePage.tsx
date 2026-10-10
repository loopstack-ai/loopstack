import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { WorkspaceActionInterface } from '@loopstack/contracts/api';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import MainLayout from '../components/layout/MainLayout.tsx';
import { FeatureRegistryProvider } from '../features/feature-registry';
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

  // Home page: build a launch card per `start-form` widget the app declares (@StudioApp ui.widgets),
  // resolving each referenced workflow's schema so its args render on the card.
  const startFormActions: WorkspaceActionInterface[] = useMemo(() => {
    const app = fetchAppsConfig.data?.find((a) => a.appName === workspace?.appName);
    const widgets = app?.ui?.widgets ?? [];
    return widgets
      .filter((w) => w.widget === 'start-form')
      .map((w) => {
        const workflowName = w.options?.workflow as string | undefined;
        const workflow = app?.workflows.find((x) => x.workflowName === workflowName);
        return { widget: 'start-form', options: { ...w.options, schema: workflow?.schema } };
      });
  }, [fetchAppsConfig.data, workspace?.appName]);

  const breadcrumbData = [
    { label: 'Workspaces', href: router.getWorkspaces() },
    { label: workspace?.title ?? '', current: true },
  ];

  const isLoading = fetchWorkspace.isLoading || fetchAppsConfig.isLoading;

  if (!workspace) {
    return (
      <MainLayout breadcrumbsData={breadcrumbData}>
        {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : null}
        <ErrorSnackbar error={fetchWorkspace.error} />
        <ErrorSnackbar error={fetchAppsConfig.error} />
      </MainLayout>
    );
  }

  return (
    <FeatureRegistryProvider appName={workspace.appName}>
      <WorkbenchLayoutProvider workspaceId={workspaceId!} getEnvironmentPreviewUrl={getEnvironmentPreviewUrl}>
        <WorkbenchSidebarShell>
          <MainLayout breadcrumbsData={breadcrumbData}>
            <ErrorSnackbar error={fetchAppsConfig.error} />
            {startFormActions.length > 0 ? (
              <WorkspaceHomePage workspace={workspace} actions={startFormActions} />
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-muted-foreground">No home page configured for this workspace.</p>
              </div>
            )}
          </MainLayout>
        </WorkbenchSidebarShell>
      </WorkbenchLayoutProvider>
    </FeatureRegistryProvider>
  );
};

export default WorkspacePage;
