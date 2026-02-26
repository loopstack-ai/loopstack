import { ArrowDownIcon, ChevronDownIcon, ChevronRightIcon, LayersIcon } from 'lucide-react';
import React, { useContext, useEffect, useState } from 'react';
import type { PipelineDto } from '@loopstack/api-client';
import { Button } from '@/components/ui/button.tsx';
import WorkflowItem from '@/features/workbench/WorkflowItem.tsx';
import { useScrollToBottom } from '@/features/workbench/hooks/useAutoScrollBottom.ts';
import { useIntersectionObserver } from '@/features/workbench/hooks/useIntersectionObserver.ts';
import { useScrollToListItem } from '@/features/workbench/hooks/useScrollToListItem.ts';
import { WorkbenchContextProvider } from '@/features/workbench/providers/WorkbenchContextProvider.tsx';
import { useFetchWorkflowsByPipeline } from '@/hooks/useWorkflows.ts';
import { cn } from '@/lib/utils.ts';
import LoadingCentered from '../../components/LoadingCentered.tsx';
import ErrorSnackbar from '../../components/snackbars/ErrorSnackbar.tsx';
import WorkbenchSettingsModal from './components/WorkbenchSettingsModal.tsx';

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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const [settings, setSettings] = useState<WorkbenchSettingsInterface>({
    enableDebugMode: false,
    showFullMessageHistory: false,
  });

  const { activeId, observe } = useIntersectionObserver('0px 0px 0px 0px');
  const { listRef, scrollTo } = useScrollToListItem();
  const { canScrollDown, scrollToBottom } = useScrollToBottom();

  const workbenchContext = useContext(WorkbenchContextProvider);

  useEffect(() => {
    if (
      workbenchContext &&
      workbenchContext.setActiveSectionId &&
      workbenchContext.state.activeSectionId !== activeId
    ) {
      workbenchContext.setActiveSectionId(activeId);

      // Expand the active section
      if (activeId) {
        setExpandedSections((prev) => ({ ...prev, [activeId]: true }));
      }
    }
  }, [activeId, workbenchContext]);

  // Initialize expanded sections when data loads
  useEffect(() => {
    if (fetchWorkflows.data && fetchWorkflows.data.length > 0) {
      const lastWorkflowIndex = fetchWorkflows.data.length - 1;
      const lastWorkflow = fetchWorkflows.data[lastWorkflowIndex];
      const lastSectionId = `section-${lastWorkflow.index}-${lastWorkflow.id}`;

      // Set last workflow to be expanded by default
      setExpandedSections({
        [lastSectionId]: true,
        // If activeId exists and isn't the last section, also expand it
        ...(activeId && activeId !== lastSectionId ? { [activeId]: true } : {}),
      });
    }
  }, [fetchWorkflows.data, activeId]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  return (
    <div>
      {canScrollDown && (
        <Button
          variant="outline"
          size="icon"
          onClick={scrollToBottom}
          className="bg-background/80 fixed right-[calc(var(--sidebar-width)+1.5rem)] bottom-6 z-50 rounded-full shadow-md backdrop-blur-sm"
        >
          <ArrowDownIcon className="size-4" />
        </Button>
      )}
      <LoadingCentered loading={fetchWorkflows.isLoading} />
      <ErrorSnackbar error={fetchWorkflows.error} />

      {fetchWorkflows.data ? (
        <div className="mb-10" ref={listRef}>
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
                  <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 backdrop-blur">
                    <div
                      className="mb-4 flex items-center gap-2 py-2 px-3 cursor-pointer border-b border-border bg-muted/50 rounded-t-sm"
                      onClick={() => toggleSection(sectionId)}
                    >
                      {expandedSections[sectionId] ? (
                        <ChevronDownIcon
                          className={cn('size-4', isActive ? 'text-primary' : 'text-muted-foreground')}
                        />
                      ) : (
                        <ChevronRightIcon
                          className={cn('size-4', isActive ? 'text-primary' : 'text-muted-foreground')}
                        />
                      )}
                      <LayersIcon className={cn('size-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
                      <span
                        className={cn(
                          'text-base font-medium transition-colors flex-1',
                          isActive ? 'text-primary' : 'text-muted-foreground text-gray-400',
                        )}
                      >
                        {item.title ?? item.blockName}
                      </span>
                      {isActive && (
                        <WorkbenchSettingsModal
                          settings={settings}
                          onSettingsChange={setSettings}
                          open={openSettingsModal}
                          onOpenChange={setOpenSettingsModal}
                        />
                      )}
                    </div>
                  </div>
                  {expandedSections[sectionId] && (
                    <div className="max-w-4xl pl-9">
                      <WorkflowItem pipeline={pipeline} workflowId={item.id} scrollTo={scrollTo} settings={settings} />
                    </div>
                  )}
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
