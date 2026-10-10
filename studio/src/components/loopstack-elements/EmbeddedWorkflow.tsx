import { useCallback, useRef } from 'react';
import { WorkflowItem } from '@/features/workbench';
import { useWorkflow } from '@/hooks/useWorkflows';

/** Matches what an embedded sub-workflow showed before: its documents, without the debug or history toggles. */
const EMBEDDED_SETTINGS = {
  enableDebugMode: false,
  showFullMessageHistory: false,
};

/**
 * A sub-workflow rendered inside its link card, in the page's own React tree.
 *
 * It deliberately mounts no providers. `WorkbenchLayoutProvider` holds the window's chrome — which panel is
 * open, the preview environment, the file the explorer was asked to reveal — so a nested copy would collect
 * actions that the real panels never see: a widget deep in a sub-workflow calling `openPreviewWithEnvironment`
 * would set state on a provider with no panel attached. Inheriting the page's provider is what makes those
 * actions work from any depth. Nothing reads the workflow off that context, and `workspaceId` is the same
 * throughout a run, so there is nothing a nested provider would have supplied.
 *
 * Mounted only while expanded, so a collapsed card issues no queries at all — and because the whole page
 * shares one QueryClient, siblings showing the same workflow share a single request instead of each
 * repeating it.
 */
export function EmbeddedWorkflow({ workflowId }: { workflowId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fetchWorkflow = useWorkflow(workflowId);

  // Deep-linking to a nested workflow scrolls its card into view; the page owns the scroll container.
  const scrollTo = useCallback(() => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  if (!fetchWorkflow.data) return null;

  return (
    <div ref={containerRef} className="py-2 pl-3">
      <WorkflowItem
        workflow={fetchWorkflow.data}
        workflowId={fetchWorkflow.data.id}
        scrollTo={scrollTo}
        settings={EMBEDDED_SETTINGS}
        embed
      />
    </div>
  );
}

export default EmbeddedWorkflow;
