import { useCallback, useEffect, useRef } from 'react';
import { WorkflowState } from '@loopstack/contracts/enums';

const EMBED_COMPLETED_MESSAGE_TYPE = 'loopstack:embed:workflow-completed';
const EMBED_RESIZE_MESSAGE_TYPE = 'loopstack:embed:resize';
const EMBED_NEW_RUN_MESSAGE_TYPE = 'loopstack:embed:new-run';

function isEmbedded(): boolean {
  return typeof window !== 'undefined' && window.parent !== window;
}

function postToParent(message: Record<string, unknown>) {
  if (!isEmbedded()) return;
  window.parent.postMessage(message, window.location.origin);
}

interface UseEmbedBridgeOptions {
  workflowId?: string;
  workflowStatus?: WorkflowState;
}

export function useEmbedBridge({ workflowId, workflowStatus }: UseEmbedBridgeOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const completedNotifiedRef = useRef(false);

  useEffect(() => {
    if (!workflowId || workflowStatus !== WorkflowState.Completed || completedNotifiedRef.current) return;
    completedNotifiedRef.current = true;
    postToParent({ type: EMBED_COMPLETED_MESSAGE_TYPE, workflowId });
  }, [workflowId, workflowStatus]);

  useEffect(() => {
    if (!isEmbedded() || !containerRef.current) return;

    const postHeight = () => {
      const height = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight,
      );
      postToParent({ type: EMBED_RESIZE_MESSAGE_TYPE, workflowId, height });
    };

    const observer = new ResizeObserver(postHeight);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [workflowId]);

  const notifyNewRun = useCallback((newWorkflowId: string) => {
    postToParent({ type: EMBED_NEW_RUN_MESSAGE_TYPE, workflowId: newWorkflowId });
  }, []);

  return { containerRef, notifyNewRun };
}
