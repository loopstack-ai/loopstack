import { ArrowRight, Home, Loader2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import type { WorkspaceActionInterface } from '@loopstack/contracts/api';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import { Button } from '@/components/ui/button.tsx';
import MainLayout from '../components/layout/MainLayout.tsx';
import WorkspaceHomePage from '../features/workspaces/components/WorkspaceHomePage.tsx';
import { useWorkspaceConfig } from '../hooks/useConfig.ts';
import { useWorkspace } from '../hooks/useWorkspaces.ts';
import { useStudio } from '../providers/StudioProvider.tsx';

const WorkspacePage = () => {
  const { router } = useStudio();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const fetchWorkspace = useWorkspace(workspaceId);
  const fetchWorkspaceConfigs = useWorkspaceConfig();

  const workspace = fetchWorkspace.data;

  const startFormAction: WorkspaceActionInterface | undefined = (() => {
    if (!workspace || !fetchWorkspaceConfigs.data) return undefined;
    const config = fetchWorkspaceConfigs.data.find((c) => c.blockName === workspace.blockName);
    const uiTyped = config?.ui as
      | { widgets?: WorkspaceActionInterface[]; actions?: WorkspaceActionInterface[] }
      | undefined;
    return (uiTyped?.widgets ?? uiTyped?.actions)?.find((a) => a.widget === 'start-form');
  })();

  const breadcrumbData = [
    {
      label: 'Dashboard',
      href: router.getDashboard(),
      icon: <Home className="h-4 w-4" />,
    },
    { label: 'Workspaces', href: router.getWorkspaces() },
    { label: workspace?.title ?? '', current: true },
  ];

  const isLoading = fetchWorkspace.isLoading || fetchWorkspaceConfigs.isLoading;

  return (
    <MainLayout breadcrumbsData={breadcrumbData}>
      <>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{workspace?.title ?? ''}</h1>
          {workspaceId && (
            <Button variant="outline" size="sm" asChild>
              <Link to={router.getWorkspaceRuns(workspaceId)}>
                Runs
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>

        {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : ''}
        <ErrorSnackbar error={fetchWorkspace.error} />
        <ErrorSnackbar error={fetchWorkspaceConfigs.error} />

        {workspace && startFormAction ? (
          <WorkspaceHomePage workspace={workspace} action={startFormAction} />
        ) : workspace && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground mb-4">No home page configured for this workspace.</p>
            {workspaceId && (
              <Button variant="default" asChild>
                <Link to={router.getWorkspaceRuns(workspaceId)}>
                  Go to Runs
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        ) : null}
      </>
    </MainLayout>
  );
};

export default WorkspacePage;
