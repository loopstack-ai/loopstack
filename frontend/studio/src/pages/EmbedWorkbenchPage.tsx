import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { WorkflowState } from '@loopstack/contracts/enums';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import LoadingCentered from '@/components/feedback/LoadingCentered';
import { WorkflowItem } from '@/features/workbench';
import { WorkbenchLayoutProvider } from '@/features/workbench/providers/WorkbenchLayoutProvider';
import { useWorkflow } from '../hooks/useWorkflows.ts';
import { requireParam } from '../lib/requireParam.ts';

const EMBED_MESSAGE_TYPE = 'loopstack:embed:workflow-completed';
const EMBED_RESIZE_MESSAGE_TYPE = 'loopstack:embed:resize';

export default function EmbedWorkbenchPage() {
  const params = useParams<{ workflowId: string }>();
  const workflowId = requireParam(params, 'workflowId');
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchWorkflow = useWorkflow(workflowId);
  const notifiedRef = useRef(false);

  // Notify parent when workflow has completed
  useEffect(() => {
    if (!fetchWorkflow.data || notifiedRef.current) return;

    if (fetchWorkflow.data.status === WorkflowState.Completed && window.parent !== window) {
      notifiedRef.current = true;
      window.parent.postMessage(
        {
          type: EMBED_MESSAGE_TYPE,
          workflowId,
        },
        window.location.origin,
      );
    }
  }, [fetchWorkflow.data, workflowId]);

  // Report content height to parent for dynamic iframe sizing
  useEffect(() => {
    if (window.parent === window || !containerRef.current) return;

    const postHeight = () => {
      if (!containerRef.current) return;
      const height = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight,
      );
      window.parent.postMessage(
        {
          type: EMBED_RESIZE_MESSAGE_TYPE,
          workflowId,
          height,
        },
        window.location.origin,
      );
    };

    const observer = new ResizeObserver(postHeight);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [workflowId]);

  const scrollTo = () => {};

  const settings = {
    enableDebugMode: false,
    showFullMessageHistory: false,
  };

  return (
    <div ref={containerRef} className="overflow-hidden pl-3 py-4">
      <ErrorSnackbar error={fetchWorkflow.error} />
      <LoadingCentered loading={fetchWorkflow.isLoading}>
        {fetchWorkflow.data ? (
          <WorkbenchLayoutProvider workspaceId={fetchWorkflow.data.workspaceId} workflow={fetchWorkflow.data}>
            <WorkflowItem
              workflow={fetchWorkflow.data}
              workflowId={fetchWorkflow.data.id}
              scrollTo={scrollTo}
              settings={settings}
              embed
            />
          </WorkbenchLayoutProvider>
        ) : null}
      </LoadingCentered>
    </div>
  );
}
