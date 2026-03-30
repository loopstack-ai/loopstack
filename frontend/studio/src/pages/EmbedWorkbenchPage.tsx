import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { WorkflowState } from '@loopstack/contracts/enums';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import LoadingCentered from '@/components/feedback/LoadingCentered';
import { WorkflowItem } from '@/features/workbench';
import { WorkbenchLayoutProvider } from '@/features/workbench/providers/WorkbenchLayoutProvider';
import { usePipeline } from '../hooks/usePipelines.ts';
import { useFetchWorkflowsByPipeline } from '../hooks/useWorkflows.ts';
import { requireParam } from '../lib/requireParam.ts';

const EMBED_MESSAGE_TYPE = 'loopstack:embed:workflow-completed';
const EMBED_RESIZE_MESSAGE_TYPE = 'loopstack:embed:resize';

export default function EmbedWorkbenchPage() {
  const params = useParams<{ pipelineId: string }>();
  const pipelineId = requireParam(params, 'pipelineId');
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchPipeline = usePipeline(pipelineId);
  const fetchWorkflows = useFetchWorkflowsByPipeline(pipelineId);
  const notifiedRef = useRef(false);

  // Notify parent when all workflows have completed
  useEffect(() => {
    if (!fetchWorkflows.data || notifiedRef.current) return;

    const allCompleted =
      fetchWorkflows.data.length > 0 && fetchWorkflows.data.every((w) => w.status === WorkflowState.Completed);

    if (allCompleted && window.parent !== window) {
      notifiedRef.current = true;
      window.parent.postMessage(
        {
          type: EMBED_MESSAGE_TYPE,
          pipelineId,
        },
        window.location.origin,
      );
    }
  }, [fetchWorkflows.data, pipelineId]);

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
          pipelineId,
          height,
        },
        window.location.origin,
      );
    };

    const observer = new ResizeObserver(postHeight);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [pipelineId]);

  const scrollTo = () => {};

  const settings = {
    enableDebugMode: false,
    showFullMessageHistory: false,
  };

  return (
    <div ref={containerRef} className="overflow-hidden pl-3 py-4">
      <ErrorSnackbar error={fetchPipeline.error} />
      <ErrorSnackbar error={fetchWorkflows.error} />
      <LoadingCentered loading={fetchPipeline.isLoading || fetchWorkflows.isLoading}>
        {fetchPipeline.data && fetchWorkflows.data ? (
          <WorkbenchLayoutProvider pipeline={fetchPipeline.data}>
            {fetchWorkflows.data.map((workflow) => (
              <WorkflowItem
                key={workflow.id}
                pipeline={fetchPipeline.data}
                workflowId={workflow.id}
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
