import { useCallback, useMemo, useState } from 'react';
import type { PipelineDto } from '@loopstack/api-client';
import { SidebarInsetDiv, SidebarProvider, SidebarTrigger } from '../../components/ui/sidebar.tsx';
import { useNamespaceTree } from '../../hooks/useNamespaceTree.ts';
import WorkflowList from './WorkflowList.tsx';
import WorkbenchSidebar from './components/WorkbenchSidebar.tsx';
import { ScrollProvider } from './providers/ScrollProvider.tsx';
import { WorkbenchContextProvider } from './providers/WorkbenchContextProvider.tsx';
import type { WorkbenchState } from './providers/WorkbenchContextProvider.tsx';

export default function Workbench({ pipeline }: { pipeline: PipelineDto }) {
  const namespaceTree = useNamespaceTree(pipeline?.id);

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

  return (
    <WorkbenchContextProvider.Provider value={contextValue}>
      <SidebarProvider defaultOpen={true} className="workbench-sidebar min-h-0">
        <SidebarTrigger className="fixed top-0 right-0 z-40 flex h-8 w-8 items-center justify-center p-8 hover:cursor-pointer md:hidden" />
        <SidebarInsetDiv>
          <div className="flex-1">
            <ScrollProvider>
              <div className="flex h-full flex-col">
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
