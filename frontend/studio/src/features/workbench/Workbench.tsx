import type {
  WorkflowFullInterface,
  WorkspaceEnvironmentInterface,
  WorkspaceInterface,
} from '@loopstack/contracts/api';
import PageBreadcrumbs, { type BreadCrumbsData } from '@/components/page/PageBreadcrumbs.tsx';
import { useWorkspace } from '@/hooks/useWorkspaces.ts';
import WorkflowList from './WorkflowList.tsx';
import { WorkbenchSidebarShell } from './components/WorkbenchSidebarShell.tsx';
import { ScrollProvider } from './providers/ScrollProvider.tsx';
import { WorkbenchLayoutProvider } from './providers/WorkbenchLayoutProvider.tsx';

function WorkbenchContent({
  workflow,
  breadcrumbData,
}: {
  workflow: WorkflowFullInterface;
  breadcrumbData?: BreadCrumbsData[];
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 gap-4 overflow-hidden md:flex-row flex-col">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b flex h-12 shrink-0 items-center">
            {breadcrumbData ? (
              <PageBreadcrumbs breadcrumbData={breadcrumbData} />
            ) : (
              <span className="px-3 text-sm font-medium">Workflows</span>
            )}
          </div>
          <ScrollProvider>
            <div className="flex-1 overflow-auto">
              <WorkflowList workflow={workflow} />
            </div>
          </ScrollProvider>
        </div>
      </div>
    </div>
  );
}

export default function Workbench({
  workflow,
  breadcrumbData,
  getPreviewUrl,
  getEnvironmentPreviewUrl,
  environments,
}: {
  workflow: WorkflowFullInterface;
  breadcrumbData?: BreadCrumbsData[];
  getPreviewUrl?: (workflowId: string) => string;
  getEnvironmentPreviewUrl?: (env: WorkspaceEnvironmentInterface, workflowId?: string) => string;
  environments?: WorkspaceEnvironmentInterface[];
}) {
  const workspaceId = workflow?.workspaceId;
  const fetchWorkspace = useWorkspace(workspaceId);

  const workspaceConfig: Pick<WorkspaceInterface, 'volumes' | 'features'> | undefined = fetchWorkspace.data
    ? {
        volumes: fetchWorkspace.data.volumes,
        features: fetchWorkspace.data.features,
      }
    : undefined;

  const resolvedEnvironments = environments ?? fetchWorkspace.data?.environments;

  return (
    <WorkbenchLayoutProvider
      workspaceId={workspaceId}
      workflow={workflow}
      workspaceConfig={workspaceConfig}
      getPreviewUrl={getPreviewUrl}
      getEnvironmentPreviewUrl={getEnvironmentPreviewUrl}
      environments={resolvedEnvironments}
    >
      <WorkbenchSidebarShell>
        <WorkbenchContent workflow={workflow} breadcrumbData={breadcrumbData} />
      </WorkbenchSidebarShell>
    </WorkbenchLayoutProvider>
  );
}
