import type { PipelineInterface, WorkspaceEnvironmentInterface, WorkspaceInterface } from '@loopstack/contracts/api';
import PageBreadcrumbs, { type BreadCrumbsData } from '@/components/page/PageBreadcrumbs.tsx';
import { useWorkspace } from '@/hooks/useWorkspaces.ts';
import WorkflowList from './WorkflowList.tsx';
import { WorkbenchFilesPanel } from './components/WorkbenchFilesPanel.tsx';
import { WorkbenchFloatingPanel } from './components/WorkbenchFloatingPanel.tsx';
import { WorkbenchFlowPanel } from './components/WorkbenchFlowPanel.tsx';
import { WorkbenchIconSidebar } from './components/WorkbenchIconSidebar.tsx';
import { WorkbenchPreviewPanel } from './components/WorkbenchPreviewPanel.tsx';
import { RemoteFileExplorerProvider } from './providers/RemoteFileExplorerProvider';
import { ScrollProvider } from './providers/ScrollProvider.tsx';
import { WorkbenchLayoutProvider, useWorkbenchLayout } from './providers/WorkbenchLayoutProvider.tsx';

function WorkbenchContent({
  pipeline,
  breadcrumbData,
}: {
  pipeline: PipelineInterface;
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
              <WorkflowList pipeline={pipeline} />
            </div>
          </ScrollProvider>
        </div>
      </div>
    </div>
  );
}

function WorkbenchInner({
  pipeline,
  breadcrumbData,
}: {
  pipeline: PipelineInterface;
  breadcrumbData?: BreadCrumbsData[];
}) {
  const { activeSidePanel } = useWorkbenchLayout();

  return (
    <div className="flex h-full w-full">
      <div className="relative flex flex-1 overflow-hidden">
        <div className={activeSidePanel ? 'w-1/2 overflow-hidden' : 'w-full overflow-hidden'}>
          <WorkbenchContent pipeline={pipeline} breadcrumbData={breadcrumbData} />
        </div>
        {activeSidePanel === 'preview' && <WorkbenchPreviewPanel />}
        {activeSidePanel === 'flow' && <WorkbenchFlowPanel />}
        {activeSidePanel === 'files' && <WorkbenchFilesPanel />}
        <WorkbenchFloatingPanel />
      </div>
      <WorkbenchIconSidebar />
    </div>
  );
}

export default function Workbench({
  pipeline,
  breadcrumbData,
  previewPanelOpen,
  onPreviewPanelOpenChange,
  isDeveloperMode,
  getPreviewUrl,
  getEnvironmentPreviewUrl,
  environments,
}: {
  pipeline: PipelineInterface;
  breadcrumbData?: BreadCrumbsData[];
  previewPanelOpen?: boolean;
  onPreviewPanelOpenChange?: (open: boolean) => void;
  isDeveloperMode?: boolean;
  getPreviewUrl?: (pipelineId: string) => string;
  getEnvironmentPreviewUrl?: (env: WorkspaceEnvironmentInterface, pipelineId?: string) => string;
  environments?: WorkspaceEnvironmentInterface[];
}) {
  const workspaceId = pipeline?.workspaceId;
  const fetchWorkspace = useWorkspace(workspaceId);

  const fileExplorerEnabled =
    fetchWorkspace.data?.features?.fileExplorer?.enabled &&
    fetchWorkspace.data?.features?.fileExplorer?.environments?.includes(environments?.[0]?.slotId ?? '');

  const workspaceConfig: Pick<WorkspaceInterface, 'volumes' | 'features'> | undefined = fetchWorkspace.data
    ? {
        volumes: fetchWorkspace.data.volumes,
        features: fetchWorkspace.data.features,
      }
    : undefined;

  const resolvedEnvironments = environments ?? fetchWorkspace.data?.environments;

  return (
    <WorkbenchLayoutProvider
      pipeline={pipeline}
      isDeveloperMode={isDeveloperMode}
      workspaceConfig={workspaceConfig}
      getPreviewUrl={getPreviewUrl}
      getEnvironmentPreviewUrl={getEnvironmentPreviewUrl}
      environments={resolvedEnvironments}
      previewPanelOpen={previewPanelOpen}
      onPreviewPanelOpenChange={onPreviewPanelOpenChange}
    >
      {fileExplorerEnabled ? (
        <RemoteFileExplorerProvider>
          <WorkbenchInner pipeline={pipeline} breadcrumbData={breadcrumbData} />
        </RemoteFileExplorerProvider>
      ) : (
        <WorkbenchInner pipeline={pipeline} breadcrumbData={breadcrumbData} />
      )}
    </WorkbenchLayoutProvider>
  );
}
