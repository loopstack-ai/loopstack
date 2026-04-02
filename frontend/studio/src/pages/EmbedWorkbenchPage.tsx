import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { WorkflowState } from '@loopstack/contracts/enums';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import LoadingCentered from '@/components/feedback/LoadingCentered';
import { WorkflowItem } from '@/features/workbench';
import { WorkbenchLayoutProvider } from '@/features/workbench/providers/WorkbenchLayoutProvider';
import { useChildWorkflows, useWorkflow } from '../hooks/useWorkflows.ts';
import { requireParam } from '../lib/requireParam.ts';

const EMBED_MESSAGE_TYPE = 'loopstack:embed:workflow-completed';
const EMBED_RESIZE_MESSAGE_TYPE = 'loopstack:embed:resize';

export default function EmbedWorkbenchPage() {
  const params = useParams<{ workflowId: string }>();
  const workflowId = requireParam(params, 'workflowId');
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchWorkflow = useWorkflow(workflowId);
  const fetchChildWorkflows = useChildWorkflows(workflowId);
  const notifiedRef = useRef(false);

  // Notify parent when all child workflows have completed
  useEffect(() => {
    if (!fetchChildWorkflows.data || notifiedRef.current) return;

    const allCompleted =
      fetchChildWorkflows.data.length > 0 &&
      fetchChildWorkflows.data.every((w) => w.status === WorkflowState.Completed);

    if (allCompleted && window.parent !== window) {
      notifiedRef.current = true;
      window.parent.postMessage(
        {
          type: EMBED_MESSAGE_TYPE,
          workflowId,
        },
        window.location.origin,
      );
    }
  }, [fetchChildWorkflows.data, workflowId]);

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
      <ErrorSnackbar error={fetchChildWorkflows.error} />
      <LoadingCentered loading={fetchWorkflow.isLoading || fetchChildWorkflows.isLoading}>
        {fetchWorkflow.data && fetchChildWorkflows.data ? (
          <WorkbenchLayoutProvider workflow={fetchWorkflow.data}>
            {fetchChildWorkflows.data.map((childWorkflow) => (
              <WorkflowItem
                key={childWorkflow.id}
                workflow={fetchWorkflow.data}
                workflowId={childWorkflow.id}
                scrollTo={scrollTo}
                settings={settings}
                embed
              />
            ))}
          </WorkbenchLayoutProvider>
        ) : null}
      </LoadingCentered>
    </div>
  );
}
