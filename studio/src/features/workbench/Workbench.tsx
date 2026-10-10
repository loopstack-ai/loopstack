import type { WorkflowFullInterface, WorkspaceEnvironmentInterface } from '@loopstack/contracts/api';
import PageBreadcrumbs, { type BreadCrumbsData } from '@/components/page/PageBreadcrumbs.tsx';
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
}: {
  workflow: WorkflowFullInterface;
  breadcrumbData?: BreadCrumbsData[];
  getPreviewUrl?: (workflowId: string) => string;
  getEnvironmentPreviewUrl?: (env: WorkspaceEnvironmentInterface, workflowId?: string) => string;
}) {
  const workspaceId = workflow?.workspaceId;

  return (
    <WorkbenchLayoutProvider
      workspaceId={workspaceId}
      workflow={workflow}
      getPreviewUrl={getPreviewUrl}
      getEnvironmentPreviewUrl={getEnvironmentPreviewUrl}
    >
      <WorkbenchSidebarShell>
        <WorkbenchContent workflow={workflow} breadcrumbData={breadcrumbData} />
      </WorkbenchSidebarShell>
    </WorkbenchLayoutProvider>
  );
}
