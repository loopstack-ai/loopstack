import { useCallback, useMemo, useState } from 'react';
import type { PipelineDto } from '@loopstack/api-client';
import { FileContentViewer } from '@/features/code-explorer/components/FileContentViewer';
import { FileTabsBar } from '@/features/code-explorer/components/FileTabsBar';
import { CodeExplorerProvider, useCodeExplorerContext } from '@/features/code-explorer/providers/CodeExplorerProvider';
import { useWorkspace } from '@/hooks/useWorkspaces.ts';
import { SidebarInsetDiv, SidebarProvider, SidebarTrigger } from '../../components/ui/sidebar.tsx';
import { useNamespaceTree } from '../../hooks/useNamespaceTree.ts';
import WorkflowList from './WorkflowList.tsx';
import WorkbenchSidebar from './components/WorkbenchSidebar.tsx';
import { ScrollProvider } from './providers/ScrollProvider.tsx';
import { WorkbenchContextProvider } from './providers/WorkbenchContextProvider.tsx';
import type { WorkbenchState } from './providers/WorkbenchContextProvider.tsx';

function WorkbenchContent({ pipeline }: { pipeline: PipelineDto }) {
  const { openFiles, selectedFile, fileContent, workflowConfig, isContentLoading } = useCodeExplorerContext();

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 gap-4 overflow-hidden md:flex-row flex-col">
        <div className="flex-1 overflow-hidden">
          <ScrollProvider>
            <div className="flex h-full flex-col">
              <div className="flex-1 overflow-hidden">
                <WorkflowList pipeline={pipeline} />
              </div>
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

export default function Workbench({ pipeline }: { pipeline: PipelineDto }) {
  const namespaceTree = useNamespaceTree(pipeline?.id);
  const workspaceId = pipeline?.workspaceId;
  const fetchWorkspace = useWorkspace(workspaceId);

  const [workbenchState, setWorkbenchState] = useState<WorkbenchState>({
    activeSectionId: null,
  });

  const handleSetActiveSectionId = useCallback((id: string | null) => {
    setWorkbenchState({ activeSectionId: id });
  }, []);

  const contextValue = useMemo(
    () => ({
      state: workbenchState,
      setActiveSectionId: handleSetActiveSectionId,
    }),
    [workbenchState, handleSetActiveSectionId],
  );

  const fileExplorerEnabled = fetchWorkspace.data?.features?.fileExplorer?.enabled ?? false;

  return (
    <WorkbenchContextProvider.Provider value={contextValue}>
      <CodeExplorerProvider pipelineId={pipeline?.id} fileExplorerEnabled={fileExplorerEnabled}>
        <SidebarProvider defaultOpen={true} className="workbench-sidebar min-h-0">
          <SidebarTrigger className="fixed top-0 right-0 z-40 flex h-8 w-8 items-center justify-center p-8 hover:cursor-pointer md:hidden" />
          <SidebarInsetDiv>
            <div className="flex-1">
              <WorkbenchContent pipeline={pipeline} />
            </div>
          </SidebarInsetDiv>
          <WorkbenchSidebar
            namespaceTree={namespaceTree}
            pipeline={pipeline}
            workspaceConfig={
              fetchWorkspace.data
                ? {
                    volumes: fetchWorkspace.data.volumes,
                    features: fetchWorkspace.data.features,
                  }
                : undefined
            }
          />
        </SidebarProvider>
      </CodeExplorerProvider>
    </WorkbenchContextProvider.Provider>
  );
}
