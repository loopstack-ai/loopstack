import { useState, useCallback, useMemo } from 'react';
import { useNamespaceTree } from '../../hooks/useNamespaceTree.ts';
import { SidebarProvider, SidebarTrigger, SidebarInsetDiv } from '../../components/ui/sidebar.tsx';
import { WorkbenchContextProvider } from './providers/WorkbenchContextProvider.tsx';
import type { WorkbenchState } from './providers/WorkbenchContextProvider.tsx';
import { ScrollProvider } from './providers/ScrollProvider.tsx';
import WorkflowList from './WorkflowList.tsx';
import WorkbenchSidebar from './components/WorkbenchSidebar.tsx';
import type { PipelineDto } from '@loopstack/api-client';

export default function Workbench({ pipeline }: { pipeline: PipelineDto }) {
  const namespaceTree = useNamespaceTree(pipeline?.id);

  const [workbenchState, setWorkbenchState] = useState<WorkbenchState>({
    activeSectionId: null
  });

  const handleSetActiveSectionId = useCallback((id: string | null) => {
    setWorkbenchState({ activeSectionId: id });
  }, []);

  const contextValue = useMemo(
    () => ({
      state: workbenchState,
      setActiveSectionId: handleSetActiveSectionId
    }),
    [workbenchState, handleSetActiveSectionId]
  );

  return (
    <WorkbenchContextProvider.Provider value={contextValue}>
      <SidebarProvider defaultOpen={true} className="workbench-sidebar">
        <SidebarTrigger className="flex items-center justify-center hover:cursor-pointer h-8 w-8 fixed top-0 right-0 z-40 p-8 md:hidden" />
        <SidebarInsetDiv>
          <div className="flex-1">
            <ScrollProvider>
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-hidden">
                  <WorkflowList pipeline={pipeline} />
                </div>
              </div>
            </ScrollProvider>
          </div>
        </SidebarInsetDiv>
        <WorkbenchSidebar namespaceTree={namespaceTree} pipeline={pipeline} />
      </SidebarProvider>
    </WorkbenchContextProvider.Provider>
  );
}
