import { ArrowDownIcon, ChevronRightIcon, Play } from 'lucide-react';
import React, { useState } from 'react';
import type { PipelineInterface } from '@loopstack/contracts/api';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import LoadingCentered from '@/components/feedback/LoadingCentered';
import { Button } from '@/components/ui/button.tsx';
import WorkflowItem from '@/features/workbench/WorkflowItem.tsx';
import { useFetchWorkflowsByPipeline } from '@/hooks/useWorkflows.ts';
import { cn } from '@/lib/utils.ts';
import WorkbenchSettingsModal from './components/WorkbenchSettingsModal.tsx';
import WorkflowButtons from './components/buttons/WorkflowButtons.tsx';
import { useWorkflowListState } from './hooks/useWorkflowListState.ts';

export interface WorkbenchSettingsInterface {
  enableDebugMode: boolean;
  showFullMessageHistory: boolean;
}

interface WorkbenchMainContainerProps {
  pipeline: PipelineInterface;
}

const WorkflowList: React.FC<WorkbenchMainContainerProps> = ({ pipeline }) => {
  const fetchWorkflows = useFetchWorkflowsByPipeline(pipeline.id);

  const [openSettingsModal, setOpenSettingsModal] = useState(false);
  const [settings, setSettings] = useState<WorkbenchSettingsInterface>({
    enableDebugMode: false,
    showFullMessageHistory: false,
  });

  const { activeId, expandedSections, observe, listRef, scrollTo, canScrollDown, scrollToBottom, toggleSection } =
    useWorkflowListState(fetchWorkflows.data);

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
              const isSingle = fetchWorkflows.data.length === 1;
              const isExpanded = isSingle || expandedSections[sectionId];

              return (
                <div ref={(el: any) => observe(el as HTMLElement)} key={item.id} data-id={sectionId}>
                  <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 backdrop-blur">
                    <div
                      role="button"
                      tabIndex={isSingle ? undefined : 0}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md p-2 px-3 text-left text-sm font-medium',
                        !isSingle && 'hover:bg-accent hover:text-accent-foreground cursor-pointer',
                        isSingle && 'cursor-default',
                      )}
                      onClick={isSingle ? undefined : () => toggleSection(sectionId)}
                      onKeyDown={
                        isSingle
                          ? undefined
                          : (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleSection(sectionId);
                              }
                            }
                      }
                    >
                      <Play className="text-primary h-3.5 w-3.5 fill-current" />
                      <span className="flex-1 truncate text-sm">{item.title ?? item.blockName}</span>
                      <WorkflowButtons pipeline={pipeline} workflowId={item.id} />
                      {isActive && (
                        <WorkbenchSettingsModal
                          settings={settings}
                          onSettingsChange={setSettings}
                          open={openSettingsModal}
                          onOpenChange={setOpenSettingsModal}
                        />
                      )}
                      {!isSingle && (
                        <ChevronRightIcon
                          className={cn(
                            'text-muted-foreground h-3.5 w-3.5 transition-transform',
                            isExpanded && 'rotate-90',
                          )}
                        />
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="max-w-4xl py-1">
                      <WorkflowItem pipeline={pipeline} workflowId={item.id} scrollTo={scrollTo} settings={settings} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WorkflowList;
