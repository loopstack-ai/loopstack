import ErrorSnackbar from '../../components/snackbars/ErrorSnackbar.tsx';
import LoadingCentered from '../../components/LoadingCentered.tsx';
import { useFetchWorkflowsByPipeline } from '@/hooks/useWorkflows.ts';
import type { PipelineDto } from '@loopstack/api-client';
import React, { useContext, useEffect, useState } from 'react';
import WorkbenchSettingsModal from './components/WorkbenchSettingsModal.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { cn } from '@/lib/utils.ts';
import WorkflowItem from '@/features/workbench/WorkflowItem.tsx';
import { useIntersectionObserver } from '@/features/workbench/hooks/useIntersectionObserver.ts';
import { useScrollToListItem } from '@/features/workbench/hooks/useScrollToListItem.ts';
import { WorkbenchContextProvider } from '@/features/workbench/providers/WorkbenchContextProvider.tsx';

export interface WorkbenchSettingsInterface {
  enableDebugMode: boolean;
  showFullMessageHistory: boolean;
}

interface WorkbenchMainContainerProps {
  pipeline: PipelineDto;
}

const WorkflowList: React.FC<WorkbenchMainContainerProps> = ({ pipeline }) => {
  const fetchWorkflows = useFetchWorkflowsByPipeline(pipeline.id);

  const [openSettingsModal, setOpenSettingsModal] = useState(false);

  const [settings, setSettings] = useState<WorkbenchSettingsInterface>({
    enableDebugMode: false,
    showFullMessageHistory: false
  });

  const { activeId, observe } = useIntersectionObserver('0px 0px 0px 0px');
  const { listRef, scrollTo } = useScrollToListItem();

  const workbenchContext = useContext(WorkbenchContextProvider);

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
    <div className="container mx-auto px-4">
      <LoadingCentered loading={fetchWorkflows.isLoading} />
      <ErrorSnackbar error={fetchWorkflows.error} />

      <div className="flex justify-end px-3 mb-4">
        <WorkbenchSettingsModal
          settings={settings}
          onSettingsChange={setSettings}
          open={openSettingsModal}
          onOpenChange={setOpenSettingsModal}
        />
      </div>

      {fetchWorkflows.data ? (
          <div className="mx-auto mb-10" ref={listRef}>
            <div>
              {fetchWorkflows.data.map((item) => {
                const sectionId = `section-${item.index}-${item.id}`;
                const isActive = activeId === sectionId;

                return (
                  <div
                    ref={(el: any) => observe(el as HTMLElement)}
                    key={item.id}
                    data-id={sectionId}
                    className="space-y-0"
                  >
                    <div
                      className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                      <div className="flex items-center py-2 mb-8">
                        <Separator className="flex-1" />
                          <span
                            className={cn(
                              'px-3 text-xs font-medium transition-colors',
                              isActive ? 'text-primary' : 'text-muted-foreground'
                            )}
                          >
                            {item.title ?? item.blockName}
                          </span>
                        <Separator className="flex-1" />
                      </div>
                    </div>
                    <div className="max-w-4xl mx-auto px-3">
                      <WorkflowItem
                        pipeline={pipeline}
                        workflowId={item.id}
                        scrollTo={scrollTo}
                        settings={settings}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {/*<Separator className="my-6" />*/}
            {/*<PipelineButtons pipeline={pipeline} />*/}
          </div>
        ) : null}
    </div>
  );
};

export default WorkflowList;
