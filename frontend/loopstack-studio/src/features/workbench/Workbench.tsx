import { useParams } from 'react-router-dom';
import { usePipeline } from '../../hooks/usePipelines.ts';
import { useState, useCallback, useMemo } from 'react';
import { useNamespaceTree } from '../../hooks/useNamespaceTree.ts';
import { SidebarProvider, SidebarTrigger, SidebarInsetDiv } from '../../components/ui/sidebar.tsx';
import { Home } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspaces.ts';
import MainLayout from '../../components/layout/MainLayout.tsx';
import { WorkbenchContext } from './WorkbenchContext.tsx';
import type { WorkbenchState } from './WorkbenchContext.tsx';
import { ScrollProvider } from './ScrollProvider.tsx';
import WorkbenchMainContainer from './WorkbenchMainContainer.tsx';
import WorkbenchSidebar from './WorkbenchSidebar.tsx';
import { useStudio } from '../../providers/StudioProvider.tsx';

export default function Workbench() {
  const { router } = useStudio();

  const { pipelineId } = useParams<{ pipelineId: string }>();
  const fetchPipeline = usePipeline(pipelineId);
  const namespaceTree = useNamespaceTree(pipelineId);

  const workspaceId = fetchPipeline.data?.workspaceId;
  const fetchWorkspace = useWorkspace(workspaceId);

  const breadcrumbData = [
    { label: 'Dashboard', href: router.getDashboard(), icon: <Home className="h-4 w-4" /> },
    { label: 'Workspaces', href: router.getWorkspaces() },
    {
      label: fetchWorkspace.data?.title ?? '',
      href: workspaceId ? router.getWorkspace(workspaceId) : undefined
    },
    {
      label: `Run #${fetchPipeline.data?.run} ${
        fetchPipeline.data?.title ? `(${fetchPipeline.data?.title}})` : ''
      }`
    }
  ];

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
    <MainLayout breadcrumbsData={breadcrumbData}>
      <WorkbenchContext.Provider value={contextValue}>
        <SidebarProvider defaultOpen={true} className="workbench-sidebar">
          <SidebarTrigger className="flex items-center justify-center hover:cursor-pointer h-8 w-8 fixed top-0 right-0 z-40 p-8 md:hidden" />
          <SidebarInsetDiv>
            <div className="flex-1">
              <ScrollProvider>
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-hidden">
                    {fetchPipeline.data ? (
                      <WorkbenchMainContainer pipeline={fetchPipeline.data} />
                    ) : (
                      ''
                    )}
                  </div>
                </div>
              </ScrollProvider>
            </div>
          </SidebarInsetDiv>
          <WorkbenchSidebar namespaceTree={namespaceTree} pipeline={fetchPipeline.data} />
        </SidebarProvider>
      </WorkbenchContext.Provider>
    </MainLayout>
  );
}
