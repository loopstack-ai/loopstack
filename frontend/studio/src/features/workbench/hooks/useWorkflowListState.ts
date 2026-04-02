import { useEffect, useState } from 'react';
import type { WorkflowItemInterface } from '@loopstack/contracts/api';
import { useWorkbenchLayout } from '../providers/WorkbenchLayoutProvider.tsx';
import { useScrollToBottom } from './useAutoScrollBottom.ts';
import { useIntersectionObserver } from './useIntersectionObserver.ts';
import { useScrollToListItem } from './useScrollToListItem.ts';

export function useWorkflowListState(workflows: WorkflowItemInterface[] | undefined) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const { activeId, observe } = useIntersectionObserver('0px 0px 0px 0px');
  const { listRef, scrollTo } = useScrollToListItem();
  const { canScrollDown, scrollToBottom } = useScrollToBottom();

  const { activeSectionId, setActiveSectionId } = useWorkbenchLayout();

  // Sync active section with intersection observer
  useEffect(() => {
    if (activeSectionId !== activeId) {
      setActiveSectionId(activeId);

      // Expand the active section
      if (activeId) {
        setExpandedSections((prev) => ({ ...prev, [activeId]: true }));
      }
    }
  }, [activeId, activeSectionId, setActiveSectionId]);

  // Initialize expanded sections when data loads
  useEffect(() => {
    if (workflows && workflows.length > 0) {
      const lastWorkflowIndex = workflows.length - 1;
      const lastWorkflow = workflows[lastWorkflowIndex];
      const lastSectionId = `section-${lastWorkflow.id}`;

      setExpandedSections({
        [lastSectionId]: true,
        ...(activeId && activeId !== lastSectionId ? { [activeId]: true } : {}),
      });
    }
  }, [workflows, activeId]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  return {
    activeId,
    expandedSections,
    observe,
    listRef,
    scrollTo,
    canScrollDown,
    scrollToBottom,
    toggleSection,
  };
}
