import React, { useContext, useEffect } from 'react';
import WorkbenchMainWorkflowItem from './WorkbenchMainWorkflowItem';
import { Separator } from '../../../components/ui/separator';
import type { PipelineDto, WorkflowItemDto } from '@loopstack/api-client';
import { WorkbenchContext } from '../WorkbenchContext.tsx';
import PipelineButtons from './Workflow/PipelineButtons.tsx';
import type { WorkbenchSettingsInterface } from '../WorkbenchMainContainer.tsx';
import { cn } from '../../../utils/utils.ts';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver.ts';
import { useScrollToListItem } from '../hooks/useScrollToListItem.ts';

interface WorkbenchMainWorkflowListProps {
  workflows: WorkflowItemDto[];
  pipeline: PipelineDto;
  settings: WorkbenchSettingsInterface;
}

const WorkbenchMainWorkflowList: React.FC<WorkbenchMainWorkflowListProps> = ({
  workflows,
  pipeline,
  settings
}) => {
  const { activeId, observe } = useIntersectionObserver('0px 0px 0px 0px');
  const { listRef, scrollTo } = useScrollToListItem();

  const workbenchContext = useContext(WorkbenchContext);

  useEffect(() => {
    if (
      workbenchContext &&
      workbenchContext.setActiveSectionId &&
      workbenchContext.state.activeSectionId !== activeId
    ) {
      workbenchContext.setActiveSectionId(activeId);
    }
  }, [activeId, workbenchContext]);

  return (
    <div className="mx-auto pb-10" ref={listRef}>
      <div className="space-y-0">
        {workflows.map((item) => {
          const sectionId = `section-${item.index}-${item.id}`;
          const isActive = activeId === sectionId;

          return (
            <div
              ref={(el: any) => observe(el as HTMLElement)}
              key={item.id}
              data-id={sectionId}
              className="space-y-0"
            >
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center py-2 mb-8">
                  <Separator className="flex-1" />
                  <span
                    className={cn(
                      'px-3 text-xs font-medium transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {item.title ?? item.configKey}
                  </span>
                  <Separator className="flex-1" />
                </div>
              </div>
              <WorkbenchMainWorkflowItem
                pipeline={pipeline}
                workflowId={item.id}
                scrollTo={scrollTo}
                settings={settings}
              />
            </div>
          );
        })}
      </div>
      <Separator className="my-6" />
      <PipelineButtons pipeline={pipeline} />
    </div>
  );
};

export default WorkbenchMainWorkflowList;
