import { useMemo } from 'react';
import type { PipelineInterface, WorkspaceEnvironmentInterface, WorkspaceInterface } from '@loopstack/contracts/api';
import PageBreadcrumbs, { type BreadCrumbsData } from '@/components/page/PageBreadcrumbs.tsx';
import { FileContentViewer } from '@/features/code-explorer/components/FileContentViewer';
import { FileTabsBar } from '@/features/code-explorer/components/FileTabsBar';
import { CodeExplorerProvider, useCodeExplorerContext } from '@/features/code-explorer/providers/CodeExplorerProvider';
import { useWorkspace } from '@/hooks/useWorkspaces.ts';
import WorkflowList from './WorkflowList.tsx';
import { WorkbenchFloatingPanel } from './components/WorkbenchFloatingPanel.tsx';
import { WorkbenchFlowPanel } from './components/WorkbenchFlowPanel.tsx';
import { WorkbenchIconSidebar } from './components/WorkbenchIconSidebar.tsx';
import { WorkbenchPreviewPanel } from './components/WorkbenchPreviewPanel.tsx';
import { ScrollProvider } from './providers/ScrollProvider.tsx';
import {
  WorkbenchContextProvider,
  WorkbenchLayoutProvider,
  useWorkbenchLayout,
} from './providers/WorkbenchLayoutProvider.tsx';

function WorkbenchContent({
  pipeline,
  breadcrumbData,
}: {
  pipeline: PipelineInterface;
  breadcrumbData?: BreadCrumbsData[];
}) {
  const { openFiles, selectedFile, fileContent, workflowConfig, isContentLoading } = useCodeExplorerContext();

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
        {openFiles.length > 0 && (
          <div className="w-full md:w-1/2 shrink-0 overflow-hidden flex flex-col">
            <FileTabsBar />
            <div className="flex-1 overflow-hidden">
              <FileContentViewer
                selectedFile={selectedFile}
                content={fileContent}
                workflowConfig={workflowConfig}
                isLoading={isContentLoading}
                className="h-full"
              />
            </div>
          </div>
        )}
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
  const { activeSidePanel, activeSectionId, setActiveSectionId } = useWorkbenchLayout();

  // Backward-compatible context value for NavigationItems
  const legacyContextValue = useMemo(
    () => ({
      state: { activeSectionId },
      setActiveSectionId,
    }),
    [activeSectionId, setActiveSectionId],
  );

  return (
    <WorkbenchContextProvider.Provider value={legacyContextValue}>
      <div className="flex h-full w-full">
        <div className="relative flex flex-1 overflow-hidden">
          <div className={activeSidePanel ? 'w-1/2 overflow-hidden' : 'w-full overflow-hidden'}>
            <WorkbenchContent pipeline={pipeline} breadcrumbData={breadcrumbData} />
          </div>
          {activeSidePanel === 'preview' && <WorkbenchPreviewPanel />}
          {activeSidePanel === 'flow' && <WorkbenchFlowPanel />}
          <WorkbenchFloatingPanel />
        </div>
        <WorkbenchIconSidebar />
      </div>
    </WorkbenchContextProvider.Provider>
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
  getEnvironmentPreviewUrl?: (workerId: string, pipelineId?: string) => string;
  environments?: WorkspaceEnvironmentInterface[];
}) {
  const workspaceId = pipeline?.workspaceId;
  const fetchWorkspace = useWorkspace(workspaceId);

  const fileExplorerEnabled = fetchWorkspace.data?.features?.fileExplorer?.enabled ?? false;

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
      <CodeExplorerProvider pipelineId={pipeline?.id} fileExplorerEnabled={fileExplorerEnabled}>
        <WorkbenchInner pipeline={pipeline} breadcrumbData={breadcrumbData} />
      </CodeExplorerProvider>
    </WorkbenchLayoutProvider>
  );
}
