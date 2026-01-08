import React, { useContext } from 'react';
import { useParams } from 'react-router-dom';
import type { WorkflowItemDto } from '@loopstack/api-client';
import { SidebarMenuSubItem } from '../../components/ui/sidebar.tsx';
import { Skeleton } from '../../components/ui/skeleton.tsx';
import type { NamespaceTree } from '../../hooks/useNamespaceTree.ts';
import { useFetchWorkflowsByNamespace } from '../../hooks/useWorkflows.ts';
import { useStudio } from '../../providers/StudioProvider.tsx';
import NavigationItem from './components/NavigationItem.tsx';
import { useScroll } from './providers/ScrollProvider.tsx';
import { WorkbenchContextProvider } from './providers/WorkbenchContextProvider.tsx';

interface WorkbenchNavigationWorkflowsProps {
  namespace: NamespaceTree;
}

const NavigationItems: React.FC<WorkbenchNavigationWorkflowsProps> = ({ namespace }) => {
  const { router } = useStudio();

  const { pipelineId, clickId } = useParams<{
    pipelineId: string;
    workerId: string;
    clickId: string;
  }>();

  const workbenchContext = useContext(WorkbenchContextProvider);

  const fetchWorkflows = useFetchWorkflowsByNamespace(namespace.id);

  const { setScrollTo } = useScroll();

  const handleNavigateTo = (workflowId: string) => {
    setScrollTo(true);
    if (pipelineId) {
      router.navigateToWorkflow(pipelineId, workflowId, clickId);
    }
  };

  if (fetchWorkflows.isPending) {
    return (
      <>
        <SidebarMenuSubItem>
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 flex-1" />
          </div>
        </SidebarMenuSubItem>
        <SidebarMenuSubItem>
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 flex-1" />
          </div>
        </SidebarMenuSubItem>
        <SidebarMenuSubItem>
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 flex-1" />
          </div>
        </SidebarMenuSubItem>
      </>
    );
  }

  if (!pipelineId || !fetchWorkflows.data?.length) {
    return null;
  }

  return (
    <>
      {fetchWorkflows.data.map((item: WorkflowItemDto) => (
        <SidebarMenuSubItem key={`wf-${item.id}`}>
          <NavigationItem
            workflow={item}
            isSelected={workbenchContext?.state.activeSectionId?.endsWith(item.id) ?? false}
            navigateTo={handleNavigateTo}
          />
        </SidebarMenuSubItem>
      ))}
    </>
  );
};

export default NavigationItems;
