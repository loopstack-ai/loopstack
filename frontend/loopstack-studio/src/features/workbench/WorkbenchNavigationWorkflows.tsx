import React, { useContext } from 'react';
import { useParams } from 'react-router-dom';
import WorkbenchNavigationWorkflowItem from './WorkbenchNavigationWorkflowItem.tsx';
import type { WorkflowItemDto } from '@loopstack/api-client';
import type { NamespaceTree } from '../../hooks/useNamespaceTree.ts';
import { useFetchWorkflowsByNamespace } from '../../hooks/useWorkflows.ts';
import { SidebarMenuSubItem } from '../../components/ui/sidebar';
import { Skeleton } from '../../components/ui/skeleton';
import { WorkbenchContext } from './WorkbenchContext.tsx';
import { useScroll } from './ScrollProvider.tsx';
import { useStudio } from '../../providers/StudioProvider.tsx';

interface WorkbenchNavigationWorkflowsProps {
  namespace: NamespaceTree;
}

const WorkbenchNavigationWorkflows: React.FC<WorkbenchNavigationWorkflowsProps> = ({
  namespace
}) => {
  const { router } = useStudio();

  const { pipelineId, clickId } = useParams<{
    pipelineId: string;
    workerId: string;
    clickId: string;
  }>();

  const workbenchContext = useContext(WorkbenchContext);

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
          <WorkbenchNavigationWorkflowItem
            workflow={item}
            isSelected={workbenchContext?.state.activeSectionId?.endsWith(item.id) ?? false}
            navigateTo={handleNavigateTo}
          />
        </SidebarMenuSubItem>
      ))}
    </>
  );
};

export default WorkbenchNavigationWorkflows;
