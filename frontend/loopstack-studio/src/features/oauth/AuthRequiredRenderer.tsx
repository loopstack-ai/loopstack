import { Loader2Icon, LockKeyholeIcon, ShieldCheckIcon } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PipelineDto, WorkflowDto } from '@loopstack/api-client';
import type {
  DocumentItemInterface,
  TransitionPayloadInterface,
  UiWidgetType,
  WorkflowTransitionType,
} from '@loopstack/contracts/types';
import { useCreatePipeline } from '@/hooks/usePipelines.ts';
import { useRunPipeline } from '@/hooks/useProcessor.ts';
import { cn } from '@/lib/utils';

const EMBED_COMPLETED_MESSAGE_TYPE = 'loopstack:embed:workflow-completed';
const EMBED_RESIZE_MESSAGE_TYPE = 'loopstack:embed:resize';

interface AuthRequiredContent {
  provider: string;
  message: string;
  workflowName: string;
  workspaceId: string;
  scopes?: string[];
}

interface AuthRequiredRendererProps {
  pipeline: PipelineDto;
  workflow: WorkflowDto;
  document: DocumentItemInterface;
  isActive: boolean;
}

const AuthRequiredRenderer: React.FC<AuthRequiredRendererProps> = ({ pipeline, workflow, document, isActive }) => {
  const content = document.content as AuthRequiredContent;
  const actions: UiWidgetType[] = document.ui?.actions ?? [];
  const retryTransitionId = actions.find((a) => a.transition)?.transition;

  const runPipeline = useRunPipeline();
  const createPipeline = useCreatePipeline();
  const pingPipeline = useRunPipeline();

  const [status, setStatus] = useState<'idle' | 'starting' | 'running' | 'completed'>('idle');
  const [embedPipelineId, setEmbedPipelineId] = useState<string | null>(null);
  const [iframeOpen, setIframeOpen] = useState(false);
  const [iframeHeight, setIframeHeight] = useState(0);
  const [authDone, setAuthDone] = useState(false);
  const retryTriggeredRef = useRef(false);
  const authPipelineIdRef = useRef<string | null>(null);

  const availableTransitions = workflow.availableTransitions?.map((t) => (t as WorkflowTransitionType).id) ?? [];

  // Trigger retry whenever authDone flips to true AND the retry transition is available
  useEffect(() => {
    if (!authDone || retryTriggeredRef.current) return;
    if (!retryTransitionId || !availableTransitions.includes(retryTransitionId)) return;

    retryTriggeredRef.current = true;
    runPipeline.mutate({
      pipelineId: pipeline.id,
      runPipelinePayloadDto: {
        transition: {
          id: retryTransitionId,
          workflowId: workflow.id,
          payload: { pipelineId: authPipelineIdRef.current },
        } as TransitionPayloadInterface,
      },
    });
  }, [authDone, retryTransitionId, availableTransitions, runPipeline, pipeline.id, workflow.id]);

  const launchAuthWorkflow = useCallback(() => {
    setStatus('starting');

    createPipeline.mutate(
      {
        pipelineCreateDto: {
          blockName: content.workflowName,
          title: null,
          workspaceId: content.workspaceId,
          args: content.scopes?.length ? { scopes: content.scopes } : undefined,
        },
      },
      {
        onSuccess: (createdPipeline) => {
          pingPipeline.mutate(
            {
              pipelineId: createdPipeline.data.id,
              runPipelinePayloadDto: {},
              force: true,
            },
            {
              onSuccess: () => {
                authPipelineIdRef.current = createdPipeline.data.id;
                setEmbedPipelineId(createdPipeline.data.id);
                setIframeOpen(true);
                setStatus('running');
              },
            },
          );
        },
      },
    );
  }, [content.workflowName, content.workspaceId, content.scopes, createPipeline, pingPipeline]);

  // Listen for messages from embedded auth workflow — stable deps, no triggerRetry
  useEffect(() => {
    if (!embedPipelineId) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.pipelineId !== embedPipelineId) return;

      if (event.data?.type === EMBED_COMPLETED_MESSAGE_TYPE) {
        setStatus('completed');
        setIframeOpen(false);
        setAuthDone(true);
      } else if (event.data?.type === EMBED_RESIZE_MESSAGE_TYPE) {
        const height = event.data?.height;
        if (typeof height === 'number' && height > 0) {
          setIframeHeight(height);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [embedPipelineId]);

  // Auto-launch on first render when active
  useEffect(() => {
    if (isActive && status === 'idle') {
      launchAuthWorkflow();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const providerLabel = content.provider.charAt(0).toUpperCase() + content.provider.slice(1);

  return (
    <div className="not-prose flex w-full flex-col rounded-md border bg-background">
      {/* Card header — link-style row */}
      <button
        type="button"
        onClick={() => embedPipelineId && setIframeOpen((v) => !v)}
        disabled={!embedPipelineId}
        className={cn(
          'flex w-full items-center gap-3 p-3 transition-colors',
          embedPipelineId && 'cursor-pointer hover:bg-muted/50',
        )}
      >
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-md border',
            status === 'completed'
              ? 'bg-green-50 text-green-600 border-green-200'
              : 'bg-muted/50 text-muted-foreground',
          )}
        >
          {status === 'starting' ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : status === 'completed' ? (
            <ShieldCheckIcon className="size-4" />
          ) : (
            <LockKeyholeIcon className="size-4" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col text-left">
          <span className="truncate text-sm font-medium">
            {status === 'starting'
              ? `Connecting to ${providerLabel}...`
              : status === 'completed'
                ? `${providerLabel} authentication completed`
                : `${providerLabel} authentication required`}
          </span>
          <span className="text-muted-foreground truncate text-xs">{content.message}</span>
        </div>
      </button>

      {/* Embedded auth workflow iframe */}
      {iframeOpen && embedPipelineId && (
        <div className="border-t">
          <iframe
            src={`/embed/pipelines/${embedPipelineId}`}
            className="w-full overflow-hidden border-0"
            style={{ height: `${iframeHeight}px` }}
            scrolling="no"
            title={`${providerLabel} Authentication`}
          />
        </div>
      )}
    </div>
  );
};

export default AuthRequiredRenderer;
